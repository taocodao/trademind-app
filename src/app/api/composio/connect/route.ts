import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/ai';
import { query } from '@/lib/db';
import { SocialPlatform, COMPOSIO_AUTH_CONFIGS, DIRECT_POST_PLATFORMS } from '@/lib/composio';

export const dynamic = 'force-dynamic';

const COMPOSIO_API_BASE = 'https://backend.composio.dev/api/v3';

/**
 * POST /api/composio/connect
 * Initiates an OAuth connection for the given platform via Composio.
 * Returns a redirectUrl the frontend should navigate the user to.
 *
 * Uses the Composio REST API directly (no SDK) to avoid ESM/CJS bundling
 * issues that caused 502 crashes on Vercel with @composio/core v0.6.x.
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

        const authConfigId = COMPOSIO_AUTH_CONFIGS[platform]?.trim();
        if (!authConfigId) {
            return NextResponse.json(
                { error: `Composio auth config not set for ${platform}. Add COMPOSIO_AUTH_CONFIG_${platform.toUpperCase()} to your environment variables.` },
                { status: 500 }
            );
        }

        const apiKey = process.env.COMPOSIO_API_KEY ?? '';
        if (!apiKey) {
            console.error('[composio/connect] COMPOSIO_API_KEY is not set');
            return NextResponse.json({ error: 'Composio API key not configured' }, { status: 500 });
        }

        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://trademind.bot';
        const callbackUrl = `${appUrl}/api/composio/callback?platform=${platform}`;

        // Composio userId — strip Privy DID prefix (did:privy:xxx → xxx) for alphanumeric safety
        const composioUserId = user.privyDid.replace(/^did:privy:/, '');

        // ── Call Composio REST API directly ───────────────────────────────────
        // SDK (@composio/core v0.6.x) has ESM/CJS incompatibilities on Vercel.
        // Direct REST call is reliable, version-agnostic, and has no bundling issues.
        const composioRes = await fetch(`${COMPOSIO_API_BASE}/connected_accounts`, {
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                auth_config: { id: authConfigId },
                connection: {
                    user_id: composioUserId,
                    callback_url: callbackUrl,
                },
            }),
        });

        const responseText = await composioRes.text();
        console.log(`[composio/connect] REST API response (${composioRes.status}):`, responseText.slice(0, 500));

        if (!composioRes.ok) {
            console.error('[composio/connect] Composio REST error:', composioRes.status, responseText);
            return NextResponse.json(
                { error: `Composio API error ${composioRes.status}: ${responseText}` },
                { status: 502 }
            );
        }

        let data: any;
        try {
            data = JSON.parse(responseText);
        } catch {
            console.error('[composio/connect] Failed to parse Composio response as JSON:', responseText);
            return NextResponse.json({ error: 'Composio returned non-JSON response' }, { status: 502 });
        }

        // Composio may return redirectUrl in camelCase or snake_case depending on API version
        const oauthRedirectUrl: string =
            data.redirectUrl ||
            data.redirect_url ||
            data.connectionRequest?.redirectUrl ||
            data.connectionRequest?.redirect_url ||
            '';

        console.log('[composio/connect] oauthRedirectUrl:', oauthRedirectUrl ? oauthRedirectUrl.slice(0, 80) + '...' : '(none)');

        if (!oauthRedirectUrl) {
            console.error('[composio/connect] No redirectUrl in response:', JSON.stringify(data).slice(0, 500));
            return NextResponse.json({ error: 'Composio did not return a redirect URL', debug: data }, { status: 502 });
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
        console.error('[composio/connect] Unexpected error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
