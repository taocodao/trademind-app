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
 * Returns a platform-optimized social post for the given combination
 * of platform + templateStyle + tone.
 *
 * Cache behaviour:
 *   - First call: generate via OpenAI, save to social_post_cache
 *   - Subsequent calls: return cached row directly (no OpenAI cost)
 *   - forceRegenerate=true: bypass cache, generate fresh, overwrite cache
 *
 * Body: {
 *   platform: SocialPlatform;
 *   postMode?: 'referral' | 'education';
 *   templateStyle?: TemplateStyle;
 *   tone?: 'professional' | 'punchy' | 'casual';
 *   forceRegenerate?: boolean;
 * }
 */

// ── Markdown stripper ───────────────────────────────────────────────────────
// Removes **bold**, *italic*, # headings from AI output before returning.
// Platform social posts should be plain text.
function stripMarkdown(text: string): string {
    return text
        .replace(/\*\*(.*?)\*\*/g, '$1')   // **bold** → bold
        .replace(/\*(.*?)\*/g, '$1')        // *italic* → italic
        .replace(/^#{1,6}\s+/gm, '')        // # headings → plain line
        .replace(/`([^`]+)`/g, '$1');       // `code` → code
}

// ── Cache helpers ───────────────────────────────────────────────────────────
// Ensures the cache table exists (idempotent each cold start).
let cacheTableReady = false;
async function ensureCacheTable() {
    if (cacheTableReady) return;
    await query(`
        CREATE TABLE IF NOT EXISTS social_post_cache (
            id           SERIAL PRIMARY KEY,
            user_id      VARCHAR(128) NOT NULL,
            platform     VARCHAR(32)  NOT NULL,
            template_style VARCHAR(32) NOT NULL,
            tone         VARCHAR(32)  NOT NULL,
            post_content TEXT         NOT NULL,
            post_options JSONB,
            created_at   TIMESTAMPTZ  DEFAULT NOW(),
            updated_at   TIMESTAMPTZ  DEFAULT NOW(),
            UNIQUE(user_id, platform, template_style, tone)
        )
    `);
    cacheTableReady = true;
}

async function getCachedPost(userId: string, platform: string, templateStyle: string, tone: string) {
    const res = await query(
        `SELECT post_content, post_options FROM social_post_cache
         WHERE user_id=$1 AND platform=$2 AND template_style=$3 AND tone=$4`,
        [userId, platform, templateStyle, tone]
    );
    return res.rows[0] ?? null;
}

async function upsertCachedPost(
    userId: string, platform: string, templateStyle: string, tone: string,
    postContent: string, postOptions?: object | null
) {
    await query(
        `INSERT INTO social_post_cache
             (user_id, platform, template_style, tone, post_content, post_options, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         ON CONFLICT (user_id, platform, template_style, tone)
         DO UPDATE SET post_content=$5, post_options=$6, updated_at=NOW()`,
        [userId, platform, templateStyle, tone, postContent, postOptions ? JSON.stringify(postOptions) : null]
    );
}

// ── Route handler ───────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    try {
        const user = await getUserFromRequest(req);
        const {
            platform,
            postMode = 'referral',
            templateStyle = 'results',
            tone = 'professional',
            forceRegenerate = false,
        } = await req.json() as {
            platform: SocialPlatform;
            postMode?: PostMode;
            templateStyle?: TemplateStyle;
            tone?: 'professional' | 'punchy' | 'casual';
            forceRegenerate?: boolean;
        };

        const validPlatforms: SocialPlatform[] = [
            'linkedin', 'twitter', 'facebook', 'instagram',
            'tiktok', 'snapchat', 'reddit', 'youtube',
        ];
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
        const referralLink = `${appUrl}/?ref=${promoCode}&utm_source=${platform}&utm_medium=social&utm_campaign=${postMode}`;
        const constraints = PLATFORM_CONSTRAINTS[platform];

        await ensureCacheTable();

        // ── Campaign template: hardcoded copy, no OpenAI call needed ─────────
        if (templateStyle === 'campaign') {
            const twitterOptions = [
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
                },
            ];
            const defaultOptions = [
                {
                    label: 'Professional',
                    text: `The math behind algorithmic compounding is undeniable.\n\nA 19-year-old investing $5,000 at a 39% annual return becomes a millionaire at 41.\n\nNo inheritance. No lucky stock pick. Just time doing what time does.\n\nThe problem is nobody teaches Gen Z exactly how to get that return reliably. Not Robinhood. Not Reddit. Not a finance influencer.\n\nI built TradeMind to close that gap. Every trading day at 3PM, our AI sends a clear signal: BULL, SIDEWAYS, or BEAR. It tells you the exact allocation and gives a plain-English reason why.\n\n7-year backtest: 39% annualized return. 3x the S&P 500.\nIn 2022 when the QQQ lost 33%, our system returned +21.4%.\n\nIt takes under 2 minutes to act on.\n\nWhat is the biggest thing holding you back from systematic trading right now?\n\nLink to the live AI signals: ${appUrl}/c/compounding?ref=${promoCode}`
                },
                {
                    label: 'Punchy',
                    text: `Most people think you need a massive salary to become a millionaire. You just need a mathematical edge.\n\nIf you start with $5,000 at age 19 and compound it at 39% annually, you hit $1M by age 41.\n\nTradeMind's AI gives you that mathematical edge.\n- 39% annualized return in our 7-year backtest (3x the S&P 500)\n- Capital preservation: Returned +21.4% in 2022 when the market crashed 33%\n- Effortless execution: Clear BULL/BEAR signals every day at 3PM.\n\nStop guessing and start trading with an algorithm.\n\nStart with $100 in free credit: ${appUrl}/c/compounding?ref=${promoCode}`
                },
                {
                    label: 'Casual',
                    text: `Wild stat of the day: A 19-year-old investing $5k at a 39% annual return becomes a millionaire at 41. 🤯\n\nNo luck. Just pure compound interest.\n\nIf you want to know how to actually hit 39% APY without staring at charts all day, check out TradeMind. Our AI sends a simple BULL/BEAR signal every day before the market closes. It takes 2 minutes to follow and has 3x'd the S&P 500 over the past 7 years.\n\nWe even made +21% during the 2022 market crash while everyone else was losing money.\n\nTry the AI for free here: ${appUrl}/c/compounding?ref=${promoCode}`
                },
            ];

            const options = platform === 'twitter' ? twitterOptions : defaultOptions;
            // Campaign options are static — cache isn't needed, but return immediately
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
                fromCache: false,
            });
        }

        // ── Cache lookup for AI-generated templates ───────────────────────────
        if (!forceRegenerate) {
            const cached = await getCachedPost(user.privyDid, platform, templateStyle, tone);
            if (cached) {
                return NextResponse.json({
                    post: cached.post_content,
                    promoCode,
                    referralLink,
                    platform,
                    postMode,
                    templateStyle,
                    charCount: cached.post_content.length,
                    maxChars: constraints.maxChars,
                    fromCache: true,
                });
            }
        }

        // ── Generate via OpenAI ───────────────────────────────────────────────
        const systemPrompt = buildSystemPrompt(platform, postMode, templateStyle);

        const toneDirective = tone === 'professional'
            ? 'Write in a formal, data-driven, professional tone. Use LinkedIn-quality prose.'
            : tone === 'punchy'
            ? 'Write in a direct, bold tone. Short sentences. High energy. Maximum impact per word.'
            : 'Write in a casual, conversational, relatable tone. Use contractions, be friendly and approachable.';

        const userMessage = `Generate a ${platform} ${postMode === 'education' ? 'educational trading' : 'referral'} post for me.

My referral/promo code: ${promoCode}
My referral link (auto-applies free trial — use this URL, not the bare code): ${referralLink}

Template style: ${templateStyle}
Tone direction: ${toneDirective}
Character limit: ${constraints.maxChars} characters.
${!constraints.supportsLinks ? 'IMPORTANT: This platform does not support clickable links — write "link in bio" and show the URL as plain text.' : ''}

IMPORTANT FORMATTING: Do NOT use any markdown formatting. No asterisks, no **bold**, no *italic*, no # headings. Write in plain text only — exactly as it would appear in a social media post.

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

        const rawPost = completion.choices[0]?.message?.content?.trim() ?? '';
        if (!rawPost) {
            return NextResponse.json({ error: 'AI generation returned an empty response' }, { status: 500 });
        }

        // Strip any residual markdown the model slipped in despite the instruction
        const generatedPost = stripMarkdown(rawPost);

        // Save to cache (upsert — force-regenerate overwrites the old row)
        await upsertCachedPost(user.privyDid, platform, templateStyle, tone, generatedPost)
            .catch(e => console.warn('[social/generate] Cache write failed:', e.message));

        // Also log to compliance trail
        await query(
            `INSERT INTO social_posts (user_id, platform, post_content, promo_code, referral_link, posted_via)
             VALUES ($1, $2, $3, $4, $5, 'generated')
             ON CONFLICT DO NOTHING`,
            [user.privyDid, platform, generatedPost, promoCode, referralLink]
        ).catch(e => console.warn('[social/generate] Compliance log failed:', e.message));

        return NextResponse.json({
            post: generatedPost,
            promoCode,
            referralLink,
            platform,
            postMode,
            templateStyle,
            charCount: generatedPost.length,
            maxChars: constraints.maxChars,
            fromCache: false,
        });
    } catch (error: any) {
        if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        console.error('[social/generate] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
