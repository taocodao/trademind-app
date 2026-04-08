import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/composio/callback
 * Handles the OAuth callback redirect from Composio after the user completes auth.
 *
 * IMPORTANT: This route does NOT require user authentication.
 * The OAuth redirect chain (LinkedIn → Composio → callback) does not reliably
 * carry Privy auth cookies through the popup. Instead, we identify the user
 * from the Composio connected account's user_id field, which was set during initiation.
 *
 * Composio appends ?connectedAccountId=ca_XXXX to our callbackUrl.
 * On success → redirects to /oauth-complete?status=success&platform=xxx
 */
export async function GET(req: NextRequest) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://trademind.bot';
    const oauthCompletePage = `${appUrl}/oauth-complete`;
    const fallbackPlatform = req.nextUrl.searchParams.get('platform') ?? '';

    try {
        const params = req.nextUrl.searchParams;
        const platform = fallbackPlatform;
        const status = params.get('status');
        // Composio SDK uses camelCase; REST API uses snake_case
        const connectedAccountId = params.get('connectedAccountId') ?? params.get('connected_account_id');

        console.log('[composio/callback] Received:', { platform, status, connectedAccountId });

        if (!connectedAccountId || !platform) {
            console.warn('[composio/callback] Missing params:', { status, connectedAccountId, platform });
            return NextResponse.redirect(`${oauthCompletePage}?status=auth_failed&platform=${platform}`);
        }

        // Verify the account with Composio and get the user_id from it
        const composioRes = await fetch(
            `https://backend.composio.dev/api/v3/connected_accounts/${connectedAccountId}`,
            { headers: { 'x-api-key': process.env.COMPOSIO_API_KEY ?? '' } }
        );

        if (!composioRes.ok) {
            const errText = await composioRes.text();
            console.warn('[composio/callback] Composio verify failed:', composioRes.status, errText);
            return NextResponse.redirect(`${oauthCompletePage}?status=composio_verify_failed&platform=${platform}`);
        }

        const account = await composioRes.json();
        console.log('[composio/callback] Account:', JSON.stringify({
            status: account.status,
            userId: account.userId ?? account.user_id,
        }));

        if (account.status !== 'ACTIVE') {
            console.warn('[composio/callback] Account not active:', account.status);
            return NextResponse.redirect(`${oauthCompletePage}?status=not_active&platform=${platform}`);
        }

        // Recover the user from Composio's stored user_id.
        // We stored the Privy DID suffix (stripped "did:privy:" prefix) as the Composio userId.
        const composioUserId: string = account.userId ?? account.user_id ?? '';
        if (!composioUserId) {
            console.error('[composio/callback] No user_id in Composio account:', JSON.stringify(account).slice(0, 300));
            return NextResponse.redirect(`${oauthCompletePage}?status=no_user_id&platform=${platform}`);
        }

        // Reconstruct full Privy DID
        const privyDid = composioUserId.startsWith('did:privy:')
            ? composioUserId
            : `did:privy:${composioUserId}`;

        // Persist the ACTIVE connection
        await query(
            `INSERT INTO social_connections (user_id, platform, composio_account_id, status, connected_at, updated_at)
             VALUES ($1, $2, $3, 'active', NOW(), NOW())
             ON CONFLICT (user_id, platform) DO UPDATE
             SET composio_account_id = $3, status = 'active',
                 connected_at = NOW(), updated_at = NOW()`,
            [privyDid, platform, connectedAccountId]
        );

        console.log('[composio/callback] ✓ Saved connection for', privyDid, 'platform:', platform);
        return NextResponse.redirect(`${oauthCompletePage}?status=success&platform=${platform}`);
    } catch (error: any) {
        console.error('[composio/callback] Unexpected error:', error);
        return NextResponse.redirect(`${oauthCompletePage}?status=server_error&platform=${fallbackPlatform}`);
    }
}
