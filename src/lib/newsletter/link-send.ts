/**
 * The one email a new subscriber gets: a link to the newsletter on the website.
 * Used by the subscribe form, the one-click invitation buttons and the old confirmation link.
 */
import { MAILING_ADDRESS } from './email';
import { makeLongUnsubscribeToken, logNewsletterSend } from './db';
import { makeDailyLinkToken } from './daily-link';
import { renderLinkEmail } from './link-email';
import { liveFacts } from './live-facts';

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FROM = process.env.TRANSACTIONAL_FROM ?? 'TradeMind <signals@trademind.bot>';
const REPLY_TO = process.env.NEWSLETTER_REPLY_TO ?? 'support@trademind.bot';
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://trademind.bot';

export type Cadence = 'weekly' | 'daily' | 'both';

/** Where the current issue lives on the site. Daily readers get the daily page, everyone else the weekly issue. */
export function currentIssuePath(cadence: Cadence | string | null | undefined): string {
    return cadence === 'daily' ? '/newsletter/daily' : '/newsletter/current';
}

export async function sendSubscriberLink(o: { email: string; subscriberId: number; cadence: Cadence | string | null }): Promise<boolean> {
    if (!RESEND_API_KEY) { console.warn('[link email] RESEND_API_KEY not configured'); return false; }
    try {
        const daily = o.cadence === 'daily';
        const facts = daily ? null : await liveFacts(new Date());
        const tok = makeDailyLinkToken(o.subscriberId);
        const unsubscribeUrl = `${BASE_URL}/newsletter/unsubscribe?token=${await makeLongUnsubscribeToken(o.subscriberId)}`;
        const m = renderLinkEmail({
            subject: daily ? 'You are subscribed. Read the daily brief' : `You are subscribed. Read the brief for the ${facts!.weekLabel.toLowerCase()}`,
            preheader: daily ? 'Your link to the TradeMind daily brief.' : 'Your link to the current TradeMind weekly brief.',
            heading: 'You are subscribed',
            line: daily ? 'The daily brief is on the site. Open it with the button below.' : 'This week\u2019s brief is on the site. Open it with the button below.',
            buttonLabel: daily ? 'Read the daily brief' : 'Read this week\u2019s brief',
            url: `${BASE_URL}${currentIssuePath(o.cadence)}`,
            unsubscribeUrl,
            preferencesUrl: `${BASE_URL}/newsletter/preferences?k=${encodeURIComponent(tok)}`,
            address: `TradeMind, ${MAILING_ADDRESS}`,
        });
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                from: FROM, reply_to: REPLY_TO, to: o.email, subject: m.subject, html: m.html, text: m.text,
                headers: {
                    'List-Unsubscribe': `<${unsubscribeUrl.replace('/newsletter/unsubscribe?', '/api/newsletter/unsubscribe?')}>`,
                    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
                },
            }),
        });
        if (!res.ok) console.error('[link email] Resend failed:', res.status, await res.text());
        const ok = res.ok;
        await logNewsletterSend({ email: o.email, subscriberId: o.subscriberId, kind: 'welcome', ok });
        return ok;
    } catch (err) {
        console.error('[link email]', err);
        return false;
    }
}
