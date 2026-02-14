import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';

async function getUserId(): Promise<string | null> {
    const cookieStore = await cookies();
    const privyToken = cookieStore.get('privy-token');
    if (!privyToken) return null;
    const tokenParts = privyToken.value.split('.');
    if (tokenParts.length >= 2) {
        try {
            const payload = JSON.parse(atob(tokenParts[1]));
            return payload.sub || payload.userId || null;
        } catch { }
    }
    return null;
}

export async function GET(request: NextRequest) {
    try {
        const userId = await getUserId();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const limit = parseInt(request.nextUrl.searchParams.get('limit') || '5', 10);

        // Fetch user executions, joined with signals to simulate enriched data
        // Currently DB signals table might not be fully populated with symbol if we rely on WS...
        // But let's check positions table too, as positions store execution details.

        const result = await query(
            `SELECT 
                use.id, 
                use.signal_id, 
                use.status, 
                use.order_id, 
                use.created_at,
                p.symbol,
                p.strategy
             FROM user_signal_executions use
             LEFT JOIN positions p ON use.order_id = p.id
             WHERE use.user_id = $1
             ORDER BY use.created_at DESC
             LIMIT $2`,
            [userId, limit]
        );

        // Add 'source' based on logic (if we add source column later, we can use it directly)
        // For now assume manual if not tagged.
        // We'll add 'source' column to user_signal_executions in future migration, 
        // currently relying on context or just showing generic execution.

        // Enrich activity if possible
        const activities = result.rows.map(row => ({
            ...row,
            source: 'manual', // Default for now until DB migration
            symbol: row.symbol || 'UNKNOWN', // Fallback
        }));

        return NextResponse.json({ activities });
    } catch (error) {
        console.error('Activity fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 });
    }
}
