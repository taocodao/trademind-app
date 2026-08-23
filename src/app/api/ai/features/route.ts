import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/ai';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

const FREE_FEATURE_LIMITS: Record<string, number> = {
    observer: 0,
    full_access: 2,
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
        const subsResult = await query(
            `SELECT feature_key, is_free_entitlement, status
             FROM ai_feature_subscriptions
             WHERE user_id = $1 AND status = 'active'`,
            [user.privyDid]
        );
        const activeFeatures = subsResult.rows;
        const freeLimit = FREE_FEATURE_LIMITS[user.tier] ?? 0;
        const freeUsed = activeFeatures.filter((feature: any) => feature.is_free_entitlement).length;

        return NextResponse.json({
            tier: user.tier,
            appTrialStatus: null,
            appTrialEnd: null,
            appTrialTier: null,
            features: ALL_FEATURES.map((feature) => ({
                ...feature,
                isActive: activeFeatures.some((active: any) => active.feature_key === feature.key),
                isFree: activeFeatures.some((active: any) => active.feature_key === feature.key && active.is_free_entitlement),
            })),
            freeRemaining: Math.max(0, freeLimit - freeUsed),
            freeLimit,
            chatIncluded: user.tier !== 'observer',
        });
    } catch (error: any) {
        if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
