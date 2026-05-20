import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

// Helper — extract userId AND email from Privy cookie / Bearer token.
// Privy stores linked accounts (including the login email) in the JWT payload
// under the 'privy:linked_accounts' claim. We extract that here so every
// authenticated request can sync the email into user_settings.
interface ResolvedIdentity {
    userId: string;
    email:  string | null;
}

async function resolveIdentity(req: NextRequest): Promise<ResolvedIdentity | null> {
    const cookieStore = await cookies();
    let userId  = cookieStore.get('privy-user-id')?.value ?? '';
    let email: string | null = null;

    const authHeader = req.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        try {
            const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
            if (!userId) userId = payload?.sub || payload?.privy_did || '';

            // Extract email from Privy linked_accounts claim
            // Privy JWT contains 'privy:linked_accounts' → array of { type, address? }
            const linked: Array<{ type: string; address?: string }> =
                payload?.['privy:linked_accounts'] ?? [];
            const emailAccount = linked.find((a) => a.type === 'email' && a.address);
            if (emailAccount?.address) email = emailAccount.address.toLowerCase().trim();
        } catch { /* malformed token */ }
    }

    return userId ? { userId, email } : null;
}

// Legacy helper kept for routes that only need the userId
async function resolveUserId(req: NextRequest): Promise<string | null> {
    const identity = await resolveIdentity(req);
    return identity?.userId ?? null;
}

export async function GET(req: NextRequest) {
    try {
        const identity = await resolveIdentity(req);
        if (!identity) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        const { userId, email: privyEmail } = identity;

        const TRIAL_DAYS = parseInt(process.env.FREE_TRIAL_DAYS || '14', 10);
        const TRIAL_TIER = process.env.FREE_TRIAL_TIER || 'both_bundle';

        const result = await pool.query(
            `SELECT subscription_tier, subscription_status, billing_interval,
                    billing_source, whop_trial_ends_at, whop_trial_days,
                    current_period_end, trial_end, stripe_price_id, cancel_at_period_end,
                    cancel_at, email_signal_alerts, email, has_completed_onboarding,
                    global_auto_approve, preferred_language,
                    turbocore_auto_approve, turbocore_pro_auto_approve, leaps_auto_approve,
                    app_trial_count, app_trial_started_at, app_trial_tier,
                    app_trial_2_started_at
             FROM user_settings WHERE user_id = $1`,
            [userId]
        );

        // ── New user: no row yet ─────────────────────────────────────────────
        // Seed the row with the Privy email immediately, then check inline for
        // a Whop trial so a user who bought before logging in sees their trial
        // on the very first page load — not after a second refresh.
        if (result.rows.length === 0) {
            if (privyEmail) {
                await pool.query(
                    `INSERT INTO user_settings (user_id, email, updated_at)
                     VALUES ($1, $2, NOW())
                     ON CONFLICT (user_id) DO UPDATE SET
                         email      = COALESCE(user_settings.email, EXCLUDED.email),
                         updated_at = NOW()`,
                    [userId, privyEmail]
                ).catch(() => {});

                // Check for existing Whop trial data for this email
                try {
                    // Path 1: whop_trials table
                    const wt = await pool.query(
                        `SELECT trial_ends_at, trial_started_at FROM whop_trials
                         WHERE LOWER(email) = LOWER($1)
                         ORDER BY trial_ends_at DESC LIMIT 1`,
                        [privyEmail]
                    );
                    let whopEnd: Date | null = null;
                    let whopDays = 30;
                    let whopTier = 'full_access';
                    if (wt.rows.length > 0 && wt.rows[0].trial_ends_at) {
                        whopEnd = new Date(wt.rows[0].trial_ends_at);
                        const dur = wt.rows[0].trial_started_at
                            ? Math.round((whopEnd.getTime() - new Date(wt.rows[0].trial_started_at).getTime()) / 86400000)
                            : 30;
                        whopDays = dur > 45 ? 60 : 30;
                    }
                    // Path 2: whop-keyed user_settings row for same email
                    if (!whopEnd) {
                        const ws = await pool.query(
                            `SELECT whop_trial_ends_at, whop_trial_days, subscription_tier
                             FROM user_settings
                             WHERE LOWER(email) = LOWER($1)
                               AND billing_source = 'whop'
                               AND user_id != $2
                               AND whop_trial_ends_at IS NOT NULL
                             ORDER BY whop_trial_ends_at DESC LIMIT 1`,
                            [privyEmail, userId]
                        );
                        if (ws.rows.length > 0 && ws.rows[0].whop_trial_ends_at) {
                            whopEnd  = new Date(ws.rows[0].whop_trial_ends_at);
                            whopDays = ws.rows[0].whop_trial_days || 30;
                            whopTier = ws.rows[0].subscription_tier || 'full_access';
                        }
                    }
                    if (whopEnd && whopEnd > new Date()) {
                        // Write Whop data onto the freshly-created Privy row
                        await pool.query(
                            `UPDATE user_settings SET
                                billing_source      = 'whop',
                                subscription_tier   = $1,
                                subscription_status = 'active',
                                whop_trial_ends_at  = $2,
                                whop_trial_days     = $3,
                                app_trial_count     = 0,
                                updated_at          = NOW()
                             WHERE user_id = $4`,
                            [whopTier, whopEnd.toISOString(), whopDays, userId]
                        ).catch(() => {});
                        return NextResponse.json({
                            tier: whopTier, status: 'active', billingSource: 'whop',
                            billingInterval: null, currentPeriodEnd: null,
                            trialEnd: whopEnd.toISOString(), priceId: null,
                            cancelAtPeriodEnd: false, cancelAt: null,
                            emailSignalAlerts: false, email: privyEmail,
                            hasCompletedOnboarding: false, globalAutoApprove: true,
                            strategyAutoApprove: { TQQQ_TURBOCORE: false, TQQQ_TURBOCORE_PRO: false, QQQ_LEAPS: false },
                            preferredLanguage: 'en',
                            appTrialCount: 0, appTrialAvailable: false,
                            appTrialStatus: 'active', appTrialEnd: whopEnd.toISOString(),
                            appTrialTier: whopTier, trialDaysTotal: whopDays,
                        });
                    }
                } catch { /* non-fatal — fall through to observer */ }
            }
            return NextResponse.json({
                tier: 'observer', status: null, billingInterval: null,
                currentPeriodEnd: null, trialEnd: null, priceId: null,
                cancelAtPeriodEnd: false, cancelAt: null,
                emailSignalAlerts: false, email: privyEmail,
                hasCompletedOnboarding: false, globalAutoApprove: true,
                preferredLanguage: 'en',
                appTrialCount: 0, appTrialAvailable: true,
                appTrialStatus: 'not_started', appTrialEnd: null,
                appTrialTier: TRIAL_TIER, trialDaysTotal: TRIAL_DAYS,
            });
        }

        const row = result.rows[0];

        // ── Sync email from Privy JWT → user_settings if missing ─────────────
        // This is the permanent fix for the Whop/Privy identity mismatch:
        // Privy holds the user's email but the DB row may have been created
        // without it (e.g. via a wallet or social OAuth). We backfill it now
        // on every authenticated request so Whop reconciliation always works.
        if (privyEmail && !row.email) {
            await pool.query(
                `UPDATE user_settings SET email = $1, updated_at = NOW()
                 WHERE user_id = $2 AND email IS NULL`,
                [privyEmail, userId]
            ).catch(() => {}); // non-fatal — don't block the response
            row.email = privyEmail; // reflect in current response too
        }

        const stripeTier: string = row.subscription_tier || 'observer';
        const stripeStatus: string | null = row.subscription_status || null;

        // ── Self-Healing: Dual-path reconciliation ───────────────────────────
        // Problem: Whop webhook writes user_settings keyed by whop_user_id.
        // Tier API reads user_settings keyed by Privy DID. Different rows.
        // Path 1: whop_trials by email (works when email is synced)
        // Path 2: matching Whop user_settings row by email (catches delayed webhooks)
        let healedWhopEnd: Date | null = null;
        let healedWhopDays = 30;
        try {
            if (row.email) {
                // Path 1: whop_trials
                const whopTrialRow = await pool.query(
                    `SELECT trial_ends_at, trial_started_at FROM whop_trials
                     WHERE LOWER(email) = LOWER($1)
                     ORDER BY trial_started_at DESC LIMIT 1`,
                    [row.email]
                );
                if (whopTrialRow.rows.length > 0) {
                    const wt = whopTrialRow.rows[0];
                    const wtEnd = wt.trial_ends_at ? new Date(wt.trial_ends_at) : null;
                    const currEnd = row.whop_trial_ends_at ? new Date(row.whop_trial_ends_at) : null;
                    if (wtEnd && (!currEnd || wtEnd.getTime() > currEnd.getTime() || row.billing_source !== 'whop')) {
                        healedWhopEnd = wtEnd;
                        const dur = wt.trial_started_at
                            ? Math.round((wtEnd.getTime() - new Date(wt.trial_started_at).getTime()) / 86400000)
                            : 30;
                        healedWhopDays = dur > 45 ? 60 : 30;
                    }
                }

                // Path 2: Whop-keyed user_settings row with same email
                if (!healedWhopEnd) {
                    const whopUserRow = await pool.query(
                        `SELECT whop_trial_ends_at, whop_trial_days
                         FROM user_settings
                         WHERE LOWER(email) = LOWER($1)
                           AND billing_source = 'whop'
                           AND user_id != $2
                           AND whop_trial_ends_at IS NOT NULL
                         ORDER BY whop_trial_ends_at DESC LIMIT 1`,
                        [row.email, userId]
                    );
                    if (whopUserRow.rows.length > 0) {
                        const wr = whopUserRow.rows[0];
                        const wrEnd = wr.whop_trial_ends_at ? new Date(wr.whop_trial_ends_at) : null;
                        const currEnd = row.whop_trial_ends_at ? new Date(row.whop_trial_ends_at) : null;
                        if (wrEnd && (!currEnd || wrEnd.getTime() > currEnd.getTime() || row.billing_source !== 'whop')) {
                            healedWhopEnd = wrEnd;
                            healedWhopDays = wr.whop_trial_days || 30;
                        }
                    }
                }
            }

            if (healedWhopEnd) {
                await pool.query(
                    `UPDATE user_settings SET
                        billing_source      = 'whop',
                        whop_trial_ends_at  = $1,
                        whop_trial_days     = $2,
                        subscription_tier   = CASE WHEN $3::timestamptz > NOW() THEN 'full_access' ELSE 'observer' END,
                        subscription_status = CASE WHEN $3::timestamptz > NOW() THEN 'active' ELSE 'canceled' END,
                        app_trial_count     = 0,
                        updated_at          = NOW()
                     WHERE user_id = $4
                       AND (stripe_price_id IS NULL OR subscription_status NOT IN ('active','trialing','past_due'))`,
                    [healedWhopEnd.toISOString(), healedWhopDays, healedWhopEnd.toISOString(), userId]
                );
                console.log(`[Tier API] Self-healed ${userId} via ${row.email}: ends ${healedWhopEnd.toISOString()} (${healedWhopDays}d)`);
            }
        } catch (healErr) {
            console.warn('[Tier API] Self-heal failed (non-fatal):', healErr);
        }

        // ── Whop trial branch: check whop_trial_ends_at BEFORE Stripe fast-path
        // Also picks up the self-healed values computed above.
        const isWhopUser    = row.billing_source === 'whop' || healedWhopEnd !== null;
        const whopEnd       = healedWhopEnd ?? (row.whop_trial_ends_at ? new Date(row.whop_trial_ends_at) : null);
        const whopTrialDays = healedWhopDays || row.whop_trial_days || 30;
        const whopActive    = isWhopUser && whopEnd && whopEnd > new Date();
        const whopExpired   = isWhopUser && whopEnd && whopEnd <= new Date();

        if (whopActive) {
            return NextResponse.json({
                tier:                   stripeTier,
                status:                 'active',
                billingSource:          'whop',
                billingInterval:        null,
                currentPeriodEnd:       null,
                trialEnd:               whopEnd!.toISOString(),
                priceId:                null,
                cancelAtPeriodEnd:      false,
                cancelAt:               null,
                emailSignalAlerts:      row.email_signal_alerts === true,
                email:                  row.email || null,
                hasCompletedOnboarding: row.has_completed_onboarding ?? false,
                globalAutoApprove:      row.global_auto_approve !== false,
                strategyAutoApprove: {
                    TQQQ_TURBOCORE:     row.turbocore_auto_approve ?? false,
                    TQQQ_TURBOCORE_PRO: row.turbocore_pro_auto_approve ?? false,
                    QQQ_LEAPS:          row.leaps_auto_approve ?? false,
                },
                preferredLanguage:      row.preferred_language || 'en',
                appTrialCount:          0,
                appTrialAvailable:      false,   // ← blocks start-trial auto-fire (Bug #4 fix)
                appTrialStatus:         'active',
                appTrialEnd:            whopEnd!.toISOString(),
                appTrialTier:           stripeTier,
                trialDaysTotal:         whopTrialDays,
            });
        }

        if (whopExpired) {
            return NextResponse.json({
                tier:                   'observer',
                status:                 'expired',
                billingSource:          'whop',
                billingInterval:        null,
                currentPeriodEnd:       null,
                trialEnd:               whopEnd!.toISOString(),
                priceId:                null,
                cancelAtPeriodEnd:      false,
                cancelAt:               null,
                emailSignalAlerts:      row.email_signal_alerts === true,
                email:                  row.email || null,
                hasCompletedOnboarding: row.has_completed_onboarding ?? false,
                globalAutoApprove:      row.global_auto_approve !== false,
                strategyAutoApprove: {
                    TQQQ_TURBOCORE:     row.turbocore_auto_approve ?? false,
                    TQQQ_TURBOCORE_PRO: row.turbocore_pro_auto_approve ?? false,
                    QQQ_LEAPS:          row.leaps_auto_approve ?? false,
                },
                preferredLanguage:      row.preferred_language || 'en',
                appTrialCount:          0,
                appTrialAvailable:      false,
                appTrialStatus:         'expired',
                appTrialEnd:            whopEnd!.toISOString(),
                appTrialTier:           'full_access',
                trialDaysTotal:         whopTrialDays,
            });
        }

        // ── Active Stripe subscription always wins over in-app trial ──────────
        if (['active', 'trialing', 'past_due'].includes(stripeStatus ?? '')) {
            return NextResponse.json({
                tier: stripeTier,
                status: stripeStatus,
                billingInterval: row.billing_interval || null,
                currentPeriodEnd: row.current_period_end || null,
                trialEnd: row.trial_end || null,
                priceId: row.stripe_price_id || null,
                cancelAtPeriodEnd: row.cancel_at_period_end || false,
                cancelAt: row.cancel_at || null,
                emailSignalAlerts: row.email_signal_alerts === true,
                email: row.email || null,
                hasCompletedOnboarding: row.has_completed_onboarding ?? false,
                globalAutoApprove: row.global_auto_approve !== false,
                strategyAutoApprove: {
                    TQQQ_TURBOCORE:     row.turbocore_auto_approve ?? false,
                    TQQQ_TURBOCORE_PRO: row.turbocore_pro_auto_approve ?? false,
                    QQQ_LEAPS:          row.leaps_auto_approve ?? false,
                },
                preferredLanguage: row.preferred_language || 'en',
                appTrialCount: row.app_trial_count || 0,
                appTrialAvailable: false,
                appTrialStatus: 'converted',
                appTrialEnd: null,
                appTrialTier: row.app_trial_tier || TRIAL_TIER,
                trialDaysTotal: TRIAL_DAYS,
            });
        }

        // ── No active Stripe sub — compute in-app trial status ────────────────
        const MAX_TRIALS = 2;
        const trialCount: number = row.app_trial_count || 0;
        const trial1Start: Date | null = row.app_trial_started_at ? new Date(row.app_trial_started_at) : null;
        const trial2Start: Date | null = row.app_trial_2_started_at ? new Date(row.app_trial_2_started_at) : null;

        // Most recent trial takes precedence
        const activeTrial = trial2Start ?? trial1Start;
        const now = new Date();

        type TrialStatus = 'not_started' | 'active' | 'expired' | 'converted' | 'second_trial_active';
        let appTrialStatus: TrialStatus = 'not_started';
        let effectiveTier = 'observer';
        let appTrialEnd: string | null = null;
        let appTrialAvailable = trialCount < MAX_TRIALS;

        if (activeTrial) {
            const trialEndDate = new Date(activeTrial.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
            appTrialEnd = trialEndDate.toISOString();

            if (now < trialEndDate) {
                effectiveTier = row.app_trial_tier || TRIAL_TIER;
                appTrialStatus = trial2Start ? 'second_trial_active' : 'active';
                appTrialAvailable = false; // can't start another while one is running
            } else {
                appTrialStatus = 'expired';
                effectiveTier = 'observer';
                appTrialAvailable = trialCount < MAX_TRIALS;
            }
        }

        return NextResponse.json({
            tier: effectiveTier,
            status: appTrialStatus === 'not_started' ? null : appTrialStatus,
            billingInterval: null,
            currentPeriodEnd: null,
            trialEnd: null,
            priceId: null,
            cancelAtPeriodEnd: false,
            cancelAt: null,
            emailSignalAlerts: row.email_signal_alerts === true,
            email: row.email || null,
            hasCompletedOnboarding: row.has_completed_onboarding ?? false,
            globalAutoApprove: row.global_auto_approve !== false,
            strategyAutoApprove: {
                TQQQ_TURBOCORE:     row.turbocore_auto_approve ?? false,
                TQQQ_TURBOCORE_PRO: row.turbocore_pro_auto_approve ?? false,
                QQQ_LEAPS:          row.leaps_auto_approve ?? false,
            },
            preferredLanguage: row.preferred_language || 'en',
            appTrialCount: trialCount,
            appTrialAvailable,
            appTrialStatus,
            appTrialEnd,
            appTrialTier: row.app_trial_tier || TRIAL_TIER,
            trialDaysTotal: TRIAL_DAYS,
        });

    } catch (error) {
        console.error('Error fetching subscription tier:', error);
        return NextResponse.json({ error: 'Failed to find subscription tier' }, { status: 500 });
    }
}
