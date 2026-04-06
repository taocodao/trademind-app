import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/ai';
import { query } from '@/lib/db';
import { SocialPlatform, COMPOSIO_AUTH_CONFIGS, DIRECT_POST_PLATFORMS } from '@/lib/composio';

export const dynamic = 'force-dynamic';

/**
 * POST /api/composio/connect
 * Initiates an OAuth connection for the given platform via Composio.
 * Returns a redirectUrl the frontend should navigate the user to.
 *
 * Body: { platform: SocialPlatform }
 * Response: { redirectUrl: string }
 */
export async function POST(req: NextRequest) {
    try {
        const user = await getUserFromRequest(req);
        const { platform } = await req.json() as { platform: SocialPlatform };

        if (!DIRECT_POST_PLATFORMS.includes(platform) && platform !== 'snapchat' && platform !== 'reddit' && platform !== 'youtube') {
            return NextResponse.json({ error: `Platform "${platform}" does not support OAuth connection` }, { status: 400 });
        }

        const authConfigId = COMPOSIO_AUTH_CONFIGS[platform];
        if (!authConfigId) {
            return NextResponse.json(
                { error: `Composio auth config not set for ${platform}. Add COMPOSIO_AUTH_CONFIG_${platform.toUpperCase()} to your environment variables.` },
                { status: 500 }
            );
        }

        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://trademind.bot';
        const redirectUrl = `${appUrl}/settings/social-connections?platform=${platform}&status=callback`;

        // Instantiate Composio SDK
        const { Composio } = await import('@composio/core');
        const composio = new Composio({ apiKey: process.env.COMPOSIO_API_KEY ?? '' });

        // Composio userId must be alphanumeric — strip Privy DID prefix (did:privy:xxx → xxx)
        const composioUserId = user.privyDid.replace(/^did:privy:/, '');

        // Call Composio SDK to initiate the OAuth flow
        let oauthRedirectUrl = '';
        try {
            const connectionRequest = await composio.connectedAccounts.initiate(
                composioUserId,
                authConfigId,
                { callbackUrl: redirectUrl }
            );
            oauthRedirectUrl = connectionRequest.redirectUrl || '';
        } catch (err: any) {
            const maskedKey = (process.env.COMPOSIO_API_KEY ?? '').slice(0, 8) + '...';
            console.error('[composio/connect] Composio SDK error:', err.message || err);
            console.error('[composio/connect] DEBUG — authConfigId used:', authConfigId, '| API key prefix:', maskedKey);
            return NextResponse.json({ error: 'Failed to initiate Composio OAuth' }, { status: 502 });
        }

        if (!oauthRedirectUrl) {
            return NextResponse.json({ error: 'Composio did not return a redirect URL' }, { status: 502 });
        }

        // Mark connection as "initiated" in our DB
        await query(
            `INSERT INTO social_connections (user_id, platform, status, updated_at)
             VALUES ($1, $2, 'initiated', NOW())
             ON CONFLICT (user_id, platform) DO UPDATE
             SET status = 'initiated', composio_account_id = NULL, updated_at = NOW()`,
            [user.privyDid, platform]
        );

        return NextResponse.json({ redirectUrl: oauthRedirectUrl });
    } catch (error: any) {
        if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        console.error('[composio/connect] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
