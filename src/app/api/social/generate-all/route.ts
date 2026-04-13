import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/ai';
import { query } from '@/lib/db';
import { getOpenAIClient, PLATFORM_CONSTRAINTS, buildSystemPrompt, TemplateStyle } from '@/lib/composio';
import {
    CHANNEL_STRATEGY,
    ALL_PLATFORMS,
    ALL_TEMPLATES,
    ALL_TONES,
    SocialPlatform,
    TemplateId,
    ToneId,
} from '@/lib/social/strategy-config';

export const dynamic  = 'force-dynamic';
export const maxDuration = 60; // Vercel: max 60s for hobby; increase if on Pro

/**
 * POST /api/social/generate-all
 * Bulk-generates all platform × template × tone permutations for a user
 * and saves each to social_post_cache.
 *
 * - Skips combinations already cached (idempotent — safe to call multiple times)
 * - Campaign template is hardcoded — written directly to cache, no OpenAI call
 * - Returns a summary: { total, skipped, generated, failed }
 *
 * Triggered once on first modal open per user (from ShareModal.tsx useEffect).
 */

// ── Markdown stripper (same as /api/social/generate) ─────────────────────
function stripMarkdown(text: string): string {
    return text
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/`([^`]+)`/g, '$1');
}

// ── Hardcoded Campaign content (no OpenAI cost) ───────────────────────────
function getCampaignText(
    platform: SocialPlatform,
    tone: ToneId,
    appUrl: string,
    promoCode: string,
): string {
    const link = `${appUrl}/c/compounding?ref=${promoCode}`;

    const isTwitter = platform === 'twitter';

    const variants: Record<ToneId, string> = {
        professional: isTwitter
            ? `A 19yo investing $5k at a 39% return becomes a millionaire at 41.\n\nNo luck. Just pure compounding.\n\nTradeMind's AI signals give you that edge: 39% APY backtest (3x S&P).\n\nNot financial advice. Start your free trial: ${link}`
            : `The math behind algorithmic compounding is undeniable.\n\nA 19-year-old investing $5,000 at a 39% annual return becomes a millionaire at 41.\n\nNo inheritance. No lucky stock pick. Just time doing what time does.\n\nThe problem is nobody teaches Gen Z exactly how to get that return reliably. Not Robinhood. Not Reddit. Not a finance influencer.\n\nI built TradeMind to close that gap. Every trading day at 3PM, our AI sends a clear signal: BULL, SIDEWAYS, or BEAR. It tells you the exact allocation and gives a plain-English reason why.\n\n7-year backtest: 39% annualized return. 3x the S&P 500.\nIn 2022 when the QQQ lost 33%, our system returned +21.4%.\n\nIt takes under 2 minutes to act on.\n\nPast performance does not guarantee future results. Not financial advice.\n\nStart your free trial: ${link}`,
        punchy: isTwitter
            ? `You don't need a massive salary to become a millionaire. You just need a mathematical edge.\n\nTradeMind's AI: 39% APY backtest. 7 years. 3x S&P.\n\nStop guessing. Start with $100 free credit 👉 ${link}\n\nNot financial advice.`
            : `Most people think you need a massive salary to become a millionaire. You just need a mathematical edge.\n\nIf you start with $5,000 at age 19 and compound it at 39% annually, you hit $1M by age 41.\n\nTradeMind's AI gives you that mathematical edge.\n- 39% annualized return in our 7-year backtest (3x the S&P 500)\n- Capital preservation: Returned +21.4% in 2022 when the market crashed 33%\n- Effortless execution: Clear BULL/BEAR signals every day at 3PM.\n\nStop guessing and start trading with an algorithm.\n\nPast performance does not guarantee future results. Not financial advice.\n\nStart with $100 in free credit: ${link}`,
        casual: isTwitter
            ? `Wild stat: A 19yo investing $5k at 39% APY hits $1M at 41. 🤯\n\nI use TradeMind. The AI sends a 3PM signal (BULL/BEAR) that 3x'd S&P 500 over 7 years.\n\nEven made +21% in the 2022 crash.\n\nTry it free: ${link}\n\nNot financial advice.`
            : `Wild stat of the day: A 19-year-old investing $5k at a 39% annual return becomes a millionaire at 41. 🤯\n\nNo luck. Just pure compound interest.\n\nIf you want to know how to actually hit 39% APY without staring at charts all day, check out TradeMind. Our AI sends a simple BULL/BEAR signal every day before the market closes. It takes 2 minutes to follow and has 3x'd the S&P 500 over the past 7 years.\n\nWe even made +21% during the 2022 market crash while everyone else was losing money.\n\nNot financial advice. Past performance does not guarantee future results.\n\nTry the AI for free here: ${link}`,
    };
    return variants[tone];
}

// ── Ensure cache table ────────────────────────────────────────────────────
let cacheTableReady = false;
async function ensureCacheTable() {
    if (cacheTableReady) return;
    await query(`
        CREATE TABLE IF NOT EXISTS social_post_cache (
            id             SERIAL PRIMARY KEY,
            user_id        VARCHAR(128) NOT NULL,
            platform       VARCHAR(32)  NOT NULL,
            template_style VARCHAR(32)  NOT NULL,
            tone           VARCHAR(32)  NOT NULL,
            post_content   TEXT         NOT NULL,
            post_options   JSONB,
            created_at     TIMESTAMPTZ  DEFAULT NOW(),
            updated_at     TIMESTAMPTZ  DEFAULT NOW(),
            UNIQUE(user_id, platform, template_style, tone)
        )
    `);
    cacheTableReady = true;
}

// ── Find which (platform, template, tone) combos are already cached ───────
async function getMissingCombos(
    userId: string
): Promise<Array<{ platform: SocialPlatform; template: TemplateId; tone: ToneId }>> {
    const res = await query(
        `SELECT platform, template_style, tone FROM social_post_cache WHERE user_id = $1`,
        [userId]
    );
    const cached = new Set(res.rows.map((r: { platform: string; template_style: string; tone: string }) => `${r.platform}|${r.template_style}|${r.tone}`));

    const missing: Array<{ platform: SocialPlatform; template: TemplateId; tone: ToneId }> = [];
    for (const platform of ALL_PLATFORMS) {
        for (const template of ALL_TEMPLATES) {
            for (const tone of ALL_TONES) {
                if (!cached.has(`${platform}|${template}|${tone}`)) {
                    missing.push({ platform, template, tone });
                }
            }
        }
    }
    return missing;
}

async function writeToCache(userId: string, platform: string, template: string, tone: string, content: string) {
    await query(
        `INSERT INTO social_post_cache (user_id, platform, template_style, tone, post_content, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (user_id, platform, template_style, tone)
         DO UPDATE SET post_content = $5, updated_at = NOW()`,
        [userId, platform, template, tone, content]
    );
}

// ── Generate one AI post using strategy config ────────────────────────────
async function generateOne(
    platform: SocialPlatform,
    template: TemplateId,
    tone: ToneId,
    promoCode: string,
    referralLink: string,
    appUrl: string,
): Promise<string> {
    const strategy   = CHANNEL_STRATEGY[platform];
    const constraints = PLATFORM_CONSTRAINTS[platform];
    const openai     = getOpenAIClient();
    const postMode   = template === 'education' ? 'education' : 'referral';

    const toneDirective =
        tone === 'professional' ? 'Write in a formal, data-driven, professional tone. Use LinkedIn-quality prose.' :
        tone === 'punchy'       ? 'Write in a direct, bold tone. Short sentences. High energy. Maximum impact per word.' :
                                  'Write in a casual, conversational, relatable tone. Use contractions, be friendly and approachable.';

    const systemPrompt  = buildSystemPrompt(platform, postMode, template as TemplateStyle);
    const hashtagBlock  = strategy.hashtagCount > 0 && strategy.hashtags.length > 0
        ? `\nAppend exactly ${strategy.hashtagCount} hashtag(s) at the end: ${strategy.hashtags.slice(0, strategy.hashtagCount).join(' ')}`
        : '\nDo NOT include any hashtags.';
    const emojiGuide    =
        strategy.emojiLevel === 'none'   ? 'Do NOT use any emojis.' :
        strategy.emojiLevel === 'low'    ? 'Use 1–3 structural emojis maximum (✅ 💡 📊 ⚡️ 👇). Avoid money/gain emojis.' :
        strategy.emojiLevel === 'medium' ? 'Use 3–6 emojis. Cultural/emotional context. Avoid 🚀💰📈 in combination.' :
                                           'Use 5–10 emojis freely — this platform expects high emoji density.';

    const userMessage = `Generate a ${platform} ${postMode === 'education' ? 'educational trading' : 'referral'} post.

My referral/promo code: ${promoCode}
My referral link (use this full URL in CTA, not just the code): ${strategy.linkPlacement === 'bio' || strategy.linkPlacement === 'dm_only' ? '[do not include URL — see CTA instructions below]' : referralLink}
CTA format to use: ${strategy.ctaFormat.replace('[URL]', referralLink).replace('[PROMOCODE]', promoCode)}
Link placement: ${strategy.linkPlacement}

Template style: ${template}
Tone direction: ${toneDirective}
Target length: ${strategy.optimalChars.min}–${strategy.optimalChars.max} characters.
${!constraints.supportsLinks ? 'IMPORTANT: This platform does not support clickable links in posts. Write "link in bio" or "DM me" — never paste the raw URL.' : ''}

${emojiGuide}
${hashtagBlock}

Platform-specific writing guidance:
${strategy.writingNotes}

Disclaimer to append at the end: "${strategy.disclaimer}"

CRITICAL FORMATTING RULES:
- Do NOT use any markdown formatting: no **bold**, no *italic*, no # headings, no backticks
- Write in plain text only — exactly as it would appear posted on ${platform}
- Do NOT start with "As a TradeMind user" or any AI-sounding preamble
- Make it feel like a real person who actually uses TradeMind wrote this`.trim();

    const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user',   content: userMessage },
        ],
        max_tokens: 900,
        temperature: 0.82,
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? '';
    return stripMarkdown(raw);
}

// ── Main handler ──────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    try {
        const user = await getUserFromRequest(req);

        // Fetch promo code
        const settingsRes = await query(
            `SELECT referral_code FROM user_settings WHERE user_id = $1`,
            [user.privyDid]
        );
        const promoCode: string | null = settingsRes.rows[0]?.referral_code ?? null;
        if (!promoCode) {
            return NextResponse.json({ error: 'No referral code found' }, { status: 400 });
        }

        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://trademind.bot';
        await ensureCacheTable();

        const missing = await getMissingCombos(user.privyDid);
        if (missing.length === 0) {
            return NextResponse.json({ total: 0, skipped: 96, generated: 0, failed: 0, message: 'All combinations already cached' });
        }

        let generated = 0;
        let failed    = 0;
        const skipped = 96 - missing.length;

        for (const { platform, template, tone } of missing) {
            try {
                const referralLink = `${appUrl}/?ref=${promoCode}&utm_source=${platform}&utm_medium=social&utm_campaign=${template === 'education' ? 'education' : 'referral'}`;

                let content: string;

                if (template === 'campaign') {
                    // Campaign: use hardcoded copy, no OpenAI
                    content = getCampaignText(platform, tone, appUrl, promoCode);
                } else {
                    content = await generateOne(platform, template, tone, promoCode, referralLink, appUrl);
                }

                if (content) {
                    await writeToCache(user.privyDid, platform, template, tone, content);
                    generated++;
                } else {
                    failed++;
                }
            } catch (err: any) {
                console.error(`[generate-all] Failed ${platform}/${template}/${tone}:`, err.message);
                failed++;
            }
        }

        return NextResponse.json({
            total:     missing.length,
            skipped,
            generated,
            failed,
            message: `Generated ${generated} posts, ${skipped} already cached, ${failed} failed`,
        });
    } catch (error: any) {
        if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        console.error('[generate-all] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
