/**
 * POST /api/admin/heal-whop-user
 * ================================
 * Emergency admin endpoint to manually reconcile a Whop user's
 * database state when self-healing fails.
 *
 * Requires: x-admin-secret header matching INTERNAL_API_SECRET env var
 * Body: { email: string }
 *
 * Logic:
 *   1. Find ALL whop_trials rows for this email, pick the latest non-expired one
 *   2. If none found, find the best user_settings row with billing_source='whop'
 *   3. Update ALL user_settings rows for this email to the correct Whop state
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET ?email=xxx&secret=yyy              — heal by email
// GET ?secret=yyy&diagnose=true          — show all recent Whop records
// GET ?secret=yyy&fix_user_id=wh_xxx&days=30  — force-fix by Whop user_id
export async function GET(req: NextRequest): Promise<NextResponse> {
    const secret = req.nextUrl.searchParams.get('secret');
    if (!secret || secret !== process.env.INTERNAL_API_SECRET) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Diagnostic mode — show all recent Whop data in DB
    if (req.nextUrl.searchParams.get('diagnose') === 'true') {
        const [events, trials, settings] = await Promise.all([
            query(`SELECT user_id, event_type, created_at,
                          (metadata->>'user_id') AS whop_user_id,
                          (metadata->>'email') AS email
                   FROM whop_events ORDER BY created_at DESC LIMIT 20`),
            query(`SELECT whop_user_id, email, trial_started_at, trial_ends_at FROM whop_trials ORDER BY trial_started_at DESC LIMIT 20`),
            query(`SELECT user_id, email, billing_source, whop_trial_ends_at, whop_trial_days, subscription_tier, subscription_status, updated_at
                   FROM user_settings WHERE billing_source = 'whop' OR user_id LIKE 'wh_%' ORDER BY updated_at DESC LIMIT 20`),
        ]);
        return NextResponse.json({ whopEvents: events.rows, whopTrials: trials.rows, whopSettings: settings.rows });
    }

    // Force-fix by whop_user_id (when email doesn't match)
    const fixUserId = req.nextUrl.searchParams.get('fix_user_id');
    const days = parseInt(req.nextUrl.searchParams.get('days') || '30', 10);
    if (fixUserId) {
        const trialEndsAt = new Date(Date.now() + days * 86400000);
        await query(
            `UPDATE user_settings SET
                billing_source      = 'whop',
                whop_trial_ends_at  = $1,
                whop_trial_days     = $2,
                subscription_tier   = 'full_access',
                subscription_status = 'active',
                app_trial_count     = 0,
                updated_at          = NOW()
             WHERE user_id = $3`,
            [trialEndsAt.toISOString(), days, fixUserId]
        );
        return NextResponse.json({
            fixed: true, user_id: fixUserId, days,
            trialEndsAt: trialEndsAt.toISOString(),
            daysRemaining: days,
        });
    }

    const email = req.nextUrl.searchParams.get('email')?.toLowerCase().trim();
    if (!email) return NextResponse.json({ error: 'email or diagnose=true or fix_user_id required' }, { status: 400 });
    return healUser(email);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
    const secret = req.headers.get('x-admin-secret');
    if (!secret || secret !== process.env.INTERNAL_API_SECRET) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    let body: { email?: string };
    try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
    const email = body.email?.toLowerCase().trim();
    if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 });
    return healUser(email);
}

async function healUser(email: string): Promise<NextResponse> {
    // Step 1: whop_trials
    const trialRows = await query(
        `SELECT trial_ends_at, trial_started_at, whop_user_id
         FROM whop_trials WHERE LOWER(email) = $1
         ORDER BY trial_ends_at DESC LIMIT 5`,
        [email]
    );

    // Step 2: user_settings (all rows for this email)
    const whopSettingRows = await query(
        `SELECT user_id, whop_trial_ends_at, whop_trial_days, billing_source, subscription_tier, subscription_status
         FROM user_settings WHERE LOWER(email) = $1
         ORDER BY updated_at DESC`,
        [email]
    );

    let bestEnd: Date | null = null;
    let bestDays = 30;
    let source = 'none';

    for (const t of trialRows.rows) {
        const end = t.trial_ends_at ? new Date(t.trial_ends_at) : null;
        if (end && (!bestEnd || end.getTime() > bestEnd.getTime())) {
            bestEnd = end;
            const dur = t.trial_started_at
                ? Math.round((end.getTime() - new Date(t.trial_started_at).getTime()) / 86400000)
                : 30;
            bestDays = dur > 45 ? 60 : 30;
            source = `whop_trials (${t.whop_user_id})`;
        }
    }

    for (const r of whopSettingRows.rows) {
        const end = r.whop_trial_ends_at ? new Date(r.whop_trial_ends_at) : null;
        if (end && r.billing_source === 'whop' && (!bestEnd || end.getTime() > bestEnd.getTime())) {
            bestEnd = end;
            bestDays = r.whop_trial_days || 30;
            source = `user_settings (${r.user_id})`;
        }
    }

    if (!bestEnd) {
        return NextResponse.json({
            healed: false,
            reason: 'No Whop trial found for this email',
            trialRows: trialRows.rows,
            settingRows: whopSettingRows.rows.map(r => ({
                user_id: r.user_id, billing_source: r.billing_source,
                whop_trial_ends_at: r.whop_trial_ends_at, tier: r.subscription_tier
            })),
        }, { status: 404 });
    }

    const isActive = bestEnd > new Date();
    const tier   = isActive ? 'full_access' : 'observer';
    const status = isActive ? 'active'      : 'canceled';

    // Step 3: Update ALL rows for this email (no Stripe guard — this is explicit admin action)
    const updateResult = await query(
        `UPDATE user_settings SET
            billing_source       = 'whop',
            whop_trial_ends_at   = $1,
            whop_trial_days      = $2,
            subscription_tier    = $3,
            subscription_status  = $4,
            app_trial_count      = 0,
            app_trial_started_at = NULL,
            updated_at           = NOW()
         WHERE LOWER(email) = $5
           AND (stripe_price_id IS NULL OR subscription_status NOT IN ('active','trialing','past_due'))`,
        [bestEnd.toISOString(), bestDays, tier, status, email]
    );

    console.log(`[Admin Heal] ${email} → ${tier} until ${bestEnd.toISOString()} (${bestDays}d, source: ${source}), rows: ${updateResult.rowCount}`);

    return NextResponse.json({
        healed: true, email, tier, status,
        trialEndsAt: bestEnd.toISOString(),
        trialDays: bestDays,
        daysRemaining: Math.ceil((bestEnd.getTime() - Date.now()) / 86400000),
        source,
        rowsUpdated: updateResult.rowCount,
        allFoundRows: {
            whopTrials:   trialRows.rows.map(r => ({ whop_user_id: r.whop_user_id, trial_ends_at: r.trial_ends_at })),
            userSettings: whopSettingRows.rows.map(r => ({ user_id: r.user_id, billing_source: r.billing_source, whop_trial_ends_at: r.whop_trial_ends_at, tier: r.subscription_tier })),
        },
    });
}
