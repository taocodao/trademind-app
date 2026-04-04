import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

// Helper — extract userId from cookie or Bearer token
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
            } catch { /* malformed token */ }
        }
    }
    return userId || null;
}

export async function GET(req: NextRequest) {
    try {
        const userId = await resolveUserId(req);
        if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const TRIAL_DAYS = parseInt(process.env.FREE_TRIAL_DAYS || '14', 10);
        const TRIAL_TIER = process.env.FREE_TRIAL_TIER || 'both_bundle';

        const result = await pool.query(
            `SELECT subscription_tier, subscription_status, billing_interval,
                    current_period_end, trial_end, stripe_price_id, cancel_at_period_end,
                    cancel_at, email_signal_alerts, email, has_completed_onboarding,
                    global_auto_approve,
                    app_trial_count, app_trial_started_at, app_trial_tier,
                    app_trial_2_started_at
             FROM user_settings WHERE user_id = $1`,
            [userId]
        );

        // ── New user: no row yet — first trial not started ────────────────────
        if (result.rows.length === 0) {
            return NextResponse.json({
                tier: 'observer',
                status: null,
                billingInterval: null,
                currentPeriodEnd: null,
                trialEnd: null,
                priceId: null,
                cancelAtPeriodEnd: false,
                cancelAt: null,
                emailSignalAlerts: false,
                email: null,
                hasCompletedOnboarding: false,
                globalAutoApprove: true,
                appTrialCount: 0,
                appTrialAvailable: true,
                appTrialStatus: 'not_started',
                appTrialEnd: null,
                appTrialTier: TRIAL_TIER,
                trialDaysTotal: TRIAL_DAYS,
            });
        }

        const row = result.rows[0];
        const stripeTier: string = row.subscription_tier || 'observer';
        const stripeStatus: string | null = row.subscription_status || null;

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
