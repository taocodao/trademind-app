import OpenAI from 'openai';
import { Platform, Tone, Theme, PostGenerationContext } from './types';
import { SYSTEM_PROMPTS, TONE_MODIFIERS, buildUserPrompt } from './prompts';
import { enforceCompliance, hasCompliance } from './compliance';

const perplexityClient = new OpenAI({
  apiKey: process.env.PERPLEXITY_API_KEY,
  baseURL: 'https://api.perplexity.ai',
});

function parseVariations(raw: string): string[] {
  // Split on --- separator (as instructed in system prompt)
  const parts = raw
    .split(/\n---\n|^---$/m)
    .map((s) => s.trim())
    .filter(Boolean);

  // Fallback: if only 1 block returned, duplicate with slight variance note
  if (parts.length === 1) {
    return [parts[0], parts[0], parts[0]];
  }

  return parts.slice(0, 3);
}

export async function generatePostVariations(
  platform: Platform,
  tone: Tone,
  theme: Theme,
  ctx: PostGenerationContext,
  customThemeText?: string
): Promise<{ variations: string[]; complianceStatus: boolean[] }> {
  const systemPrompt = SYSTEM_PROMPTS[platform];
  const toneModifier = TONE_MODIFIERS[tone];
  const userPrompt = buildUserPrompt(theme, tone, ctx, customThemeText);

  const response = await perplexityClient.chat.completions.create({
    model: 'sonar-pro',
    messages: [
      { role: 'system', content: `${systemPrompt}\n\nTone: ${toneModifier}` },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.8,
    max_tokens: 800,
  });

  const rawContent = response.choices[0]?.message?.content ?? '';
  const rawVariations = parseVariations(rawContent);

  // Enforce compliance on each variation
  const variations = rawVariations.map((v) => enforceCompliance(v, platform));
  const complianceStatus = variations.map(hasCompliance);

  return { variations, complianceStatus };
}
