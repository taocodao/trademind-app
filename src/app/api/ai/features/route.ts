import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/ai';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

const FREE_FEATURE_LIMITS: Record<string, number> = {
    'observer': 0,
    'turbocore': 1,
    'turbocore_pro': 1,
    'both_bundle': 2,
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
