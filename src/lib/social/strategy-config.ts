/**
 * TradeMind Social Content Strategy Config
 * Derived from Perplexity deep research — TradeMind Social Content Strategy.md
 *
 * Governs: template preference, tone, length, hashtags, emoji level,
 * CTA format, disclaimer, and system prompt injection per channel.
 */

export type SocialPlatform =
    | 'linkedin' | 'twitter' | 'facebook' | 'instagram'
    | 'tiktok' | 'reddit' | 'youtube' | 'snapchat';

export type TemplateId = 'campaign' | 'results' | 'education' | 'casual';
export type ToneId     = 'professional' | 'punchy' | 'casual';
export type EmojiLevel = 'none' | 'low' | 'medium' | 'high';

export interface ChannelStrategy {
    /** Best template for referral content on this channel */
    bestTemplate:   TemplateId;
    /** Second-best template for A/B testing */
    altTemplate:    TemplateId;
    /** Best tone for this channel */
    bestTone:       ToneId;
    /** Optimal character range (target, not hard limit) */
    optimalChars:   { min: number; max: number };
    /** Number of hashtags to append */
    hashtagCount:   number;
    /** Hashtags to use (fintech-specific, 2025 validated) */
    hashtags:       string[];
    /** Emoji density guidance */
    emojiLevel:     EmojiLevel;
    /** How to present the CTA */
    ctaFormat:      string;
    /** Where to place the referral link */
    linkPlacement:  'end' | 'comment' | 'bio' | 'description' | 'dm_only';
    /** Disclaimer to append to every generated post */
    disclaimer:     string;
    /** Algorithm-specific writing notes injected into system prompt */
    writingNotes:   string;
    /** Whether this channel supports direct clickable links in posts */
    supportsLinks:  boolean;
    /** Reddit-specific: use promo code instead of referral URL */
    usePromoCode?:  boolean;
}

// ── Short disclaimer aliases ────────────────────────────────────────────────
const DISCLAIMER_SHORT  = 'Not financial advice. Past performance does not guarantee future results.';
const DISCLAIMER_MEDIUM = 'For educational purposes only. Not financial advice. All trading involves risk. Past results, including backtested figures, do not guarantee future results.';
const DISCLAIMER_REDDIT = 'Disclosure: I am affiliated with TradeMind.bot. The 39% CAGR is a 7-year backtest (2017–2024), not live results. Backtested figures do not account for all market conditions. Not financial advice.';

// ── Master strategy config ──────────────────────────────────────────────────
export const CHANNEL_STRATEGY: Record<SocialPlatform, ChannelStrategy> = {

    linkedin: {
        bestTemplate:  'results',
        altTemplate:   'campaign',
        bestTone:      'professional',
        optimalChars:  { min: 1242, max: 2500 },
        hashtagCount:  0, // 2025 audit: hashtags may reduce reach up to 81% — default 0; A/B test vs 2-3
        hashtags:      ['#AlgoTrading', '#StockMarket', '#InvestingTips'],
        emojiLevel:    'low',
        ctaFormat:     'Start your free trial → [URL]',
        linkPlacement: 'end',
        disclaimer:    DISCLAIMER_MEDIUM,
        supportsLinks: true,
        writingNotes: `
LinkedIn: Data-driven, expertise-first content. Senior financial professionals prefer concise, high-value posts (300–500 words = 1,242–2,500 chars).
Structure: Hook (one surprising stat) → Context (what it means) → Mechanism (how the system works, no jargon) → Proof (backtest data with disclaimer) → Soft CTA at end.
Line breaks every 1–2 sentences improve dwell time. No marketing-speak. Write like a practitioner, not a promoter.
Algorithm: Strong engagement in the first hour amplifies to 2nd/3rd-degree connections. Comments > likes. Relevance > recency.
CTA: Place URL at the very end. Starting with or embedding links early penalizes reach.
Label 39% CAGR explicitly as "7-year backtest" every time. Append disclaimer at end.
DO NOT use hashtags by default (test separately).
`.trim(),
    },

    twitter: {
        bestTemplate:  'results',
        altTemplate:   'casual',
        bestTone:      'punchy',
        optimalChars:  { min: 71, max: 140 }, // single tweet; for threads, each tweet 100–240 chars
        hashtagCount:  1,
        hashtags:      ['#FinTwit'],
        emojiLevel:    'low',
        ctaFormat:     'Free trial: [URL]',
        linkPlacement: 'end',
        disclaimer:    DISCLAIMER_SHORT,
        supportsLinks: true,
        writingNotes: `
X/Twitter: Speed and impact. Single tweets should be 71–140 characters for maximum retweet rate. For depth, write a 3–5 tweet thread (70–80% completion rate).
Thread structure: Tweet 1 (stat hook) → Tweet 2 (context) → Tweet 3 (mechanism) → Tweet 4 (proof with disclaimer) → Tweet 5 (free trial URL + "Not financial advice").
Every URL counts as exactly 23 characters regardless of actual length.
Algorithm: Replies, retweets, bookmarks in first 30–60 min drive reach. Avoid "Comment YES" engagement bait.
External links carry slight reach penalty — consider placing URL in first reply for threads, mention it in Tweet 5 body.
Example hook: "In 2022, QQQ was down 33%. One backtested algo was up +21.4%. Here's how. 🧵"
Tone: short sentences, stat-first, zero filler words.
`.trim(),
    },

    facebook: {
        bestTemplate:  'casual',
        altTemplate:   'education',
        bestTone:      'casual',
        optimalChars:  { min: 40, max: 80 }, // under 80 chars = 66% more engagement; 477 before truncation
        hashtagCount:  0,
        hashtags:      ['#Investing', '#StockMarket'],
        emojiLevel:    'medium',
        ctaFormat:     'Try it free → [URL]',
        linkPlacement: 'comment', // Place link in FIRST COMMENT of your own post to avoid algo penalty
        disclaimer:    DISCLAIMER_MEDIUM,
        supportsLinks: true,
        writingNotes: `
Facebook: Discovery channel — up to 50% of feed is from accounts users don't follow (interest-based algo, 2024–2025).
Optimal post: under 80 characters for text posts (66% more engagement). Keep it punchy, personal, and question-driven.
Place the referral URL in the FIRST COMMENT of your own post — not the post body. Facebook's algorithm demotes posts with external links in the body. Mention this in the post: "Link in first comment 👇"
Reels get a 50% algorithmic boost. For video content, keep to 15–30 seconds.
Tone: personal story, "has this happened to you?", conversational. Avoid anything that sounds branded or scripted.
Authentic questions generate comments; comments are the highest-value signal.
Emoji usage: 2–5 structural emojis boost engagement. 57% higher engagement documented for posts with emojis.
Backtested performance claims: Must include "results may vary" or equivalent per Meta policy.
`.trim(),
    },

    instagram: {
        bestTemplate:  'education',
        altTemplate:   'campaign',
        bestTone:      'punchy',
        optimalChars:  { min: 800, max: 1500 }, // carousel/educational captions for saves
        hashtagCount:  7,
        hashtags:      [
            '#AlgoTrading', '#OptionsTrading', '#TradingSignals',
            '#TechnicalAnalysis', '#StockTrading', '#InvestingTips', '#StockMarket',
        ],
        emojiLevel:    'medium',
        ctaFormat:     'Free trial — link in bio 👆',
        linkPlacement: 'bio',
        disclaimer:    DISCLAIMER_MEDIUM,
        supportsLinks: false, // URLs in captions are not clickable
        writingNotes: `
Instagram: Save-optimized content wins. Saves and shares carry triple the weight of likes.
Best format: Carousel (6 slides). Structure: Slide 1 hook → Slides 2–5 education → Slide 6 CTA.
Example carousel: "3 things your brokerage won't tell you about market regimes"
Caption: First 125 characters MUST hook before truncation (the "more" tap). Write the hook before anything else.
For feed posts: 138–150 characters optimal for highest like-to-impression ratio.
For educational carousels: 800–1,500 characters for maximum saves.
URLs in captions are NOT clickable. CTA must say "link in bio 👆" — never include raw URL in caption.
Hashtags: Place in FIRST COMMENT (not caption) — equal reach, cleaner caption. Use 5–10 niche-specific tags.
Keywords in captions now matter more than hashtags for search discovery (treat like SEO).
Emojis: 5–10, used for visual structure and emotion. Avoid financial-gain emojis (🚀💰📈 in combination).
Disclaimer must appear in caption body, below the hook/story section.
`.trim(),
    },

    tiktok: {
        bestTemplate:  'casual',
        altTemplate:   'education',
        bestTone:      'casual',
        optimalChars:  { min: 50, max: 150 }, // caption; longer 200-400 for TikTok SEO
        hashtagCount:  4,
        hashtags:      ['#FinTok', '#TradingStrategy', '#StockMarket', '#AlgoTrading'],
        emojiLevel:    'medium',
        ctaFormat:     'Link in bio for your free trial 🔗',
        linkPlacement: 'bio',
        disclaimer:    DISCLAIMER_SHORT,
        supportsLinks: false, // captions don't support clickable URLs; bio only
        writingNotes: `
TikTok: Entertainment-first. The algorithm uses completion rate and re-watches — hook in the first 3 seconds is everything.
The CAPTION is secondary to video — write it as a support, not the main content.
Caption optimal: 50–150 characters. For TikTok SEO (content categorization): 200–400 characters is acceptable.
URLs in captions are NOT clickable. CTA must say "link in bio" — direct users to profile bio.
Video hook example: "POV: You check your QQQ position in 2022..." [reaction/screen recording]
Video length: 15–30 seconds for maximum reach; 60+ seconds for educational content.
Language: Zero jargon. If a stranger with no trading knowledge doesn't understand in 5 seconds, rewrite it.
Personal story format: "Here's what I use → it said BEAR for most of 2022 → I stayed hedged → +21% that year."
Tone: casual, first-person, reactive. No branded language, no polished scripts — authentic wins.
State "not financial advice" verbally in the video AND in the caption.
`.trim(),
    },

    reddit: {
        bestTemplate:  'education',
        altTemplate:   'education', // Education only — no other templates viable
        bestTone:      'casual',
        optimalChars:  { min: 1500, max: 2500 }, // 300–500 words body
        hashtagCount:  0, // Reddit uses no hashtags
        hashtags:      [],
        emojiLevel:    'low',
        ctaFormat:     'Happy to share more — DM me',
        linkPlacement: 'dm_only',
        disclaimer:    DISCLAIMER_REDDIT,
        supportsLinks: false, // Referral links BANNED in r/stocks, r/options, r/algotrading, r/investing
        usePromoCode:  true,  // Promo codes safer than tracked URLs if any link must appear
        writingNotes: `
Reddit: EDUCATION ONLY. Referral links are explicitly banned in r/stocks, r/options, r/algotrading, and r/investing.
DO NOT include any referral URL in the post body. DO NOT mention TradeMind by name in a promotional way.
Write as a community member sharing knowledge, not as a founder promoting a product.
Post format: ALWAYS text post (not link post) — link posts are auto-removed. Use correct flair (Education, Discussion, DD).
Title must be value-first: "How HMM regime detection works — explained with real examples" (no product pitch in title).
Body structure: Concept explanation → Real example (2022 market crash) → Question to community → [Optional: "I've been working on something related — DM if curious"]
If you include any link or promo code: add the full Reddit disclosure at the END.
Tone: Write exactly like a community member. Marketing-speak triggers instant downvotes. No buzzwords.
Reddit 9:1 rule: Account must have 90%+ non-promotional activity before any self-reference is acceptable.
NO hashtags. NO emojis except 0–2 maximum — heavy emoji use signals spam.
`.trim(),
    },

    youtube: {
        bestTemplate:  'results',
        altTemplate:   'education',
        bestTone:      'professional',
        optimalChars:  { min: 150, max: 300 }, // community posts; Shorts: 50–100
        hashtagCount:  3,
        hashtags:      ['AlgoTrading', 'TradingStrategy', 'StockMarket'], // embedded as keywords, not #hashtags
        emojiLevel:    'low',
        ctaFormat:     'Free trial link in description below ↓',
        linkPlacement: 'description',
        disclaimer:    DISCLAIMER_MEDIUM,
        supportsLinks: true,
        writingNotes: `
YouTube: Two content types — Community Posts and Shorts.
COMMUNITY POSTS (best for Results template): 150–300 characters with a chart image attached.
  Post backtest charts, weekly signal outcomes, performance recaps. Professional tone. Link in description.
  Subscribers engage directly; this builds trust with an existing audience.
SHORTS (best for Education template): Caption 50–100 characters. Video carries the content.
  Shorts engagement rate: 5.91% — highest of any short-form platform (beats TikTok 5.75%, Reels 5.53%).
  70% of viewers watch muted — always include captions ON the video.
  Videos must work fully without sound.
Algorithm: Full watch-through % determines push. Content must justify every second.
Mention the referral link verbally: "Free trial link in the description below."
Place URL as the FIRST line of the description for maximum visibility.
`.trim(),
    },

    snapchat: {
        bestTemplate:  'casual',
        altTemplate:   'education',
        bestTone:      'casual',
        optimalChars:  { min: 80, max: 200 }, // Story/Spotlight caption
        hashtagCount:  0,
        hashtags:      [],
        emojiLevel:    'high',
        ctaFormat:     'Swipe up or check my bio for a free trial 🔗',
        linkPlacement: 'bio',
        disclaimer:    DISCLAIMER_SHORT,
        supportsLinks: false, // Spotlight has no comment section; links only via Stories or bio
        writingNotes: `
Snapchat: Spotlight is fully algorithmic — no followers needed for reach. Content distributed by view time and shares.
Spotlight minimum: 60 seconds to qualify for revenue program. Stories require existing followers.
Caption: 100–250 characters. High emoji use is culturally expected — this is the one platform where 5–10 emojis is normal.
No comment section on Spotlight — engagement is view-based only.
Finance content is rare on Snapchat → lower competition but also lower audience intent.
Tone: extremely casual, vlog-style, no professional language whatsoever.
CTA: Verbal "check my bio link" in the video + written caption. Bio link is the only clickable option.
Avoid financial-gain emoji combos (🚀💰📈) — can be perceived as implying gains.
Disclaimer must appear in caption due to FTC rules, but keep it ultra-brief: "Not financial advice."
`.trim(),
    },
};

// ── Helper: get the research-recommended default template + tone for a channel ──
export function getChannelDefaults(platform: SocialPlatform): { template: TemplateId; tone: ToneId } {
    const s = CHANNEL_STRATEGY[platform];
    return { template: s.bestTemplate, tone: s.bestTone };
}

// ── All permutations for bulk generation ─────────────────────────────────────
export const ALL_PLATFORMS: SocialPlatform[] = [
    'linkedin', 'twitter', 'facebook', 'instagram',
    'tiktok', 'reddit', 'youtube', 'snapchat',
];
export const ALL_TEMPLATES: TemplateId[] = ['campaign', 'results', 'education', 'casual'];
export const ALL_TONES: ToneId[]         = ['professional', 'punchy', 'casual'];
