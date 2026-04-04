import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/ai';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

const FREE_FEATURE_LIMITS: Record<string, number> = {
    'observer': 0,
    'turbocore': 1,
    'turbocore_pro': 1,
    'both_bundle': 2,
    'app_trial': 2,
};

const ALL_FEATURES = [
    { key: 'screenshot', name: 'Screenshot Analyzer', price: 5 },
    { key: 'deepdive', name: 'Stock Deep Dive', price: 5 },
    { key: 'briefing', name: 'Morning Briefing', price: 5 },
    { key: 'strategy', name: 'Strategy Builder', price: 5 },
    { key: 'debrief', name: 'Weekly Debrief', price: 5 },
];

export async function GET(req: NextRequest) {
    try {
        const user = await getUserFromRequest(req);

        // Fetch deep user profile for trial status
        const settingsResult = await query(
            `SELECT app_trial_started_at, app_trial_2_started_at, app_trial_tier FROM user_settings WHERE user_id = $1`,
            [user.privyDid]
        );
        const row = settingsResult.rows[0];
        
        let appTrialStatus = null;
        let appTrialEnd = null;
        let appTrialTier = 'both_bundle';
        const TRIAL_DAYS = parseInt(process.env.FREE_TRIAL_DAYS || '14', 10);

        if (row) {
            const trial2Start = row.app_trial_2_started_at ? new Date(row.app_trial_2_started_at) : null;
            const trial1Start = row.app_trial_started_at ? new Date(row.app_trial_started_at) : null;
            const activeTrial = trial2Start ?? trial1Start;
            
            if (activeTrial) {
                const trialEndDate = new Date(activeTrial.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
                if (new Date() < trialEndDate) {
                    appTrialStatus = trial2Start ? 'second_trial_active' : 'active';
                    appTrialEnd = trialEndDate.toISOString();
                    appTrialTier = row.app_trial_tier || 'both_bundle';
                }
            }
        }

        // Get user's active feature subscriptions
        const subsResult = await query(
            `SELECT feature_key, is_free_entitlement, status
             FROM ai_feature_subscriptions
             WHERE user_id = $1 AND status = 'active'`,
            [user.privyDid]
        );

        const activeFeatures = subsResult.rows;
        const freeLimit = FREE_FEATURE_LIMITS[user.tier] ?? 0;
        const freeUsed = activeFeatures.filter((f: any) => f.is_free_entitlement).length;
        const freeRemaining = Math.max(0, freeLimit - freeUsed);

        return NextResponse.json({
            tier: user.tier,
            appTrialStatus,
            appTrialEnd,
            appTrialTier,
            features: ALL_FEATURES.map(f => ({
                ...f,
                isActive: activeFeatures.some((a: any) => a.feature_key === f.key),
                isFree: activeFeatures.some((a: any) => a.feature_key === f.key && a.is_free_entitlement),
            })),
            freeRemaining,
            freeLimit,
            chatIncluded: user.tier !== 'observer',
        });
    } catch (error: any) {
        if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
