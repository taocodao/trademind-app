import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';

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
            } catch { }
        }
    }
    return userId || null;
}

/**
 * POST /api/settings/start-trial
 *
 * Starts or validates a user's in-app free trial.
 * Business rules:
 *  - Each unique user may have up to 2 trial periods (env MAX_TRIALS, default 2)
 *  - Trial 1 is auto-started on first dashboard load (body: { isSecondTrial: false })
 *  - Trial 2 must be explicitly requested (body: { isSecondTrial: true }) — used for
 *    win-back campaigns or returning inactive users
 *  - If user already has an active Stripe subscription → reject (no trial needed)
 *  - All state is written to user_settings so it can be audited
 */
export async function POST(req: NextRequest) {
    try {
        const userId = await resolveUserId(req);
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json().catch(() => ({}));
        const isSecondTrial: boolean = body.isSecondTrial === true;

        const TRIAL_DAYS = parseInt(process.env.FREE_TRIAL_DAYS || '14', 10);
        const TRIAL_TIER = process.env.FREE_TRIAL_TIER || 'both_bundle';
        const MAX_TRIALS = 2;

        // Fetch current state
        const res = await pool.query(
            `SELECT subscription_tier, subscription_status,
                    app_trial_count, app_trial_started_at, app_trial_tier, app_trial_2_started_at
             FROM user_settings WHERE user_id = $1`,
            [userId]
        );

        const TRIAL_FEATURES_LIMIT: Record<string, number> = {
            observer: 0, turbocore: 1, turbocore_pro: 1, both_bundle: 2,
        };

        // ── 1. User has active paid Stripe subscription → no trial needed ─────
        if (res.rows.length > 0) {
            const row = res.rows[0];
            const stripeStatus = row.subscription_status;
            if (['active', 'trialing', 'past_due'].includes(stripeStatus ?? '')) {
                return NextResponse.json({ error: 'Already subscribed — no trial needed.', code: 'ALREADY_SUBSCRIBED' }, { status: 409 });
            }

            const trialCount: number = row.app_trial_count || 0;
            const trial1Start: Date | null = row.app_trial_started_at ? new Date(row.app_trial_started_at) : null;

            // ── 2. First trial already active ────────────────────────────────
            if (!isSecondTrial && trial1Start) {
                const trialEndDate = new Date(trial1Start.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
                if (new Date() < trialEndDate) {
                    // Trial still running — idempotent success
                    return NextResponse.json({
                        success: true,
                        alreadyActive: true,
                        trialNumber: 1,
                        trialEnd: trialEndDate.toISOString(),
                        tier: row.app_trial_tier || TRIAL_TIER,
                        trialDaysTotal: TRIAL_DAYS,
                    });
                }
            }

            // ── 3. Exceeded trial limit ──────────────────────────────────────
            if (trialCount >= MAX_TRIALS) {
                return NextResponse.json({
                    error: 'Trial limit reached. Please subscribe to continue.',
                    code: 'TRIAL_LIMIT_REACHED',
                }, { status: 403 });
            }

            // ── 4. Grant second trial (must be explicitly requested) ─────────
            if (isSecondTrial) {
                if (trialCount < 1) {
                    return NextResponse.json({ error: 'First trial must be used before a second trial can be granted.', code: 'FIRST_TRIAL_NOT_USED' }, { status: 400 });
                }
                const now = new Date();
                const trialEndDate = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
                const freeLimit = TRIAL_FEATURES_LIMIT[TRIAL_TIER] ?? 0;
                await pool.query(
                    `UPDATE user_settings
                     SET app_trial_count      = app_trial_count + 1,
                         app_trial_2_started_at = $1,
                         app_trial_tier       = $2,
                         free_features_limit  = $3,
                         updated_at           = NOW()
                     WHERE user_id = $4`,
                    [now.toISOString(), TRIAL_TIER, freeLimit, userId]
                );
                return NextResponse.json({
                    success: true,
                    trialNumber: 2,
                    trialEnd: trialEndDate.toISOString(),
                    tier: TRIAL_TIER,
                    trialDaysTotal: TRIAL_DAYS,
                });
            }
        }

        // ── 5. Grant first trial (new user OR existing observer with no trial) ─
        const now = new Date();
        const trialEndDate = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
        const freeLimit = TRIAL_FEATURES_LIMIT[TRIAL_TIER] ?? 0;

        await pool.query(
            `INSERT INTO user_settings (
                user_id, app_trial_count, app_trial_started_at,
                app_trial_tier, free_features_limit, has_had_trial, updated_at
             ) VALUES ($1, 1, $2, $3, $4, true, NOW())
             ON CONFLICT (user_id) DO UPDATE
             SET app_trial_count      = 1,
                 app_trial_started_at = $2,
                 app_trial_tier       = $3,
                 free_features_limit  = $4,
                 has_had_trial        = true,
                 updated_at           = NOW()`,
            [userId, now.toISOString(), TRIAL_TIER, freeLimit]
        );

        console.log(`🎉 Trial started for user ${userId} → ${TRIAL_TIER} for ${TRIAL_DAYS} days`);

        return NextResponse.json({
            success: true,
            trialNumber: 1,
            trialEnd: trialEndDate.toISOString(),
            tier: TRIAL_TIER,
            trialDaysTotal: TRIAL_DAYS,
        });

    } catch (error: any) {
        console.error('start-trial error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
