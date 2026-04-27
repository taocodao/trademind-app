/**
 * POST /api/whop/link-account
 * ============================
 * Called after a Privy login completes on /whop/welcome.
 * Links the authenticated Privy user (did:privy:xxx) to the
 * pre-provisioned Whop trial record, keyed by matching email.
 *
 * Auth: Privy Bearer token (from usePrivy().getAccessToken())
 * Body: { whopEmail: string }
 *
 * Flow:
 *   1. Verify Privy JWT → extract privyUserId + verified email
 *   2. Look up whop_trials WHERE email matches
 *   3. Merge: upsert user_settings with Privy DID, copy Whop tier
 *   4. Update whop_trials.privy_user_id for future lookups
 *   5. Return { linked, tier, trialEndsAt }
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getPrivyUserId } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse> {
    // ── 1. Authenticate via Privy JWT ────────────────────────────────────────
    const privyUserId = await getPrivyUserId(req);
    if (!privyUserId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: { whopEmail?: string };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const whopEmail = body.whopEmail?.toLowerCase().trim();
    if (!whopEmail) {
        return NextResponse.json({ error: 'whopEmail is required' }, { status: 400 });
    }

    // ── 2. Find Whop trial record by email ────────────────────────────────────
    const trialResult = await query(
        `SELECT whop_user_id, whop_membership_id, whop_plan_id, email, trial_ends_at
         FROM whop_trials
         WHERE LOWER(email) = $1
         ORDER BY trial_started_at DESC LIMIT 1`,
        [whopEmail]
    );

    if (!trialResult.rows.length) {
        // No Whop trial found for this email — they may have used a different email
        return NextResponse.json({
            linked: false,
            reason: 'No Whop trial found for this email. Please use the exact email from your Whop account.',
        }, { status: 404 });
    }

    const trial = trialResult.rows[0];

    // ── 3. Check if trial is still active ────────────────────────────────────
    const trialEndsAt = new Date(trial.trial_ends_at);
    const isActive    = trialEndsAt > new Date();

    // ── 4. Merge: upsert user_settings keyed by Privy DID ────────────────────
    // If user already exists (signed up before finding this page), update their record.
    // If new, create with both_bundle tier from the trial.
    await query(
        `INSERT INTO user_settings (
            user_id, email, subscription_tier, subscription_status,
            billing_source, auth_provider,
            whop_user_id, whop_plan_id,
            app_trial_tier, app_trial_started_at,
            created_at, updated_at
         ) VALUES (
            $1, $2, $3, $4,
            'whop', 'privy',
            $5, $6,
            'both_bundle', NOW(),
            NOW(), NOW()
         )
         ON CONFLICT (user_id) DO UPDATE SET
            email          = COALESCE(user_settings.email, EXCLUDED.email),
            whop_user_id   = EXCLUDED.whop_user_id,
            whop_plan_id   = COALESCE(user_settings.whop_plan_id, EXCLUDED.whop_plan_id),
            billing_source = CASE
                WHEN user_settings.billing_source = 'stripe' THEN 'stripe'
                ELSE 'whop'
            END,
            subscription_tier = CASE
                WHEN user_settings.subscription_tier NOT IN ('observer', 'turbocore') THEN user_settings.subscription_tier
                ELSE $3
            END,
            updated_at = NOW()`,
        [
            privyUserId,
            trial.email,
            isActive ? 'both_bundle' : 'observer',
            isActive ? 'active' : 'canceled',
            trial.whop_user_id,
            trial.whop_plan_id,
        ]
    );

    // ── 5. Log the link in trial_conversions for tracking ────────────────────
    await query(
        `INSERT INTO trial_conversions (user_id, trial_source, trial_started_at)
         VALUES ($1, 'whop', NOW())
         ON CONFLICT (user_id) DO NOTHING`,
        [privyUserId]
    );

    console.log(`[Whop Link] Privy ${privyUserId} ↔ Whop ${trial.whop_user_id} (${trial.email})`);

    return NextResponse.json({
        linked:      true,
        tier:        isActive ? 'both_bundle' : 'observer',
        trialEndsAt: trial.trial_ends_at,
        email:       trial.email,
    });
}
