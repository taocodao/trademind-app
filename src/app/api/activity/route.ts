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

        const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20', 10);

        // Only fetch recent entries (last 30 days), skip old/failed UNKNOWN entries
        const result = await query(
            `SELECT 
                use.id, 
                use.signal_id, 
                use.status, 
                use.order_id, 
                use.created_at,
                use.approved_at,
                use.executed_at,
                use.error_message,
                s.symbol,
                s.strategy
             FROM user_signal_executions use
             LEFT JOIN signals s ON use.signal_id = s.id
             WHERE use.user_id = $1
               AND use.created_at >= NOW() - INTERVAL '30 days'
             ORDER BY use.created_at DESC
             LIMIT $2`,
            [userId, limit]
        );

        const activities = result.rows.map(row => ({
            ...row,
            source: 'trademind',
            symbol: row.symbol || null,
            strategy: row.strategy || null,
        }));

        return NextResponse.json({ activities });
    } catch (error) {
        console.error('Activity fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 });
    }
}

// DELETE: Clear old failed/unknown activity entries for the current user
export async function DELETE(request: NextRequest) {
    try {
        const userId = await getUserId();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = request.nextUrl;
        const mode = searchParams.get('mode') || 'failed'; // 'failed' | 'all'

        let deleteQuery: string;
        let params: any[];

        if (mode === 'all') {
            deleteQuery = `DELETE FROM user_signal_executions WHERE user_id = $1`;
            params = [userId];
        } else {
            // Delete failed + entries older than 30 days
            deleteQuery = `DELETE FROM user_signal_executions 
                           WHERE user_id = $1 
                           AND (status = 'failed' OR created_at < NOW() - INTERVAL '30 days')`;
            params = [userId];
        }

        const result = await query(deleteQuery, params);
        return NextResponse.json({ deleted: result.rowCount });
    } catch (error) {
        console.error('Activity delete error:', error);
        return NextResponse.json({ error: 'Failed to delete activity' }, { status: 500 });
    }
}
