import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/ai';
import { query } from '@/lib/db';
import {
    getOpenAIClient,
    SocialPlatform,
    PLATFORM_CONSTRAINTS,
    PLATFORM_SYSTEM_PROMPTS,
} from '@/lib/composio';

export const dynamic = 'force-dynamic';

/**
 * POST /api/social/generate
 * Calls OpenAI GPT-4o-mini to generate a platform-optimized referral post.
 * Includes the user's promo code and referral link, plus optional custom context.
 *
 * Body: { platform: SocialPlatform; customContext?: string }
 * Response: { post, promoCode, referralLink, platform, charCount, maxChars }
 */
export async function POST(req: NextRequest) {
    try {
        const user = await getUserFromRequest(req);
        const { platform, customContext } = await req.json() as {
            platform: SocialPlatform;
            customContext?: string;
        };

        const validPlatforms: SocialPlatform[] = ['linkedin', 'twitter', 'facebook', 'instagram', 'tiktok'];
        if (!validPlatforms.includes(platform)) {
            return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
        }

        // Fetch user's promo code
        const settingsResult = await query(
            `SELECT referral_code FROM user_settings WHERE user_id = $1`,
            [user.privyDid]
        );

        const promoCode: string | null = settingsResult.rows[0]?.referral_code ?? null;
        if (!promoCode) {
            return NextResponse.json(
                { error: 'You do not have a referral code yet. Visit /refer to generate one.' },
                { status: 400 }
            );
        }

        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://trademind.bot';
        const referralLink = `${appUrl}/?ref=${promoCode}&utm_source=${platform}&utm_medium=social&utm_campaign=referral`;
        const constraints = PLATFORM_CONSTRAINTS[platform];

        const userMessage = `Generate a ${platform} post for me (a TradeMind user) to share on my social media.

My referral/promo code: ${promoCode}
My referral link: ${referralLink}
${customContext ? `Additional personal context to weave in: ${customContext}` : ''}

Character limit: ${constraints.maxChars} characters.
${!constraints.supportsLinks ? 'IMPORTANT: This platform does not support clickable links in captions — write "link in bio" and mention the URL as plain text only.' : ''}

Make the post feel authentic, like it is coming from a real person who genuinely uses and likes TradeMind.
Do NOT start the post with "As a TradeMind user" or any AI-sounding preamble.`.trim();

        const openai = getOpenAIClient();
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: PLATFORM_SYSTEM_PROMPTS[platform] },
                { role: 'user', content: userMessage },
            ],
            max_tokens: 700,
            temperature: 0.8,
        });

        const generatedPost = completion.choices[0]?.message?.content?.trim() ?? '';
        if (!generatedPost) {
            return NextResponse.json({ error: 'AI generation returned an empty response' }, { status: 500 });
        }

        // Log to social_posts for SEC/FINRA compliance trail
        await query(
            `INSERT INTO social_posts (user_id, platform, post_content, promo_code, referral_link, posted_via)
             VALUES ($1, $2, $3, $4, $5, 'generated')`,
            [user.privyDid, platform, generatedPost, promoCode, referralLink]
        );

        return NextResponse.json({
            post: generatedPost,
            promoCode,
            referralLink,
            platform,
            charCount: generatedPost.length,
            maxChars: constraints.maxChars,
        });
    } catch (error: any) {
        if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        console.error('[social/generate] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
