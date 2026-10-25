import { send, MAILING_ADDRESS } from '@/lib/newsletter/email';
import type { LifecycleEmail } from './rules';

const BASE = process.env.NEXT_PUBLIC_APP_URL || 'https://trademind.bot';
const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-US', { timeZone: 'America/New_York', month: 'long', day: 'numeric', year: 'numeric' });

export const CHOOSE_URL = `${BASE}/founding/choose`;

export interface EmailCtx { to: string; endDate: string; month?: number; level?: string; price?: string; period?: string; current?: string }

/** Copy for each lifecycle email. All wording passes the claim guard. */
export function programEmail(kind: LifecycleEmail | 'accepted' | 'founding_confirmed', c: EmailCtx) {
    switch (kind) {
        case 'accepted':
        case 'preview_started':
            return {
                to: c.to, subject: 'Your TradeMind preview is active',
                heading: 'Your 30 day preview has started',
                intro: `Your TradeMind preview is active until ${fmt(c.endDate)}. No card is on file and nothing will be charged.`,
                bullets: [
                    'Research and Tracking are open to you for the full 30 days.',
                    'Your first short activity arrives on day 7. It takes about 5 minutes.',
                    'Nothing turns into a paid plan unless you say yes.',
                ],
                cta: { label: 'Open your preview', url: CHOOSE_URL },
                note: 'Sign in with the email address this message was sent to.',
            };
        case 'choice_reminder':
            return {
                to: c.to, subject: `Your preview ends ${fmt(c.endDate)}. Here are your options`,
                heading: 'Choose how to continue',
                intro: `Your preview ends ${fmt(c.endDate)}. You have three choices.`,
                bullets: [
                    'Research partner: complete one short activity each month and keep using it free for up to six months in total.',
                    'Founding member: Research from $19 per month for your first 12 paid months, or Research and Tracking from $34 per month. No feedback tasks.',
                    'Free Weekly: return to the free weekly newsletter.',
                ],
                cta: { label: 'Choose now', url: CHOOSE_URL },
                note: 'If you do nothing, you return to Free Weekly and are not charged.',
            };
        case 'activity_due':
            return {
                to: c.to, subject: `TradeMind research activity ${c.month}: about 5 minutes`,
                heading: 'Your monthly activity is ready',
                intro: 'Completing it adds 30 more days of free access, up to six months in total. Credit comes from a real attempt to answer. "I did not use it" is a valid answer, and you never need to give positive feedback.',
                cta: { label: 'Open the activity', url: `${BASE}/founding/choose` },
            };
        case 'free_time_ending':
            return {
                to: c.to, subject: 'Your free TradeMind access ends soon',
                heading: 'Free access ends on ' + fmt(c.endDate),
                intro: `Your free research access ends ${fmt(c.endDate)}. Your founding price stays open for 30 days after that. Otherwise you return to Free Weekly with no charge.`,
                cta: { label: 'See your options', url: CHOOSE_URL },
            };
        case 'founding_ready':
            return {
                to: c.to, subject: 'Your founding price is ready',
                heading: 'Start your founding membership',
                intro: 'Your free access has ended. When you are ready, start your founding membership at your founding price. Nothing is charged until you complete checkout yourself.',
                cta: { label: 'Start founding membership', url: CHOOSE_URL },
            };
        case 'founding_confirmed':
            return {
                to: c.to, subject: 'Your TradeMind founding membership is active',
                heading: 'Founding membership confirmed',
                intro: `You chose TradeMind ${c.level} at the founding price of ${c.price} per ${c.period} for your first 12 paid months. After the founding period the price is the current rate, now ${c.current}. Cancel online in Billing at any time.`,
                note: `TradeMind, ${MAILING_ADDRESS}`,
            };
    }
}

export const sendProgramEmail = (kind: Parameters<typeof programEmail>[0], c: EmailCtx) => send(programEmail(kind, c));
