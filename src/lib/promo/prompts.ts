import { Platform, Theme, Tone, PostGenerationContext } from './types';

// ── System Prompts ──────────────────────────────────────────────────────────

export const SYSTEM_PROMPTS: Record<Platform, string> = {
  tiktok: `You write TikTok captions for finance content targeting Gen Z.
Max 150 characters for the main caption. Use 2-3 relevant emojis.
Tone is real, punchy, and personal — like texting a smart friend.
ALWAYS end with the user's promo code and trademind.bot URL.
ALWAYS include "Not financial advice" or "NFA" — this is mandatory.
Write 3 distinct variations separated by "---".`,

  discord: `You write Discord community posts for trading servers.
Max 300 characters. Use Discord formatting (**bold**, emojis).
Professional but friendly. Always include a referral link placeholder [REFERRAL_CODE].
ALWAYS include "Not financial advice" disclaimer.
Write 3 distinct variations separated by "---".`,

  whop: `You write Whop product reviews and community posts.
150-250 words. Authentic, specific, data-focused tone.
Reference real TradeMind features: backtest stats (27.8% CAGR, 86% win rate),
chatbot commands (!signal, !regime, !backtest), morning brief, regime detection.
End with star rating recommendation (5 stars).
Include "Not financial advice" disclaimer.
Write 3 distinct variations separated by "---".`,

  twitter: `You write X/Twitter posts for retail investors.
Max 280 characters including hashtags.
Use 2 hashtags max: #FinTok #TradingSignals.
Include promo code visually prominent.
MANDATORY: include "NFA" in the post.
Write 3 distinct variations separated by "---".`,

  instagram: `You write Instagram captions for finance content.
125-200 characters above the fold.
5-8 hashtags after a line break.
Reference the promo code for Stories.
Include "Not financial advice" disclaimer.
Write 3 distinct variations separated by "---".`,

  linkedin: `You write LinkedIn posts for professional investors.
150-300 words. Professional but accessible.
Lead with genuine insight, end with soft CTA and referral code.
Include full disclaimer: "Not financial advice. Past performance does not guarantee future results."
Write 3 distinct variations separated by "---".`,
};

// ── Tone Modifiers ──────────────────────────────────────────────────────────

export const TONE_MODIFIERS: Record<Tone, string> = {
  educational: 'Write in an educational, informative tone. Explain clearly and add context.',
  'high-energy': 'Write with high energy and urgency. Create FOMO without being reckless.',
  'calm-data': 'Write in a calm, data-driven tone. Let the numbers speak for themselves.',
  conversational: 'Write in a conversational, personal tone. First-person perspective.',
  'skeptic-believer': 'Write from the perspective of someone who was skeptical but is now a believer. Include the journey.',
  technical: 'Write in a technical, analytical tone. Include specific metrics and methodology.',
  beginner: 'Write for complete beginners. No jargon. Make it simple and approachable.',
};

// ── Theme-to-User-Prompt Mapping ────────────────────────────────────────────

export const THEME_PROMPTS: Record<Theme, string> = {
  'backtest-story':
    "Write about TurboCore's 7-year backtest: 27.8% CAGR, 86% win rate, max drawdown -5.1%, 2022 stress test (-11% vs TQQQ -83%). Focus on the data story.",
  'regime-signal':
    "Write about today's TurboCore regime signal feature: BULL/BEAR/SIDEWAYS daily call at 3 PM ET with exact QQQ/QLD/TQQQ/SGOV allocations.",
  'genz-wealth':
    "Write about compound growth: $5,000 at 19 growing at 27.8% CAGR to $1M by age 36. Compare to S&P 500 at 10%.",
  'stress-test-2022':
    'Write specifically about the 2022 bear market: TurboCore -11%, QQQ -33%, TQQQ -83%. The regime detection rotated to SGOV T-bills early.',
  'chatbot-demo':
    'Write about the live chatbot in the Whop community. Commands: !signal, !regime, !backtest, !plan, !help. Bot responds with live DB data instantly.',
  'authentic-review':
    'Write an authentic personal review after using TradeMind for [DAYS] days. Include specific features used, what impressed you, and one data point.',
  'proved-right':
    "Write about a case where TurboCore's signal correctly predicted the market direction. Mention the regime called, the outcome, and what that means for members.",
  'proved-wrong':
    "Write honestly about a day TurboCore's signal was cautious and the market moved against it. Explain the ML model's reasoning for that regime call.",
  'beginners-intro':
    "Write for someone who has never heard of algorithmic trading. Explain TradeMind's regime detection in simple terms. Focus on the $15 trial as a low-risk way to try it.",
  'leaps-education':
    'Write about QQQ LEAPS signals (long-dated options). Explain how the IV-Switch alerts work for timing options entry/exit. Bundle tier only.',
  'community-spotlight':
    'Write about the TradeMind community: the morning brief, Discord/Whop chatbot, ambassador program, and the culture of data-driven investing.',
  custom: '', // filled at runtime
};

// ── Prompt Builder ──────────────────────────────────────────────────────────

export function buildUserPrompt(
  theme: Theme,
  tone: Tone,
  ctx: PostGenerationContext,
  customThemeText?: string
): string {
  let basePrompt =
    theme === 'custom' && customThemeText
      ? `Write about: ${customThemeText}`
      : THEME_PROMPTS[theme];

  // Inject personalization
  if (ctx.daysAsMember) {
    basePrompt = basePrompt.replace('[DAYS]', String(ctx.daysAsMember));
  } else {
    basePrompt = basePrompt.replace('[DAYS]', '30');
  }

  const toneInstruction = `\n\nTone instruction: ${TONE_MODIFIERS[tone]}`;

  const personalization: string[] = [];
  if (ctx.referralCode) personalization.push(`Ambassador referral code: ${ctx.referralCode}`);
  if (ctx.daysAsMember) personalization.push(`Member for: ${ctx.daysAsMember} days`);
  if (ctx.personalNote) personalization.push(`Personal observation: ${ctx.personalNote}`);

  const personalSection =
    personalization.length > 0
      ? `\n\nPersonalization context:\n${personalization.join('\n')}`
      : '';

  return basePrompt + toneInstruction + personalSection;
}
