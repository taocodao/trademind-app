/**
 * The one email a new subscriber gets: a link to the newsletter on the website.
 * Used by the subscribe form, the one-click invitation buttons and the old confirmation link.
 */
import { MAILING_ADDRESS } from './email';
import { makeLongUnsubscribeToken, logNewsletterSend } from './db';
import { makeDailyLinkToken } from './daily-link';
import { renderLinkEmail } from './link-email';
import { liveFacts } from './live-facts';
import { query } from '@/lib/db';

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FROM = process.env.TRANSACTIONAL_FROM ?? 'TradeMind <signals@trademind.bot>';
const REPLY_TO = process.env.NEWSLETTER_REPLY_TO ?? 'support@trademind.bot';
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://trademind.bot';

/** Sender for this email: outreach_settings keys subscriber_link_from and subscriber_link_reply_to override the defaults, so it can be switched without a deploy. */
async function senderFor(): Promise<{ from: string; replyTo: string }> {
    try {
        const r = await query(`SELECT key, value FROM outreach_settings WHERE key IN ('subscriber_link_from','subscriber_link_reply_to')`);
        const m: Record<string, string> = {};
        for (const row of r.rows as { key: string; value: string }[]) m[row.key] = row.value;
        return { from: m.subscriber_link_from?.trim() || FROM, replyTo: m.subscriber_link_reply_to?.trim() || REPLY_TO };
    } catch { return { from: FROM, replyTo: REPLY_TO }; }
}

export type Cadence = 'weekly' | 'daily' | 'both';

/** Where the current issue lives on the site. Everyone starts at the current weekly issue; the daily page is linked from daily edition emails. */
export function currentIssuePath(_cadence?: Cadence | string | null): string {
    return '/newsletter/current';
}

export async function sendSubscriberLink(o: { email: string; subscriberId: number; cadence: Cadence | string | null; again?: boolean }): Promise<boolean> {
    if (!RESEND_API_KEY) { console.warn('[link email] RESEND_API_KEY not configured'); return false; }
    try {
        const facts = await liveFacts(new Date());
        const tok = makeDailyLinkToken(o.subscriberId);
        const unsubscribeUrl = `${BASE_URL}/newsletter/unsubscribe?token=${await makeLongUnsubscribeToken(o.subscriberId)}`;
        const m = renderLinkEmail({
            subject: o.again ? `Your issue link: the brief for the ${facts.weekLabel.toLowerCase()}` : `You are subscribed. Read the brief for the ${facts.weekLabel.toLowerCase()}`,
            description: (o.again ? 'Here is the current issue, as you asked. ' : 'Welcome. ') + 'The current TradeMind brief is on the site: market weather, the copilot readout, a flight plan idea and a turbulence test, risk first. About five minutes.',
            url: `${BASE_URL}${currentIssuePath(o.cadence)}`,
            unsubscribeUrl,
            preferencesUrl: `${BASE_URL}/newsletter/preferences?k=${encodeURIComponent(tok)}`,
            address: `TradeMind, ${MAILING_ADDRESS}`,
        });
        const snd = await senderFor();
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                from: snd.from, reply_to: snd.replyTo, to: o.email, subject: m.subject, text: m.text,
                headers: {
                    'List-Unsubscribe': `<${unsubscribeUrl.replace('/newsletter/unsubscribe?', '/api/newsletter/unsubscribe?')}>`,
                    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
                },
            }),
        });
        if (!res.ok) console.error('[link email] Resend failed:', res.status, await res.text());
        const ok = res.ok;
        await logNewsletterSend({ email: o.email, subscriberId: o.subscriberId, kind: o.again ? 'issue_now' : 'welcome', ok });
        return ok;
    } catch (err) {
        console.error('[link email]', err);
        return false;
    }
}
