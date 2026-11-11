import { query } from '@/lib/db';
import { getContact, hashIp, markContactByToken, CAMPAIGN } from '@/lib/outreach/db';
import { signup, confirmInstantly, setCadence } from '@/lib/newsletter/db';
import { sendSubscriberLink } from '@/lib/newsletter/link-send';

export type OneClickResult = 'subscribed' | 'already' | 'form';

/** A click this soon after a send is treated as a scanner or preview, not a person. */
const MIN_MINUTES_AFTER_SEND = 5;

/**
 * One-click subscribe from the invitation email. A person who presses "Subscribe free" is subscribed at once
 * (weekly unless the link says daily) and lands on a thank-you page. Anything that does not look like a person
 * falls back to the subscribe form, so email security tools that follow links cannot subscribe anyone:
 * the click must not be classed as a bot, must come at least 5 minutes after the send, and must not share an
 * address with clicks or sign-ups for other invitees.
 */
export async function oneClickSubscribe(o: {
    token: string; ip: string | null; ua: string | null; cadence: 'weekly' | 'daily';
}): Promise<OneClickResult> {
    try {
        const c = await getContact(o.token);
        if (!c) return 'form';
        if (['unsubscribed', 'bounced', 'complained'].includes(c.status)) return 'form';
        const ipHash = hashIp(o.ip);
        if (!o.ip || !ipHash) return 'form';

        const s = await query(`SELECT MAX(sent_at) AS m FROM outreach_sends WHERE token = $1`, [o.token]);
        const last = s.rows[0]?.m ? new Date(s.rows[0].m).getTime() : 0;
        if (!last || Date.now() - last < MIN_MINUTES_AFTER_SEND * 60_000) return 'form';

        const shared = await query(
            `SELECT 1 FROM outreach_click_events WHERE ip_hash = $1 AND token <> $2 AND ts > NOW() - INTERVAL '7 days' LIMIT 1`,
            [ipHash, o.token]
        );
        if (shared.rowCount) return 'form';
        const sharedSignup = await query(
            `SELECT 1 FROM newsletter_subscribers WHERE signup_ip = $1 AND lower(email) <> lower($2) LIMIT 1`,
            [o.ip, c.email]
        );
        if (sharedSignup.rowCount) return 'form';

        const result = await signup({
            rawEmail: c.email, consent: true, source: 'coldlist', medium: 'email', campaign: CAMPAIGN,
            referringIssue: null, referralId: null, experience: null, ip: o.ip, ua: o.ua,
        });
        if (result.kind === 'error') return 'form';
        if (result.kind === 'already-confirmed') {
            void markContactByToken(o.token, c.email, 'subscribed');
            return 'already';
        }
        if (!('subscriberId' in result) || !result.subscriberId) return 'form';

        await setCadence(result.subscriberId, o.cadence);
        const conf = await confirmInstantly(result.subscriberId);
        if (!conf) return 'form';
        void markContactByToken(o.token, c.email, 'subscribed');
        // The only email: a link to the current issue on the website.
        await sendSubscriberLink({ email: conf.email, subscriberId: result.subscriberId, cadence: o.cadence });
        return 'subscribed';
    } catch (err) {
        console.error('[one-click]', err);
        return 'form';
    }
}
