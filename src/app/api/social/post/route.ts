import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/ai';
import { query } from '@/lib/db';
import { SocialPlatform, PLATFORM_TOOL_SLUGS, buildToolParams } from '@/lib/composio';

export const dynamic = 'force-dynamic';

/**
 * POST /api/social/post
 * Executes a direct social media post via Composio.
 * GATED: Requires Diamond tier (15+ referrals) OR Creator status.
 *
 * Body: { platform, postContent, promoCode, referralLink }
 * Response: { success: true, message }
 */
export async function POST(req: NextRequest) {
    try {
        const user = await getUserFromRequest(req);

        // ── Tier gate ──────────────────────────────────────────────────────────
        const settingsResult = await query(
            `SELECT referral_code, referral_tier, is_creator FROM user_settings WHERE user_id = $1`,
            [user.privyDid]
        );
        const settings = settingsResult.rows[0];
        const isDiamond = settings?.referral_tier === 'diamond';
        const isCreator = settings?.is_creator === true;

        if (!isDiamond && !isCreator) {
            return NextResponse.json(
                {
                    error: 'Direct posting is a Diamond tier feature. Reach 15 referrals or apply to the Creator Program to unlock it.',
                    upgradeRequired: true,
                },
                { status: 403 }
            );
        }

        const { platform, postContent, promoCode, referralLink } = await req.json() as {
            platform: SocialPlatform;
            postContent: string;
            promoCode: string;
            referralLink: string;
        };

        if (['tiktok', 'snapchat', 'reddit', 'youtube'].includes(platform)) {
            return NextResponse.json(
                { error: `${platform} direct posting is not supported — use the copy feature instead.` },
                { status: 400 }
            );
        }

        // ── Verify connection ──────────────────────────────────────────────────
        const connResult = await query(
            `SELECT composio_account_id, status FROM social_connections
             WHERE user_id = $1 AND platform = $2`,
            [user.privyDid, platform]
        );
        const connection = connResult.rows[0];

        if (!connection || connection.status !== 'active' || !connection.composio_account_id) {
            return NextResponse.json(
                {
                    error: `Your ${platform} account is not connected. Go to Settings → Social Connections to link it.`,
                    needsConnection: true,
                    platform,
                },
                { status: 402 }
            );
        }

        // ── Execute via Composio ───────────────────────────────────────────────
        const toolSlug = PLATFORM_TOOL_SLUGS[platform];
        const toolParams = buildToolParams(platform, postContent);

        const composioRes = await fetch('https://backend.composio.dev/api/v3/actions/execute', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.COMPOSIO_API_KEY ?? '',
            },
            body: JSON.stringify({
                actionName: toolSlug,
                connectedAccountId: connection.composio_account_id,
                input: toolParams,
            }),
        });

        if (!composioRes.ok) {
            const errBody = await composioRes.json().catch(() => ({}));
            console.error('[social/post] Composio execute error:', errBody);

            // Token expired → mark as expired so UI prompts reconnect
            if (composioRes.status === 401 || composioRes.status === 403) {
                await query(
                    `UPDATE social_connections SET status = 'expired', updated_at = NOW()
                     WHERE user_id = $1 AND platform = $2`,
                    [user.privyDid, platform]
                );
                return NextResponse.json(
                    { error: 'Your social connection has expired. Please reconnect your account.', reconnectRequired: true },
                    { status: 401 }
                );
            }

            return NextResponse.json({ error: 'Failed to post to social media. Please try again.' }, { status: 502 });
        }

        // ── Log successful post ────────────────────────────────────────────────
        await query(
            `INSERT INTO social_posts (user_id, platform, post_content, promo_code, referral_link, posted_via, posted_at)
             VALUES ($1, $2, $3, $4, $5, 'composio', NOW())`,
            [user.privyDid, platform, postContent, promoCode, referralLink]
        );

        return NextResponse.json({
            success: true,
            message: `Successfully posted to ${platform}! Your referral code ${promoCode} is now live.`,
        });
    } catch (error: any) {
        if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        console.error('[social/post] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
