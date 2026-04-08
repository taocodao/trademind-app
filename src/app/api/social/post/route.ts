import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/ai';
import { query } from '@/lib/db';
import { SocialPlatform, PLATFORM_TOOL_SLUGS, DIRECT_POST_PLATFORMS, buildToolParams } from '@/lib/composio';

export const dynamic = 'force-dynamic'; // Added to trigger Vercel deployment hook

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
        let effectiveMeta = { ...storedMeta, ...(metadata ?? {}) };

        // Helper for v3.1 REST Tools Execution bypassing SDK
        const executeComposioTool = async (actionSlug: string, args: any = {}) => {
            const res = await fetch(`https://backend.composio.dev/api/v3.1/tools/execute/${actionSlug}`, {
                method: 'POST',
                headers: {
                    'x-api-key': process.env.COMPOSIO_API_KEY ?? '',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    connected_account_id: connection.composio_account_id,
                    arguments: args,
                }),
            });
            
            // Composio responses are sometimes strings, sometimes objects
            const text = await res.text();
            let data;
            try { data = JSON.parse(text); } catch { data = { message: text }; }
            
            if (!res.ok) {
                const err: any = new Error(data?.message || data?.error || JSON.stringify(data));
                err.status = res.status;
                throw err;
            }
            return data;
        };

        // Phase 7: Auto-resolve Facebook page_id if missing
        if (platform === 'facebook' && !effectiveMeta.page_id) {
            console.info(`[social/post] Auto-fetching Facebook page ID...`);
            try {
                const fbPages = await executeComposioTool('FACEBOOK_LIST_MANAGED_PAGES');
                
                const dataObj = typeof fbPages === 'string' ? JSON.parse(fbPages) : fbPages;
                const rawPages = dataObj?.data?.pages || dataObj?.data?.data || dataObj?.pages || dataObj?.data || [];
                const pages = Array.isArray(rawPages) ? rawPages : [];
                
                if (pages.length > 0) {
                    const firstPage = pages[0];
                    const discoveredPageId = firstPage.id || firstPage.page_id;
                    if (discoveredPageId) {
                        effectiveMeta.page_id = discoveredPageId;
                        console.info(`[social/post] Found Facebook page: ${discoveredPageId} (${firstPage.name})`);
                        // Persist it
                        await query(
                            `UPDATE social_connections SET metadata = $1, updated_at = NOW() WHERE user_id = $2 AND platform = $3`,
                            [JSON.stringify(effectiveMeta), user.privyDid, platform]
                        );
                    }
                }
            } catch (err: any) {
                console.warn(`[social/post] Failed to auto-resolve Facebook page:`, err?.message || err);
            }
        }

        // ── Execute via Composio REST API ───────────────────────────────────────────
        const toolParams = buildToolParams(platform, postContent, effectiveMeta);

        console.info(`[social/post] Executing ${toolSlug} for ${platform} via connected account ${connection.composio_account_id}`);

        let executeResult: any;
        try {
            executeResult = await executeComposioTool(toolSlug, toolParams);
        } catch (err: any) {
            console.error('[social/post] Composio tools.execute error:', err?.status, err?.message ?? err);

            // Token expired → mark as expired so UI prompts reconnect
            if (err?.status === 401 || err?.status === 403 || err?.message?.toLowerCase().includes('expired')) {
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
