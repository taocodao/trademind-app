import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/ai';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/composio/callback
 * Handles the OAuth callback redirect from Composio after the user completes auth.
 * Composio appends ?connectedAccountId=ca_XXXX&status=success to our redirect URL.
 *
 * On success: redirects to /oauth-complete?status=success&platform=xxx
 * The oauth-complete page closes the popup and notifies the parent modal via postMessage.
 */
export async function GET(req: NextRequest) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://trademind.bot';
    const oauthCompletePage = `${appUrl}/oauth-complete`;
    // Read platform before try/catch so it's available in the catch block too
    const fallbackPlatform = req.nextUrl.searchParams.get('platform') ?? '';

    try {
        const user = await getUserFromRequest(req);
        const params = req.nextUrl.searchParams;
        const platform = fallbackPlatform;
        const status = params.get('status');
        // Composio SDK uses camelCase 'connectedAccountId'; REST API uses snake_case 'connected_account_id'
        const connectedAccountId = params.get('connectedAccountId') ?? params.get('connected_account_id');

        // Validate required params
        if (!connectedAccountId || !platform) {
            console.warn('[composio/callback] Missing params:', { status, connectedAccountId, platform });
            return NextResponse.redirect(`${oauthCompletePage}?status=auth_failed&platform=${platform}`);
        }

        // Verify ACTIVE status with Composio API
        const composioRes = await fetch(
            `https://backend.composio.dev/api/v3/connectedAccounts/${connectedAccountId}`,
            { headers: { 'x-api-key': process.env.COMPOSIO_API_KEY ?? '' } }
        );

        if (!composioRes.ok) {
            console.warn('[composio/callback] Composio verify failed:', composioRes.status);
            return NextResponse.redirect(`${oauthCompletePage}?status=composio_verify_failed&platform=${platform}`);
        }

        const account = await composioRes.json();
        console.log('[composio/callback] Account status:', account.status, '| id:', connectedAccountId);

        if (account.status !== 'ACTIVE') {
            console.warn('[composio/callback] Account not active:', account.status);
            return NextResponse.redirect(`${oauthCompletePage}?status=not_active&platform=${platform}`);
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

        return NextResponse.redirect(`${oauthCompletePage}?status=success&platform=${platform}`);
    } catch (error: any) {
        console.error('[composio/callback] Error:', error);
        if (error.message === 'Unauthorized') {
            return NextResponse.redirect(`${appUrl}/login?redirect=/settings/social-connections`);
        }
        return NextResponse.redirect(`${oauthCompletePage}?status=server_error&platform=${fallbackPlatform}`);
    }
}
