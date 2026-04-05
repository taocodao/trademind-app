import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/ai';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/composio/disconnect
 * Disconnects a social platform by deleting the Composio account and clearing our DB.
 *
 * Body: { platform: string }
 * Response: { success: true }
 */
export async function DELETE(req: NextRequest) {
    try {
        const user = await getUserFromRequest(req);
        const { platform } = await req.json() as { platform: string };

        // Get the composio_account_id from DB
        const connResult = await query(
            `SELECT composio_account_id FROM social_connections
             WHERE user_id = $1 AND platform = $2`,
            [user.privyDid, platform]
        );

        const composioAccountId: string | null = connResult.rows[0]?.composio_account_id ?? null;

        // Delete from Composio — best effort (don't fail if Composio errors)
        if (composioAccountId) {
            try {
                await fetch(
                    `https://backend.composio.dev/api/v3/connectedAccounts/${composioAccountId}`,
                    {
                        method: 'DELETE',
                        headers: { 'x-api-key': process.env.COMPOSIO_API_KEY ?? '' },
                    }
                );
            } catch (err) {
                console.warn('[composio/disconnect] Composio delete failed (non-fatal):', err);
            }
        }

        // Always clean up our DB record
        await query(
            `UPDATE social_connections
             SET status = 'disconnected', composio_account_id = NULL,
                 connected_at = NULL, updated_at = NOW()
             WHERE user_id = $1 AND platform = $2`,
            [user.privyDid, platform]
        );

        return NextResponse.json({ success: true });
    } catch (error: any) {
        if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        console.error('[composio/disconnect] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
