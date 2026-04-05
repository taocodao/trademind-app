/**
 * Composio SDK Utilities
 * Singleton client + platform configuration for the TradeMind social referral system.
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

export type SocialPlatform = 'linkedin' | 'twitter' | 'facebook' | 'instagram' | 'tiktok';

/**
 * Platform → Composio Auth Config ID mapping.
 * These env vars are set per-platform in the Composio dashboard → Auth Configs.
 */
export const COMPOSIO_AUTH_CONFIGS: Record<SocialPlatform, string> = {
    linkedin:  process.env.COMPOSIO_AUTH_CONFIG_LINKEDIN  ?? '',
    twitter:   process.env.COMPOSIO_AUTH_CONFIG_TWITTER   ?? '',
    facebook:  process.env.COMPOSIO_AUTH_CONFIG_FACEBOOK  ?? '',
    instagram: process.env.COMPOSIO_AUTH_CONFIG_INSTAGRAM ?? '',
    tiktok:    '', // TikTok is clipboard-only — no Composio auth needed
};

/**
 * Platform → Composio tool action slug for direct posting.
 */
export const PLATFORM_TOOL_SLUGS: Record<SocialPlatform, string> = {
    linkedin:  'LINKEDIN_CREATE_LINKEDIN_POST',
    twitter:   'TWITTER_CREATE_TWEET',
    facebook:  'FACEBOOK_CREATE_POST',
    instagram: 'INSTAGRAM_CREATE_POST',
    tiktok:    '', // Clipboard-only
};

/**
 * Platform constraints for post generation.
 */
export const PLATFORM_CONSTRAINTS: Record<SocialPlatform, {
    maxChars: number;
    supportsLinks: boolean;
    supportsHashtags: boolean;
    supportsDirectPost: boolean;
}> = {
    linkedin:  { maxChars: 3000,  supportsLinks: true,  supportsHashtags: true,  supportsDirectPost: true },
    twitter:   { maxChars: 280,   supportsLinks: true,  supportsHashtags: true,  supportsDirectPost: true },
    facebook:  { maxChars: 63206, supportsLinks: true,  supportsHashtags: true,  supportsDirectPost: true },
    instagram: { maxChars: 2200,  supportsLinks: false, supportsHashtags: true,  supportsDirectPost: true },
    tiktok:    { maxChars: 2200,  supportsLinks: false, supportsHashtags: true,  supportsDirectPost: false },
};

/**
 * Platforms that support Composio direct posting.
 * TikTok is excluded (video-only API, clipboard approach used instead).
 */
export const DIRECT_POST_PLATFORMS: SocialPlatform[] = ['linkedin', 'twitter', 'facebook', 'instagram'];

/**
 * Platform-specific system prompts for OpenAI post generation.
 * Each includes a mandatory "Not financial advice." compliance disclaimer.
 */
export const PLATFORM_SYSTEM_PROMPTS: Record<SocialPlatform, string> = {
    linkedin: `You are a professional LinkedIn content writer specializing in fintech and trading.
Write a LinkedIn post for a user promoting TradeMind.bot, an AI-powered options trading signal platform.
The post should:
- Start with a strong, curiosity-driven hook about trading results or insights
- Share 2-3 specific value points about TradeMind's features (AI signals, options strategies, real-time alerts)
- Include the referral link and promo code naturally in the body
- End with a professional CTA to sign up
- Use 2-4 relevant hashtags: #OptionsTrading #Fintech #TradeMind #AITrading
- Be 200-400 words, formatted with line breaks for readability
- Tone: professional but approachable, first-person experience
- IMPORTANT: Always include the disclaimer "Not financial advice." at the end`,

    twitter: `You are a punchy Twitter/X copywriter for fintech content.
Write a tweet promoting TradeMind.bot (AI options trading signals).
Rules:
- MUST be under 250 characters (leave room for the link)
- Start with a hook: a surprising stat, bold claim, or relatable pain point
- Include the promo code inline, e.g. "Use code ALPHA49 for 14 days free"
- Max 2 hashtags: #OptionsTrading #TradeMind
- Casual, Gen Z-friendly tone
- End with the referral link
- Add: "Not financial advice."
Keep it punchy — cut every word that isn't earning its place.`,

    facebook: `You are a conversational Facebook post writer for a fintech trading app.
Write a Facebook post promoting TradeMind.bot (AI-powered options trading signals).
The post should:
- Open like a story or personal update ("I've been using this for 3 months...")
- Describe how TradeMind helped with trading decisions
- Include the referral link and mention the promo code clearly
- Be friendly, human, slightly casual — like a post from a friend
- 150-300 words
- Include 2-3 emojis naturally placed
- End with a clear CTA and the promo code
- Add: "Not financial advice." at the end`,

    instagram: `You are an Instagram caption writer for a fintech trading brand.
Write an Instagram caption promoting TradeMind.bot (AI options trading signals).
Rules:
- Note: Instagram captions don't support clickable links — instead say "Link in bio" and mention the promo code
- Start with a single strong hook line (the first line is critical on IG)
- Use emojis throughout to break up text
- 5-8 relevant hashtags at the END of the caption: #OptionsTrading #Fintech #TradeMind #StockMarket #TradingSignals #AITrading #InvestSmart
- 100-200 words of caption body
- Clear CTA: "Sign up at the link in bio — use code [PROMO CODE] for free days!"
- Add: "Not financial advice." near the end`,

    tiktok: `You are a TikTok script writer for fintech content targeting Gen Z.
Write a TikTok video caption/script for promoting TradeMind.bot (AI options trading signals).
Format: Write TWO things:
1. SPOKEN SCRIPT (3-5 sentences) — What the creator says on camera.
   Use TikTok speech patterns: "POV:", "Not gonna lie...", "Here's the thing...", "If you're into trading..."
   Include the promo code naturally: "Go to trademind.bot and use code [PROMO CODE]"
2. CAPTION (under 150 chars) — The actual TikTok post caption with hashtags
   Include: #FinTok #TradingTips #OptionsTrading #TradeMind #StockTok
Label them clearly as "SPOKEN SCRIPT:" and "CAPTION:"
Tone: raw, authentic, direct — like a Gen Z creator talking to camera, not an ad.
Add: "Not financial advice." to the spoken script.`,
};

/**
 * Build the tool parameters for a Composio direct post action.
 */
export function buildToolParams(platform: SocialPlatform, postContent: string): Record<string, unknown> {
    switch (platform) {
        case 'linkedin':
            return { text: postContent, visibility: 'PUBLIC' };
        case 'twitter':
            return { text: postContent };
        case 'facebook':
            return { message: postContent };
        case 'instagram':
            return { caption: postContent, media_type: 'IMAGE' };
        default:
            throw new Error(`Platform "${platform}" does not support direct posting`);
    }
}
