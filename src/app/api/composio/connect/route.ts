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

        // Call Composio REST API to initiate the OAuth flow
        const composioRes = await fetch('https://backend.composio.dev/api/v3/connectedAccounts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.COMPOSIO_API_KEY ?? '',
            },
            body: JSON.stringify({
                authConfigId,
                userId: user.privyDid,
                redirectUri: redirectUrl,
                data: {},
            }),
        });

        if (!composioRes.ok) {
            const err = await composioRes.json().catch(() => ({}));
            console.error('[composio/connect] Composio API error:', err);
            return NextResponse.json({ error: 'Failed to initiate Composio OAuth' }, { status: 502 });
        }

        const composioData = await composioRes.json();
        const oauthRedirectUrl: string = composioData.redirectUrl ?? composioData.connectionUrl ?? '';

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
