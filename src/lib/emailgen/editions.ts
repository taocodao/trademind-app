import type { EditionType, Goal } from './types';

const PLANS: Goal = { label: 'See plans and pricing', url: 'https://trademind.bot/plans' };
// The daily subscribe route and cadence preference are not built yet. The existing join page carries the outreach token.
const SUBSCRIBE_DAILY: Goal = { label: 'Subscribe to the free daily newsletter', url: 'https://trademind.bot/newsletter/join?t={{token}}&cadence=daily' };

export interface EditionDef { type: EditionType; label: string; goal: Goal; words: { min: number; max: number }; implemented: boolean }

export const EDITIONS: Record<EditionType, EditionDef> = {
    weekly_free: { type: 'weekly_free', label: 'Weekly Flight Plan', goal: PLANS, words: { min: 650, max: 900 }, implemented: true },
    outreach_weekly: { type: 'outreach_weekly', label: 'Outreach weekly sample', goal: SUBSCRIBE_DAILY, words: { min: 650, max: 900 }, implemented: true },
    daily_quiet: { type: 'daily_quiet', label: 'Daily free, quiet', goal: PLANS, words: { min: 180, max: 300 }, implemented: true },
    daily_action: { type: 'daily_action', label: 'Daily free, action', goal: PLANS, words: { min: 250, max: 400 }, implemented: true },
    daily_paid: { type: 'daily_paid', label: 'Daily paid', goal: { label: 'Open your virtual account', url: 'https://trademind.bot/accounts' }, words: { min: 250, max: 500 }, implemented: false },
    presell: { type: 'presell', label: 'Pre-sell', goal: PLANS, words: { min: 400, max: 700 }, implemented: false },
    study_invite: { type: 'study_invite', label: 'Study invite', goal: { label: 'Apply to the study program', url: 'https://trademind.bot/founding' }, words: { min: 300, max: 500 }, implemented: false },
};

/** Links that appear in every issue. They are exempt from the single goal rule. */
export const FIXED_LINKS = {
    plans: 'https://trademind.bot/plans',
    study: 'https://trademind.bot/founding',
    simulation: 'https://trademind.bot/simulated-record',
    home: 'https://trademind.bot',
};

export const STUDY_RULES = '4 months, 20 seats, applications reviewed by hand, 30 days free to start with no card, month-end feedback questionnaire, each completed month adds 3 months free on one strategy and one account you choose, unused days kept, exit any time and keep earned access, 30 percent off the standard price, no payment for taking part.';

export const SIM_SENTENCE = 'QQQ LEAPS +229.48 percent with a largest drop of 14.59 percent, against QQQ buy and hold at +49.46 percent with a 22.88 percent drop, October 14, 2024 to October 13, 2026. It is a simulation with model-priced options, not live trading.';

export const DISCLAIMER = 'TradeMind publishes educational research for self-directed investors. It is not personalized investment advice. TradeMind never connects to a brokerage and never places orders. All performance shown is hypothetical simulation unless labeled live. The forward virtual record is reported separately and is not an audited customer record. Options and leveraged ETFs involve substantial risk, including loss of the amount invested.';
export const ADDRESS = 'TradeMind, 151-58 24th Rd, Whitestone, NY 11357';
