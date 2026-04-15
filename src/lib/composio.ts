/**
 * Composio SDK Utilities
 * Singleton client + platform configuration for the TradeMind social referral system.
 *
 * Platform Groups:
 *   Group A — Direct text post (OAuth + auto-post): linkedin, twitter, facebook, reddit
 *   Group B — Media-required (script/clipboard mode): instagram, tiktok, youtube
 *   Group C — No Composio toolkit (clipboard forever): snapchat
 */

import { OpenAI } from 'openai';

// ── SDK Singleton ─────────────────────────────────────────────────────────────

let openaiClient: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
    if (!openaiClient) {
        openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    return openaiClient;
}

// ── Platform Configuration ────────────────────────────────────────────────────

export type SocialPlatform = 'linkedin' | 'twitter' | 'facebook' | 'instagram' | 'tiktok' | 'snapchat' | 'reddit' | 'youtube';
export type PostMode = 'referral' | 'education';
export type TemplateStyle = 'results' | 'educational' | 'casual' | 'campaign';

/**
 * Platform → Composio Auth Config ID mapping.
 * These env vars are set per-platform in the Composio dashboard → Auth Configs.
 */
export const COMPOSIO_AUTH_CONFIGS: Record<SocialPlatform, string> = {
    linkedin:  process.env.COMPOSIO_AUTH_CONFIG_LINKEDIN  ?? '',
    twitter:   process.env.COMPOSIO_AUTH_CONFIG_TWITTER   ?? '',
    facebook:  process.env.COMPOSIO_AUTH_CONFIG_FACEBOOK  ?? '',
    instagram: process.env.COMPOSIO_AUTH_CONFIG_INSTAGRAM ?? '',
    tiktok:    process.env.COMPOSIO_AUTH_CONFIG_TIKTOK    ?? '',
    snapchat:  process.env.COMPOSIO_AUTH_CONFIG_SNAPCHAT  ?? '', // Auth Config confirmed active in Composio dashboard
    reddit:    process.env.COMPOSIO_AUTH_CONFIG_REDDIT    ?? '',
    youtube:   process.env.COMPOSIO_AUTH_CONFIG_YOUTUBE   ?? '',
};

/**
 * Platform → Composio tool action slug for direct posting.
 * Slugs are CONFIRMED via Perplexity research against Composio docs (April 2026).
 */
export const PLATFORM_TOOL_SLUGS: Record<SocialPlatform, string> = {
    linkedin:  'LINKEDIN_CREATE_LINKED_IN_POST',  // Confirmed — note IN_IN not IN
    twitter:   'TWITTER_CREATION_OF_A_POST',       // Confirmed — not TWITTER_CREATE_TWEET
    facebook:  'FACEBOOK_CREATE_POST',             // Confirmed — requires page_id in params
    instagram: 'INSTAGRAM_CREATE_MEDIA_CONTAINER', // Step 1 of 2-step flow (media required)
    reddit:    'REDDIT_CREATE_REDDIT_POST',        // Confirmed — text posts supported!
    tiktok:    '',  // Video upload required — clipboard/script mode only
    youtube:   '',  // Video upload required — clipboard/script mode only
    snapchat:  '',  // No Composio toolkit — clipboard forever
};

/**
 * Platform constraints for post generation.
 */
export const PLATFORM_CONSTRAINTS: Record<SocialPlatform, {
    maxChars: number;
    supportsLinks: boolean;
    supportsHashtags: boolean;
    supportsDirectPost: boolean;
    requiresMedia: boolean;
}> = {
    linkedin:  { maxChars: 3000,  supportsLinks: true,  supportsHashtags: true,  supportsDirectPost: true,  requiresMedia: false },
    twitter:   { maxChars: 250,   supportsLinks: true,  supportsHashtags: true,  supportsDirectPost: false, requiresMedia: false },
    facebook:  { maxChars: 63206, supportsLinks: true,  supportsHashtags: true,  supportsDirectPost: true,  requiresMedia: false },
    instagram: { maxChars: 2200,  supportsLinks: false, supportsHashtags: true,  supportsDirectPost: false, requiresMedia: true  },
    tiktok:    { maxChars: 2200,  supportsLinks: false, supportsHashtags: true,  supportsDirectPost: false, requiresMedia: true  },
    snapchat:  { maxChars: 2200,  supportsLinks: false, supportsHashtags: false, supportsDirectPost: false, requiresMedia: false },
    reddit:    { maxChars: 40000, supportsLinks: true,  supportsHashtags: false, supportsDirectPost: true,  requiresMedia: false },
    youtube:   { maxChars: 5000,  supportsLinks: true,  supportsHashtags: true,  supportsDirectPost: false, requiresMedia: true  },
};

/**
 * Group A: Platforms that support Composio direct text posting.
 * Group B: Media-first platforms — generate script/caption for user to post manually.
 * Group C: No Composio support — clipboard only.
 */
export const DIRECT_POST_PLATFORMS: SocialPlatform[] = ['linkedin', 'facebook', 'reddit'];
export const SCRIPT_ONLY_PLATFORMS: SocialPlatform[] = ['instagram', 'tiktok', 'youtube'];
export const CLIPBOARD_ONLY_PLATFORMS: SocialPlatform[] = []; // Snapchat auth config is active — may support posting

/**
 * All platforms that can OAuth-connect via Composio (including Snapchat — auth config confirmed).
 */
export const OAUTH_PLATFORMS: SocialPlatform[] = ['linkedin', 'facebook', 'instagram', 'tiktok', 'reddit', 'youtube', 'snapchat'];

/**
 * Safe default subreddits for financial content referral posts.
 */
export const REDDIT_SUBREDDITS = [
    { value: 'stocks',        label: 'r/stocks — General investing' },
    { value: 'options',       label: 'r/options — Options trading' },
    { value: 'investing',     label: 'r/investing — Broad audience' },
    { value: 'algotrading',   label: 'r/algotrading — AI/algo traders' },
    { value: 'wallstreetbets', label: 'r/wallstreetbets — High energy (check rules)' },
];

// ── System Prompts ────────────────────────────────────────────────────────────

/**
 * Maps locale codes to full language names for the AI system prompt.
 * Instructions are always in English even when requesting another output language
 * ("non-native prompting" — GPT-4o performs best this way per research).
 */
const LANGUAGE_MAP: Record<string, string> = {
    en: 'English',
    es: 'Spanish',
    zh: 'Simplified Chinese (Mandarin)',
};

/**
 * Strips invisible Unicode characters from user-supplied content before sending
 * to the OpenAI API. These can cause null-byte generation or corrupt streaming
 * responses, especially with CJK Chinese output.
 *
 * Removes: non-breaking spaces, zero-width chars, BOM, bidi control chars.
 */
export function sanitizeForLLM(text: string): string {
    return text
        .replace(/[\u00A0\u200B\u200C\u200D\u2060]/g, ' ') // replace with regular space
        .replace(/[\uFEFF\u200E\u200F\u202A-\u202E]/g, ''); // remove BOM and bidi markers
}

/**
 * Build the system prompt for a given platform, post mode, template style, and locale.
 *
 * postMode: 'referral' = promote TradeMind + include referral link
 *           'education' = share trading knowledge, soft CTA at end only
 *
 * locale: 'en' (default) | 'es' | 'zh'
 *   When locale is not English, a CRITICAL language directive is prepended.
 *   This directive is written in English even for non-English targets — GPT-4o
 *   is most steerable with English system instructions (non-native prompting).
 */
export function buildSystemPrompt(
    platform: SocialPlatform,
    postMode: PostMode = 'referral',
    templateStyle: TemplateStyle = 'results',
    locale: string = 'en'
): string {
    // ── Language directive (prepended for non-English output) ─────────────
    const targetLanguage = LANGUAGE_MAP[locale] ?? 'English';
    const languageDirective = locale !== 'en'
        ? `CRITICAL OUTPUT LANGUAGE RULE — READ FIRST:
You MUST write the ENTIRE social media post in ${targetLanguage} only.
- Do NOT mix languages under any circumstances.
- Do NOT include any English text whatsoever (except technical terms below).
- All sentences, hashtags, calls-to-action, and commentary MUST be in ${targetLanguage}.
- Failure to write entirely in ${targetLanguage} is a critical error.

PRESERVE EXACTLY AS-IS (do not translate these):
- The referral URL (copy it character-for-character)
- Ticker symbols (e.g. TQQQ, QQQ, SGOV, SPY, NVDA)
- Percentage figures and dollar amounts (e.g. 39%, $5,000, +21.4%)
- The platform name: TradeMind or TradeMind.bot
- Hashtags: keep them in ${targetLanguage} where natural, or use English if the platform expects English hashtags

`
        : '';

    const toneGuide: Record<TemplateStyle, string> = {
        results:     'Focus on concrete results and performance. Use first-person experience ("I made X trades", "The signal caught Y move").',
        educational: 'Focus on teaching — explain how options signals work, what IV means, how AI detects market conditions. Position yourself as a knowledgeable trader sharing insights.',
        casual:      'Keep it short, punchy, and conversational. Use casual language, relatable frustrations ("tired of guessing?"), and hype energy without being cringe.',
        campaign:    'Reserved for exact LinkedIn campaign copy. Do not deviate from the prompt.',
    };

    const complianceNote = 'MANDATORY: Always end with "Not financial advice." as its own line.';
    const linkNote = 'Include the full referral link in the post — it auto-applies the promo code when clicked. Do NOT ask the reader to manually type any code.';
    const educationNote = postMode === 'education'
        ? 'This is an educational post — lead with genuine trading knowledge. The referral is a soft CTA at the end only, not the focus.'
        : 'This is a referral post — prominently feature the referral link and free trial offer.';

    const base = `Tone: ${toneGuide[templateStyle]}\n${educationNote}\n${linkNote}\n${complianceNote}`;

    const prompts: Record<SocialPlatform, string> = {
        linkedin: `You are a professional LinkedIn content writer specializing in fintech and AI trading.
Write a LinkedIn post for a TradeMind.bot user${postMode === 'education' ? ' sharing trading education' : ' promoting TradeMind.bot (AI-powered options trading signals)'}.
- Start with a strong, curiosity-driven hook
- ${postMode === 'education' ? 'Share 2-3 specific insights about options trading, AI signals, or market strategy' : 'Share 2-3 value points about TradeMind features (AI signals, options strategies, real-time alerts)'}
- Include the full referral link naturally in the body
- End with a ${postMode === 'education' ? 'soft' : 'clear'} CTA
- Use 2-4 hashtags: #OptionsTrading #Fintech #TradeMind #AITrading
- 200-400 words, formatted with line breaks
${base}`,

        twitter: `You are a punchy Twitter/X copywriter for fintech content.
Write a tweet for a TradeMind.bot user (AI options trading signals).
- MUST be under 240 characters including the link
- Start with a hook: surprising stat, bold claim, or relatable pain point
- Include the full referral link (it auto-applies the free trial)
- Max 2 hashtags: #OptionsTrading #TradeMind
${base}`,

        facebook: `You are a conversational Facebook content writer for a fintech community.
Write a Facebook post for a TradeMind.bot user${postMode === 'education' ? ' sharing trading knowledge' : ' promoting TradeMind.bot'}.
- Open like a personal story or update
- ${postMode === 'education' ? 'Share genuine trading insight or lesson learned' : 'Describe how TradeMind helped your trading decisions'}
- Include the full referral link and mention the free trial
- 150-300 words, 2-3 emojis, friendly tone
${base}`,

        instagram: `You are an Instagram caption writer for a fintech trading account.
Write an Instagram caption for a post about ${postMode === 'education' ? 'options trading / AI signals (educational)' : 'TradeMind.bot (AI options trading signals)'}.
- IMPORTANT: Instagram doesn't support clickable links in captions — say "Link in bio 🔗" and mention the free trial code
- Strong hook line first (critical on IG — first line must grab attention)
- Use emojis throughout to break up text
- 5-8 hashtags at END: #OptionsTrading #Fintech #TradeMind #StockMarket #TradingSignals #AITrading #InvestSmart
- 100-200 words body
IMPORTANT: This will be posted with a user-provided image. Write caption only.
${base}`,

        tiktok: `You are a TikTok script writer for fintech content targeting Gen Z traders.
Write a TikTok video script for a ${postMode === 'education' ? 'financial education' : 'TradeMind.bot referral'} video.
Format — write BOTH:
1. SPOKEN SCRIPT (3-5 sentences): What the creator says on camera.
   Use: "POV:", "Not gonna lie...", "Here's the thing...", "If you trade options..."
   ${postMode === 'education' ? 'Teach one concrete trading concept (e.g. how to read a signal, what IV crush means)' : 'Mention trademind.bot and the free trial'}
   End with: "Link in my bio — [referral link]"
2. CAPTION (under 150 chars): Actual TikTok caption with hashtags
   Include: #FinTok #TradingTips #OptionsTrading #TradeMind #StockTok
Label both clearly as "SPOKEN SCRIPT:" and "CAPTION:"
${base}`,

        snapchat: `You are a Snapchat Story content creator for a fintech brand.
Write a short, punchy Snapchat text overlay script for a ${postMode === 'education' ? 'trading tip' : 'TradeMind.bot promotion'}.
This text overlays an image or video snap — keep it very short (2-3 lines max).
${postMode === 'education' ? 'Share one quick trading tip or insight.' : 'Hook → value → "try trademind.bot free"'}
Include a couple energetic emojis. Gen Z friendly.
${base}`,

        reddit: `You are an experienced Redditor participating in investing and options trading communities.
Write a Reddit post ${postMode === 'education' ? 'sharing options trading insights or a genuine market analysis' : 'discussing TradeMind.bot AI options signals'}.
- Sound authentic to Reddit: analytical, evidence-based, not salesy
- ${postMode === 'education' ? 'Lead with genuine value — teach something real about options, AI signals, or trading strategy' : 'Focus on technical merits of AI-powered options signals'}
- Include the full referral link naturally
- Format with Reddit markdown (bold, bullet points where helpful)
- Write a good title AND post body
${base}`,

        youtube: `You are a YouTube finance creator writing a video description.
Write a YouTube video description for a ${postMode === 'education' ? 'trading education video' : 'TradeMind.bot review/walkthrough video'}.
- Strong hook in first 2 lines (above "Show More" fold)
- ${postMode === 'education' ? 'Explain what the video teaches about options/AI trading' : 'Describe TradeMind features and results'}
- Include referral link clearly: "Try TradeMind free → [link]"
- 3-5 relevant hashtags at bottom
- SEO-optimized for: "AI options trading, TradeMind, options signals, algorithmic trading"
${base}`,
    };

    return `${languageDirective}${prompts[platform]}`;
}

// ── Tool Parameters ───────────────────────────────────────────────────────────

/**
 * Build Composio tool parameters for direct posting.
 * metadata: platform-specific stored values (page_id, ig_user_id, subreddit, etc.)
 */
export function buildToolParams(
    platform: SocialPlatform,
    postContent: string,
    metadata?: Record<string, string>
): Record<string, unknown> {
    switch (platform) {
        case 'linkedin':
            return { text: postContent, visibility: 'PUBLIC' };

        case 'twitter':
            return { text: postContent };

        case 'facebook':
            return {
                page_id: metadata?.page_id ?? '',  // Required — fetched on OAuth connection
                message: postContent,
            };

        case 'reddit':
            return {
                subreddit: metadata?.subreddit ?? 'stocks',
                title: metadata?.reddit_title ?? 'My experience with AI-powered options signals',
                text: postContent,
            };

        case 'instagram':
            // Step 1 of 2-step flow: create media container
            // Step 2 (INSTAGRAM_CREATE_POST) is called after polling container status
            return {
                ig_user_id: metadata?.ig_user_id ?? '',
                image_url: metadata?.image_url ?? '',  // Public HTTPS URL required
                caption: postContent,
            };

        default:
            throw new Error(`Platform "${platform}" does not support direct posting via Composio`);
    }
}
