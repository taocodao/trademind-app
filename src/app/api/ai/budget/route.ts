import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/ai';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    // Redirect to /api/ai/features for backwards compatibility
    const user = await getUserFromRequest(req);
    const subsResult = await query(
        `SELECT feature_key FROM ai_feature_subscriptions WHERE user_id = $1 AND status = 'active'`,
        [user.privyDid]
    );
    return NextResponse.json({
        tier: user.tier,
        activeFeatures: subsResult.rows.map((r: any) => r.feature_key),
        chatIncluded: user.tier !== 'observer',
    });
}
