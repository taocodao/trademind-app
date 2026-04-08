import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/ai';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/composio/status
 * Returns social platform connection statuses for the current user.
 *
 * Query params: ?platform=linkedin  (optional — omit to get all)
 * Response: { connections: Record<platform, { status, connectedAt }> }
 */
export async function GET(req: NextRequest) {
    try {
        const user = await getUserFromRequest(req);
        const platform = req.nextUrl.searchParams.get('platform');

        const params: unknown[] = [user.privyDid];
        const platformClause = platform ? `AND platform = $2` : '';
        if (platform) params.push(platform);

        const result = await query(
            `SELECT platform, composio_account_id, status, connected_at
             FROM social_connections
             WHERE user_id = $1 ${platformClause}`,
            params
        );

        const connections: Record<string, { status: string; connectedAt: string | null }> = {};

        for (const row of result.rows) {
            // For active connections, do a live status check against Composio
            if (row.status === 'active' && row.composio_account_id) {
                try {
                    const composioRes = await fetch(
                        `https://backend.composio.dev/api/v3/connected_accounts/${row.composio_account_id}`,
                        { headers: { 'x-api-key': process.env.COMPOSIO_API_KEY ?? '' } }
                    );

                    if (composioRes.ok) {
                        const account = await composioRes.json();
                        const liveStatus = account.status === 'ACTIVE' ? 'active' : 'expired';

                        // Sync back to DB if token has expired
                        if (liveStatus !== row.status) {
                            await query(
                                `UPDATE social_connections SET status = $1, updated_at = NOW()
                                 WHERE user_id = $2 AND platform = $3`,
                                [liveStatus, user.privyDid, row.platform]
                            );
                        }
                        connections[row.platform] = { status: liveStatus, connectedAt: row.connected_at };
                    } else {
                        connections[row.platform] = { status: 'expired', connectedAt: row.connected_at };
                    }
                } catch {
                    // Composio API error — treat as expired, don't block the page
                    connections[row.platform] = { status: 'expired', connectedAt: row.connected_at };
                }
            } else {
                connections[row.platform] = { status: row.status, connectedAt: row.connected_at };
            }
        }

        return NextResponse.json({ connections });
    } catch (error: any) {
        if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        console.error('[composio/status] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
