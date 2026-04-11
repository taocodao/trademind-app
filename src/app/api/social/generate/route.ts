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
            tone = 'professional',
            customContext,
        } = await req.json() as {
            platform: SocialPlatform;
            postMode?: PostMode;
            templateStyle?: TemplateStyle;
            tone?: 'professional' | 'punchy' | 'casual';
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

        // Intercept exactly for the Compounding Campaign
        if (templateStyle === 'campaign') {
            let options;
            
            if (platform === 'twitter') {
                options = [
                    {
                        label: 'Professional',
                        text: `A 19yo investing $5k at a 39% return becomes a millionaire at 41.\n\nNo luck. Just pure compounding.\n\nTradeMind's AI signals give you that edge: 39% APY backtest (3x S&P).\n\nStart your free trial today: ${appUrl}/c/compounding?ref=${promoCode}`
                    },
                    {
                        label: 'Punchy',
                        text: `You don't need a massive salary to become a millionaire. You just need a mathematical edge.\n\nTradeMind's AI sent clear BULL/BEAR signals that returned 39% APY over 7 years.\n\nStop guessing.\n\nStart with $100 free credit 👉 ${appUrl}/c/compounding?ref=${promoCode}`
                    },
                    {
                        label: 'Casual',
                        text: `Wild stat: A 19yo investing $5k at 39% APY hits $1M at 41. 🤯\n\nHow do you get 39%? I use TradeMind. The AI sends a 3PM signal (BULL/BEAR) that 3x'd the S&P 500 over 7 years.\n\nEven made +21% in the 2022 crash.\n\nTry it free: ${appUrl}/c/compounding?ref=${promoCode}`
                    }
                ];
            } else {
                options = [
                    {
                        label: 'Professional',
                        text: `The math behind algorithmic compounding is undeniable.\n\nA 19-year-old investing $5,000 at a 39% annual return becomes a millionaire at 41.\n\nNo inheritance. No lucky stock pick. Just time doing what time does.\n\nThe problem is nobody teaches Gen Z exactly *how* to get that return reliably. Not Robinhood. Not Reddit. Not a finance influencer.\n\nI built TradeMind to close that gap. Every trading day at 3PM, our AI sends a clear signal: BULL, SIDEWAYS, or BEAR. It tells you the exact allocation and gives a plain-English reason why. \n\n7-year backtest: 39% annualized return. 3x the S&P 500.\nIn 2022 when the QQQ lost 33%, our system returned +21.4%.\n\nIt takes under 2 minutes to act on. \n\nWhat is the biggest thing holding you back from systematic trading right now?\n\n📝 Link to the live AI signals: ${appUrl}/c/compounding?ref=${promoCode}`
                    },
                    {
                        label: 'Punchy',
                        text: `Most people think you need a massive salary to become a millionaire. You just need a mathematical edge.\n\nIf you start with $5,000 at age 19 and compound it at 39% annually, you hit $1M by age 41. \n\nTradeMind's AI gives you that mathematical edge.\n- 39% annualized return in our 7-year backtest (3x the S&P 500)\n- Capital preservation: Returned +21.4% in 2022 when the market crashed 33%\n- Effortless execution: Clear BULL/BEAR signals every day at 3PM. \n\nStop guessing and start trading with an algorithm.\n\n📝 Start with $100 in free credit: ${appUrl}/c/compounding?ref=${promoCode}`
                    },
                    {
                        label: 'Casual',
                        text: `Wild stat of the day: A 19-year-old investing $5k at a 39% annual return becomes a millionaire at 41. 🤯\n\nNo luck. Just pure compound interest.\n\nIf you want to know *how* to actually hit 39% APY without staring at charts all day, check out TradeMind. Our AI sends a simple BULL/BEAR signal every day before the market closes. It takes 2 minutes to follow and has 3x'd the S&P 500 over the past 7 years.\n\nWe even made +21% during the 2022 market crash while everyone else was losing money.\n\n📝 Try the AI for free here: ${appUrl}/c/compounding?ref=${promoCode}`
                    }
                ];
            }

            return NextResponse.json({
                post: options[0].text,
                options,
                promoCode,
                referralLink,
                platform,
                postMode,
                templateStyle,
                charCount: options[0].text.length,
                maxChars: constraints.maxChars,
            });
        }

        // Build the dynamic system prompt based on platform + mode + template style
        const systemPrompt = buildSystemPrompt(platform, postMode, templateStyle);

        const toneDirective = tone === 'professional'
            ? 'Write in a formal, data-driven, professional tone. Use LinkedIn-quality prose.'
            : tone === 'punchy'
            ? 'Write in a direct, bold tone. Short sentences. High energy. Maximum impact per word.'
            : 'Write in a casual, conversational, relatable tone. Use contractions, be friendly and approachable.';

        const userMessage = `Generate a ${platform} ${postMode === 'education' ? 'educational trading' : 'referral'} post for me.

My referral/promo code: ${promoCode}
My referral link (auto-applies free trial — use this URL, not the bare code): ${referralLink}
${customContext ? `Personal context to weave in authentically: "${customContext}"` : ''}

Template style: ${templateStyle}
Tone direction: ${toneDirective}
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
