/**
 * GET /api/whop/manual-activate
 * ================================
 * Emergency endpoint to manually activate a Whop trial when the webhook fails.
 * Reads the caller's Privy session (same as all other API routes) and
 * directly writes the 30-day Full Access trial to their user_settings row.
 *
 * Protected by INTERNAL_API_SECRET query param.
 *
 * Usage (while logged into TradeMind in the same browser):
 *   /api/whop/manual-activate?secret=xxx&days=30
 *
 * Or by explicit user_id:
 *   /api/whop/manual-activate?secret=xxx&days=30&user_id=did:privy:xxx
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

async function resolveUserId(req: NextRequest): Promise<string | null> {
    const cookieStore = await cookies();
    let userId = cookieStore.get('privy-user-id')?.value;
    if (!userId) {
        const authHeader = req.headers.get('Authorization');
        if (authHeader?.startsWith('Bearer ')) {
            const token = authHeader.slice(7);
            try {
                const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
                userId = payload?.sub || payload?.privy_did || '';
            } catch { /* malformed */ }
        }
    }
    return userId || null;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
    const secret = req.nextUrl.searchParams.get('secret');
    if (!secret || secret !== process.env.INTERNAL_API_SECRET) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const days = parseInt(req.nextUrl.searchParams.get('days') || '30', 10);
    const overrideUserId = req.nextUrl.searchParams.get('user_id');

    let userId = overrideUserId || await resolveUserId(req);

    if (!userId) {
        // Show recent user_settings so we can identify the right user_id
        const recent = await query(
            `SELECT user_id, email, billing_source, subscription_tier, subscription_status, updated_at
             FROM user_settings ORDER BY updated_at DESC LIMIT 30`
        );
        return NextResponse.json({
            error: 'Could not identify your session. Open this URL while logged into TradeMind, or pass ?user_id=did:privy:xxx',
            hint: 'Find your user_id in the recentUsers list below (look for your row by updated_at)',
            recentUsers: recent.rows,
        }, { status: 400 });
    }

    // Check the row exists
    const current = await query(`SELECT user_id, email, subscription_tier FROM user_settings WHERE user_id = $1`, [userId]);
    if (current.rows.length === 0) {
        return NextResponse.json({
            error: `No user_settings row found for user_id: ${userId}`,
            hint: 'Make sure you are logged into TradeMind first, then call this URL again.',
        }, { status: 404 });
    }

    const trialEndsAt = new Date(Date.now() + days * 86400000);
    const email = current.rows[0].email || 'unknown';

    // Write directly to the user's row
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
        [trialEndsAt.toISOString(), days, userId]
    );

    // Also write to whop_trials for future reconciliation
    await query(
        `INSERT INTO whop_trials (whop_user_id, email, trial_started_at, trial_ends_at)
         VALUES ($1, $2, NOW(), $3)
         ON CONFLICT (whop_user_id) DO UPDATE SET
            trial_ends_at = EXCLUDED.trial_ends_at,
            email         = EXCLUDED.email`,
        [userId, email, trialEndsAt.toISOString()]
    ).catch(() => {});

    console.log(`[Manual Activate] ${userId} (${email}) → full_access for ${days}d until ${trialEndsAt.toISOString()}`);

    return NextResponse.json({
        activated: true,
        userId,
        email,
        tier: 'full_access',
        trialDays: days,
        trialEndsAt: trialEndsAt.toISOString(),
        daysRemaining: days,
        nextStep: 'Hard refresh your dashboard (Ctrl+Shift+R) — your 30-day Full Access trial is now active.',
    });
}
