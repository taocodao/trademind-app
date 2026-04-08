import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/ai';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/composio/callback
 * Handles the OAuth callback redirect from Composio after the user completes auth.
 * Composio appends ?connectedAccountId=ca_XXXX&status=success to our redirect URL.
 *
 * This route verifies the connection is ACTIVE and persists it to social_connections.
 */
export async function GET(req: NextRequest) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://trademind.bot';
    const settingsBase = `${appUrl}/settings/social-connections`;

    try {
        const user = await getUserFromRequest(req);
        const params = req.nextUrl.searchParams;
        const platform = params.get('platform');
        const status = params.get('status');
        // Composio SDK uses camelCase 'connectedAccountId'; REST API uses snake_case 'connected_account_id'
        const connectedAccountId = params.get('connectedAccountId') ?? params.get('connected_account_id');

        // Validate required params — connectedAccountId presence is sufficient proof OAuth succeeded.
        // (Composio may send status=success or status=ACTIVE depending on SDK/version)
        if (!connectedAccountId || !platform) {
            console.warn('[composio/callback] Missing params:', { status, connectedAccountId, platform });
            return NextResponse.redirect(`${settingsBase}?error=auth_failed&platform=${platform ?? ''}`);
        }

        // Verify ACTIVE status with Composio API
        const composioRes = await fetch(
            `https://backend.composio.dev/api/v3/connectedAccounts/${connectedAccountId}`,
            { headers: { 'x-api-key': process.env.COMPOSIO_API_KEY ?? '' } }
        );

        if (!composioRes.ok) {
            return NextResponse.redirect(`${settingsBase}?error=composio_verify_failed&platform=${platform}`);
        }

        const account = await composioRes.json();

        if (account.status !== 'ACTIVE') {
            console.warn('[composio/callback] Account not active:', account.status);
            return NextResponse.redirect(`${settingsBase}?error=not_active&platform=${platform}`);
        }

        // Persist the ACTIVE connection
        await query(
            `INSERT INTO social_connections (user_id, platform, composio_account_id, status, connected_at, updated_at)
             VALUES ($1, $2, $3, 'active', NOW(), NOW())
             ON CONFLICT (user_id, platform) DO UPDATE
             SET composio_account_id = $3, status = 'active',
                 connected_at = NOW(), updated_at = NOW()`,
            [user.privyDid, platform, connectedAccountId]
        );

        return NextResponse.redirect(`${settingsBase}?success=true&platform=${platform}`);
    } catch (error: any) {
        console.error('[composio/callback] Error:', error);
        if (error.message === 'Unauthorized') {
            return NextResponse.redirect(`${appUrl}/login?redirect=/settings/social-connections`);
        }
        return NextResponse.redirect(`${settingsBase}?error=server_error`);
    }
}
