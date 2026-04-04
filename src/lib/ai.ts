import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { query } from '@/lib/db';

const VALID_FEATURES = ['screenshot', 'deepdive', 'briefing', 'strategy', 'debrief', 'chat'];

/**
 * Compute the user's effective tier, accounting for in-app free trials.
 * Priority: Active Stripe subscription > In-app trial (if not expired) > 'observer'
 */
async function resolveEffectiveTier(row: Record<string, any>): Promise<string> {
    const stripeStatus: string | null = row.subscription_status || null;
    if (['active', 'trialing', 'past_due'].includes(stripeStatus ?? '')) {
        return row.subscription_tier || 'observer';
    }

    const TRIAL_DAYS = parseInt(process.env.FREE_TRIAL_DAYS || '14', 10);
    const TRIAL_TIER = process.env.FREE_TRIAL_TIER || 'both_bundle';

    // Most recent trial takes precedence
    const trial2Start: Date | null = row.app_trial_2_started_at ? new Date(row.app_trial_2_started_at) : null;
    const trial1Start: Date | null = row.app_trial_started_at ? new Date(row.app_trial_started_at) : null;
    const activeTrial = trial2Start ?? trial1Start;

    if (activeTrial) {
        const trialEndDate = new Date(activeTrial.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
        if (new Date() < trialEndDate) {
            return row.app_trial_tier || TRIAL_TIER;
        }
    }

    return 'observer';
}

export async function getUserFromRequest(req: NextRequest) {
    const cookieStore = await cookies();
    const privyToken = cookieStore.get('privy-token')?.value;
    if (!privyToken) throw new Error('Unauthorized');

    const payload = privyToken.split('.')[1];
    const decoded = JSON.parse(Buffer.from(payload, 'base64').toString());
    const privyDid = decoded.sub || decoded.privy_did;

    if (!privyDid) throw new Error('Unauthorized');

    const result = await query(
        `SELECT * FROM user_settings WHERE user_id = $1`,
        [privyDid]
    );

    if (!result.rows.length) {
        throw new Error('User settings not found');
    }

    const row = result.rows[0];
    const tier = await resolveEffectiveTier(row);

    return { privyDid, tier };
}

/**
 * Check if a user has access to a specific AI feature.
 * - `chat` is always allowed for non-observer tiers (including trial)
 * - Other features require an active row in ai_feature_subscriptions
 */
export async function checkFeatureAccess(privyDid: string, featureKey: string): Promise<{ allowed: boolean }> {
    if (!VALID_FEATURES.includes(featureKey)) return { allowed: false };

    if (featureKey === 'chat') {
        const userRes = await query(`SELECT * FROM user_settings WHERE user_id = $1`, [privyDid]);
        if (!userRes.rows.length) return { allowed: false };
        const tier = await resolveEffectiveTier(userRes.rows[0]);
        return { allowed: tier !== 'observer' };
    }

    const result = await query(
        `SELECT id FROM ai_feature_subscriptions WHERE user_id = $1 AND feature_key = $2 AND status = 'active'`,
        [privyDid, featureKey]
    );
    return { allowed: result.rows.length > 0 };
}
