export type Platform = 'tiktok' | 'discord' | 'whop' | 'twitter' | 'instagram' | 'linkedin';

export type Tone =
  | 'educational'
  | 'high-energy'
  | 'calm-data'
  | 'conversational'
  | 'skeptic-believer'
  | 'technical'
  | 'beginner';

export type Theme =
  | 'backtest-story'
  | 'regime-signal'
  | 'genz-wealth'
  | 'stress-test-2022'
  | 'chatbot-demo'
  | 'authentic-review'
  | 'proved-right'
  | 'proved-wrong'
  | 'beginners-intro'
  | 'leaps-education'
  | 'community-spotlight'
  | 'custom';

export interface PostGenerationContext {
  referralCode?: string;
  daysAsMember?: number;
  personalNote?: string;
}

export interface GeneratePostRequest {
  platform: Platform;
  theme: Theme;
  tone: Tone;
  customThemeText?: string;
  referralCode?: string;
  daysAsMember?: number;
  personalNote?: string;
}

export interface GeneratePostResponse {
  variations: string[];
  platform: Platform;
  theme: Theme;
  tone: Tone;
  timestamp: string;
  complianceStatus: boolean[];
}

export interface SavedPost {
  id: number;
  userId: string;
  platform: Platform;
  theme: Theme;
  tone: Tone;
  postContent: string;
  referralCode?: string;
  charCount: number;
  savedToLibrary: boolean;
  complianceVerified: boolean;
  createdAt: string;
  label?: string;
}

export interface AdminStats {
  totalGenerated: number;
  byPlatform: Record<Platform, number>;
  byTheme: Record<Theme, number>;
  recentActivity: {
    userId: string;
    platform: Platform;
    theme: Theme;
    createdAt: string;
    charCount: number;
  }[];
}

export const PLATFORM_LABELS: Record<Platform, string> = {
  tiktok: 'TikTok',
  discord: 'Discord',
  whop: 'Whop',
  twitter: 'Twitter / X',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
};

export const PLATFORM_CHAR_LIMITS: Record<Platform, number> = {
  tiktok: 150,
  discord: 300,
  whop: 1500,
  twitter: 280,
  instagram: 2200,
  linkedin: 3000,
};

export const THEME_LABELS: Record<Theme, string> = {
  'backtest-story': 'Backtest Story',
  'regime-signal': 'Regime Signal Reveal',
  'genz-wealth': 'Gen Z Wealth Math',
  'stress-test-2022': '2022 Stress Test',
  'chatbot-demo': 'Chatbot Demo',
  'authentic-review': 'Authentic Review',
  'proved-right': 'Proved Right',
  'proved-wrong': 'Proved Wrong',
  'beginners-intro': "Beginner's Intro",
  'leaps-education': 'LEAPS Education',
  'community-spotlight': 'Community Spotlight',
  custom: 'Custom…',
};

export const TONE_LABELS: Record<Tone, { label: string; emoji: string }> = {
  educational: { label: 'Educational / Informative', emoji: '📚' },
  'high-energy': { label: 'High Energy / FOMO', emoji: '🔥' },
  'calm-data': { label: 'Calm / Data-Driven', emoji: '📊' },
  conversational: { label: 'Conversational / Personal', emoji: '💬' },
  'skeptic-believer': { label: 'Skeptical-Turned-Believer', emoji: '🤔' },
  technical: { label: 'Technical / Analytical', emoji: '🧮' },
  beginner: { label: 'Beginner Friendly', emoji: '🌱' },
};
