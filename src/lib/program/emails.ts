import { send, MAILING_ADDRESS } from '@/lib/newsletter/email';
import type { LifecycleEmail } from './rules';

const BASE = process.env.NEXT_PUBLIC_APP_URL || 'https://trademind.bot';
const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-US', { timeZone: 'America/New_York', month: 'long', day: 'numeric', year: 'numeric' });

export const CHOOSE_URL = `${BASE}/founding/choose`;
export const PLANS_URL = `${BASE}/plans`;

export interface EmailCtx { to: string; endDate: string; month?: number; level?: string; price?: string; period?: string; current?: string }

/** Copy for each study preview email. All wording passes the claim guard. */
export function programEmail(kind: LifecycleEmail | 'accepted' | 'founding_confirmed', c: EmailCtx) {
    switch (kind) {
        case 'accepted':
        case 'preview_started':
            return {
                to: c.to, subject: 'Your TradeMind study is active',
                heading: 'Your 4 month study has started',
                intro: `Your preview is active until ${fmt(c.endDate)}. No card is on file and nothing will be charged.`,
                bullets: [
                    'You can follow the signals with a virtual account for the full 4 months at no charge.',
                    'A short survey opens near the end of each month. To pass a month, send at least 3 pieces of feedback: suggestions, problems you hit in the app and questions all count. Every month you pass adds 3 free months for one account at the end, worth about $90 on QQQ Defensive or $120 on QQQ LEAPS at standard monthly prices.',
                    'Stay 2 months and pass both and you have 2 months plus 6 months; stay all 4 and you have 4 plus 12. You can leave at any time. Nothing turns into a paid plan unless you buy one yourself.',
                ],
                cta: { label: 'Open your preview', url: CHOOSE_URL },
                note: 'Sign in with the email address this message was sent to.',
            };
        case 'choice_reminder':
        case 'free_time_ending':
            return {
                to: c.to, subject: 'Your TradeMind study preview ends soon',
                heading: 'Your preview ends on ' + fmt(c.endDate),
                intro: `Your free study access ends ${fmt(c.endDate)}. If you want to keep the signals, you can buy a plan yourself. Newsletter subscribers pay 30% less. If you do nothing, access simply ends and you are not charged.`,
                cta: { label: 'See plans', url: PLANS_URL },
            };
        case 'activity_due':
            return {
                to: c.to, subject: `TradeMind month ${c.month} survey: about 5 minutes`,
                heading: 'Your month survey is ready',
                intro: 'Send at least 3 pieces of feedback to pass the month. A suggestion, a problem you hit in the app or a question each count. Passing adds 3 free months for one account at the end, worth about $90 on QQQ Defensive or $120 on QQQ LEAPS, so two months in with both surveys done means 2 months plus 6 months. Credit comes from a real attempt to answer. "I did not use it" is a valid answer, and you never need to give positive feedback.',
                cta: { label: 'Open the survey', url: CHOOSE_URL },
            };
        case 'founding_ready':
        case 'founding_confirmed':
            return {
                to: c.to, subject: 'TradeMind plans',
                heading: 'TradeMind plans',
                intro: 'You can buy a plan yourself at any time.',
                cta: { label: 'See plans', url: PLANS_URL },
                note: `TradeMind, ${MAILING_ADDRESS}`,
            };
    }
}

export const sendProgramEmail = (kind: Parameters<typeof programEmail>[0], c: EmailCtx) => send(programEmail(kind, c));
