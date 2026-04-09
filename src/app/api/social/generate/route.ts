import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/ai';
import { query } from '@/lib/db';
import {
    getOpenAIClient,
    SocialPlatform,
    PostMode,
    TemplateStyle,
    PLATFORM_CONSTRAINTS,
    buildSystemPrompt,
} from '@/lib/composio';

export const dynamic = 'force-dynamic';

/**
 * POST /api/social/generate
 * Calls OpenAI GPT-4o-mini to generate a platform-optimized social post.
 * Supports referral mode (promote TradeMind) and education mode (share trading knowledge).
 *
 * Body: {
 *   platform: SocialPlatform;
 *   postMode?: 'referral' | 'education';   default: 'referral'
 *   templateStyle?: 'results' | 'educational' | 'casual';  default: 'results'
 *   customContext?: string;
 * }
 * Response: { post, promoCode, referralLink, platform, charCount, maxChars, postMode }
 */
export async function POST(req: NextRequest) {
    try {
        const user = await getUserFromRequest(req);
        const {
            platform,
            postMode = 'referral',
            templateStyle = 'results',
            customContext,
        } = await req.json() as {
            platform: SocialPlatform;
            postMode?: PostMode;
            templateStyle?: TemplateStyle;
            customContext?: string;
        };

        const validPlatforms: SocialPlatform[] = ['linkedin', 'twitter', 'facebook', 'instagram', 'tiktok', 'snapchat', 'reddit', 'youtube'];
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
        // Full referral link — auto-applies promo code when clicked (referee never needs to type it)
        const referralLink = `${appUrl}/?ref=${promoCode}&utm_source=${platform}&utm_medium=social&utm_campaign=${postMode}`;
        const constraints = PLATFORM_CONSTRAINTS[platform];

        // Intercept exactly for the LinkedIn Compounding Campaign
        if (templateStyle === 'campaign') {
            const campaignText = `A 19-year-old investing $5,000 at a 39% annual return becomes a millionaire at 41.

No inheritance.

No lucky stock pick.

Just time doing what time does.

The problem is nobody teaches Gen Z exactly *how* to get that return.

Not Robinhood.
Not Reddit.
Not a finance influencer selling a course.

I built TradeMind to close that gap.

Every trading day at 3PM, our AI sends a clear signal: BULL, SIDEWAYS, or BEAR.

It tells you the exact allocation and gives a plain-English reason why. 

7-year backtest: 39% annualized return. 
3x the S&P 500.
In 2022 when the QQQ lost 33%: our system returned +21.4%.

It takes under 2 minutes to act on. 

What is the biggest thing holding you back from starting to invest right now?

📝 Link to the live AI signals in the comments: \${appUrl}/c/compounding?ref=\${promoCode}\`;

            return NextResponse.json({
                post: campaignText,
                promoCode,
                referralLink,
                platform,
                postMode,
                templateStyle,
                charCount: campaignText.length,
                maxChars: constraints.maxChars,
            });
        }

        // Build the dynamic system prompt based on platform + mode + template style
        const systemPrompt = buildSystemPrompt(platform, postMode, templateStyle);

        const userMessage = `Generate a ${platform} ${postMode === 'education' ? 'educational trading' : 'referral'} post for me.

My referral/promo code: ${promoCode}
My referral link (auto-applies free trial — use this URL, not the bare code): ${referralLink}
${customContext ? `Personal context to weave in authentically: "${customContext}"` : ''}

Template style: ${templateStyle}
Character limit: ${constraints.maxChars} characters.
${!constraints.supportsLinks ? 'IMPORTANT: This platform does not support clickable links — write "link in bio" and show the URL as plain text.' : ''}

Make the post feel genuine — like a real trader who actually uses TradeMind, not a marketing ad.
Do NOT start with "As a TradeMind user" or any AI-sounding preamble.`.trim();

        const openai = getOpenAIClient();
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage },
            ],
            max_tokens: 800,
            temperature: 0.85,
        });

        const generatedPost = completion.choices[0]?.message?.content?.trim() ?? '';
        if (!generatedPost) {
            return NextResponse.json({ error: 'AI generation returned an empty response' }, { status: 500 });
        }

        // Log to social_posts for SEC/FINRA compliance trail
        await query(
            `INSERT INTO social_posts (user_id, platform, post_content, promo_code, referral_link, posted_via)
             VALUES ($1, $2, $3, $4, $5, 'generated')
             ON CONFLICT DO NOTHING`,
            [user.privyDid, platform, generatedPost, promoCode, referralLink]
        ).catch(e => console.warn('[social/generate] Could not log post:', e.message));

        return NextResponse.json({
            post: generatedPost,
            promoCode,
            referralLink,
            platform,
            postMode,
            templateStyle,
            charCount: generatedPost.length,
            maxChars: constraints.maxChars,
        });
    } catch (error: any) {
        if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        console.error('[social/generate] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
