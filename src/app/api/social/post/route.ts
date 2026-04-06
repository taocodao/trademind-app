import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/ai';
import { query } from '@/lib/db';
import { SocialPlatform, PLATFORM_TOOL_SLUGS, DIRECT_POST_PLATFORMS, buildToolParams } from '@/lib/composio';

export const dynamic = 'force-dynamic';

/**
 * POST /api/social/post
 * Executes a direct social media post via the Composio SDK (tools.execute).
 *
 * Body: { platform, postContent, promoCode, referralLink, metadata? }
 * metadata: platform-specific extras (subreddit, reddit_title, page_id, ig_user_id)
 * Response: { success: true, message }
 */
export async function POST(req: NextRequest) {
    try {
        const user = await getUserFromRequest(req);

        const { platform, postContent, promoCode, referralLink, metadata } = await req.json() as {
            platform: SocialPlatform;
            postContent: string;
            promoCode: string;
            referralLink: string;
            metadata?: Record<string, string>;
        };

        // Only Group A platforms support direct posting
        if (!DIRECT_POST_PLATFORMS.includes(platform)) {
            return NextResponse.json(
                { error: `${platform} direct posting is not supported — use the copy feature instead.` },
                { status: 400 }
            );
        }

        const toolSlug = PLATFORM_TOOL_SLUGS[platform];
        if (!toolSlug) {
            return NextResponse.json({ error: `No Composio action configured for ${platform}` }, { status: 400 });
        }

        // ── Verify OAuth connection ────────────────────────────────────────────
        const connResult = await query(
            `SELECT composio_account_id, status, metadata FROM social_connections
             WHERE user_id = $1 AND platform = $2`,
            [user.privyDid, platform]
        );
        const connection = connResult.rows[0];

        if (!connection || connection.status !== 'active' || !connection.composio_account_id) {
            return NextResponse.json(
                {
                    error: `Your ${platform} account is not connected. Connect it in the share panel.`,
                    needsConnection: true,
                    platform,
                },
                { status: 402 }
            );
        }

        // Merge stored metadata (page_id, ig_user_id, etc.) with request metadata
        const storedMeta: Record<string, string> = connection.metadata ?? {};
        const effectiveMeta = { ...storedMeta, ...(metadata ?? {}) };

        // ── Execute via Composio SDK ───────────────────────────────────────────
        const toolParams = buildToolParams(platform, postContent, effectiveMeta);

        console.info(`[social/post] Executing ${toolSlug} for ${platform} via connected account ${connection.composio_account_id}`);

        const { Composio } = await import('@composio/core');
        const composio = new Composio({ apiKey: process.env.COMPOSIO_API_KEY ?? '' });

        let executeResult: any;
        try {
            // Use composio.tools.execute — confirmed as current SDK API (April 2026)
            executeResult = await (composio as any).tools.execute(toolSlug, {
                arguments: toolParams,
                connectedAccountId: connection.composio_account_id,
            });
        } catch (err: any) {
            console.error('[social/post] Composio tools.execute error:', err?.message ?? err);

            // Token expired → mark as expired so UI prompts reconnect
            if (err?.status === 401 || err?.status === 403) {
                await query(
                    `UPDATE social_connections SET status = 'expired', updated_at = NOW()
                     WHERE user_id = $1 AND platform = $2`,
                    [user.privyDid, platform]
                );
                return NextResponse.json(
                    { error: 'Your social connection has expired. Please reconnect your account.', reconnectRequired: true, platform },
                    { status: 401 }
                );
            }

            return NextResponse.json(
                { error: `Failed to post to ${platform}. Please try again.` },
                { status: 502 }
            );
        }

        console.info(`[social/post] Successfully posted to ${platform}:`, executeResult);

        // ── Log successful post ────────────────────────────────────────────────
        await query(
            `INSERT INTO social_posts (user_id, platform, post_content, promo_code, referral_link, posted_via, posted_at)
             VALUES ($1, $2, $3, $4, $5, 'composio', NOW())
             ON CONFLICT DO NOTHING`,
            [user.privyDid, platform, postContent, promoCode, referralLink]
        ).catch(e => console.warn('[social/post] Could not log post (table may not exist yet):', e.message));

        return NextResponse.json({
            success: true,
            message: `Successfully posted to ${platform}! 🎉`,
        });
    } catch (error: any) {
        if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        console.error('[social/post] Unexpected error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
