import { Platform } from './types';

const SHORT_DISCLAIMER = 'NFA. Past performance ≠ future results.';
const FULL_DISCLAIMER =
  'Not financial advice. Past performance does not guarantee future results.';

const SHORT_PLATFORMS: Platform[] = ['tiktok', 'twitter'];

export function enforceCompliance(post: string, platform: Platform): string {
  const lower = post.toLowerCase();
  const hasCompliance =
    lower.includes('not financial advice') ||
    lower.includes('nfa') ||
    lower.includes('past performance');

  if (!hasCompliance) {
    const disclaimer = SHORT_PLATFORMS.includes(platform)
      ? SHORT_DISCLAIMER
      : FULL_DISCLAIMER;
    return `${post}\n\n${disclaimer}`;
  }
  return post;
}

export function hasCompliance(post: string): boolean {
  const lower = post.toLowerCase();
  return (
    lower.includes('not financial advice') ||
    lower.includes('nfa') ||
    lower.includes('past performance')
  );
}
