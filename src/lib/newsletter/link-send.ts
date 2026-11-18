/**
 * The one email a new subscriber gets: a link to the newsletter on the website.
 * Used by the subscribe form, the one-click invitation buttons and the old confirmation link.
 */
import { MAILING_ADDRESS } from './email';
import { makeLongUnsubscribeToken, logNewsletterSend } from './db';
import { makeDailyLinkToken } from './daily-link';
import { renderLinkEmail, renderLinkEmailLight } from './link-email';
import { liveFacts } from './live-facts';
import { query } from '@/lib/db';

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FROM = process.env.TRANSACTIONAL_FROM ?? 'TradeMind <signals@trademind.bot>';
const REPLY_TO = process.env.NEWSLETTER_REPLY_TO ?? 'support@trademind.bot';
const LINKEDIN_URL = 'https://www.linkedin.com/in/eric-huang-85600513/';
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://trademind.bot';

/**
 * Sender for this email: outreach_settings keys subscriber_link_from and subscriber_link_reply_to override the defaults, so it can be switched without a deploy.
 * subscriber_link_host (for example go.echoads.tv) switches the email to the light HTML format with every link on that host, which must match the sender domain.
 */
export async function senderFor(): Promise<{ from: string; replyTo: string; host: string }> {
    try {
        const r = await query(`SELECT key, value FROM outreach_settings WHERE key IN ('subscriber_link_from','subscriber_link_reply_to','subscriber_link_host')`);
        const m: Record<string, string> = {};
        for (const row of r.rows as { key: string; value: string }[]) m[row.key] = row.value;
        return { from: m.subscriber_link_from?.trim() || FROM, replyTo: m.subscriber_link_reply_to?.trim() || REPLY_TO, host: (m.subscriber_link_host || '').trim().replace(/^https?:\/\//, '').replace(/\/+$/, '') };
    } catch { return { from: FROM, replyTo: REPLY_TO, host: '' }; }
}

/**
 * Sender that matches the outreach, in both sending domain and sending method (when setting newsletter_match_domain is 'on').
 * The subscriber's outreach contact decides the lane:
 *  - adviser lane on SendGrid (ria): the same adviser domain, through SendGrid.
 *  - adviser lane routed (cx): the same routing as the outreach: Microsoft mailboxes through Workspace, the rest through Resend, from the domain that reached them when
 *    it is one of the routed domains, otherwise the first routed domain.
 *  - retail: the retail routing (Microsoft through Workspace, the rest through Resend, from the retail domain).
 * A subscriber with no outreach contact (direct sign up) gets the default sender. Every matched domain must have a link host set.
 */
export type NewsletterTransport = 'resend' | 'workspace' | 'sendgrid';
export async function senderForSubscriber(email: string): Promise<{ from: string; replyTo: string; host: string; transport: NewsletterTransport }> {
    const def = await senderFor();
    const base = { ...def, transport: 'resend' as NewsletterTransport };
    try {
        const r = await query(`SELECT key, value FROM outreach_settings WHERE key = 'from_display' OR key LIKE 'newsletter_match%' OR key LIKE 'link_host_%' OR key LIKE 'reply_to_%' OR key LIKE 'cx_route%' OR key LIKE 'retail_route%' OR key = 'ria_domains'`);
        const m: Record<string, string> = {};
        for (const row of r.rows as { key: string; value: string }[]) m[row.key] = row.value;
        if (m.newsletter_match_domain !== 'on') return base;
        const e = email.trim().toLowerCase();
        const c = (await query(
            `SELECT c.wave, (SELECT s.domain FROM outreach_sends s WHERE s.token = c.token AND s.step < 100 AND s.status <> 'failed' ORDER BY s.sent_at DESC LIMIT 1) AS domain
               FROM outreach_contacts c WHERE c.wave <> 'seed' AND (lower(c.email) = $1 OR lower(COALESCE(c.subscriber_email, '')) = $1)
              ORDER BY (EXISTS (SELECT 1 FROM outreach_sends s WHERE s.token = c.token AND s.step < 100)) DESC LIMIT 1`, [e])).rows[0] as { wave: string; domain: string | null } | undefined;
        if (!c) return base;
        const { mailHostOfEmail, retailRouteFor } = await import('@/lib/outreach/mailhost');
        const { workspaceReady } = await import('@/lib/outreach/transport');
        const host = await mailHostOfEmail(e);
        const csv = (v: string | undefined) => String(v || '').toLowerCase().split(',').map((x) => x.trim()).filter(Boolean);
        const last = (c.domain || '').toLowerCase();
        let dom = ''; let transport: NewsletterTransport = 'resend';
        if (c.wave === 'ria') { dom = last || csv(m.ria_domains)[0] || ''; transport = 'sendgrid'; }
        else if (c.wave === 'cx') {
            if (host === 'microsoft') { const l = csv(m.cx_route_ms_domains || 'echoads.tv,vochat.ai').filter(workspaceReady); dom = l.includes(last) ? last : (l[0] || ''); transport = 'workspace'; }
            else { const l = csv(m.cx_route_google_domains || 'vochat.ai'); dom = l.includes(last) ? last : (l[0] || ''); }
        } else {
            const rc = retailRouteFor(host, m);
            if (rc) { dom = rc.domain; transport = rc.transport as NewsletterTransport; }
        }
        if (!dom || !m[`link_host_${dom}`]) return base;
        return {
            from: `${m.from_display || 'Eric Huang'} <eric@${dom}>`,
            replyTo: m[`reply_to_${dom}`] || def.replyTo,
            host: m[`link_host_${dom}`].trim().replace(/^https?:\/\//, '').replace(/\/+$/, ''),
            transport,
        };
    } catch { return base; }
}

/** Sends one subscriber email by the method chosen in senderForSubscriber. */
export async function deliverSubscriberMail(o: { snd: { from: string; replyTo: string; transport: NewsletterTransport }; to: string; subscriberId: number; subject: string; text: string; html?: string | null; headers?: Record<string, string> }): Promise<boolean> {
    if (o.snd.transport === 'workspace' || o.snd.transport === 'sendgrid') {
        const { sendMail } = await import('@/lib/outreach/transport');
        const r = await sendMail({ transport: o.snd.transport, from: o.snd.from, to: o.to, replyTo: o.snd.replyTo, subject: o.subject, text: o.text, html: o.html ?? null, headers: o.headers, token: `nl${o.subscriberId}`, step: Date.now() % 1000000, campaign: 'newsletter' });
        if (!r.ok) console.error(`[subscriber email] ${o.snd.transport} failed:`, r.status, r.body);
        return r.ok;
    }
    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: o.snd.from, reply_to: o.snd.replyTo, to: o.to, subject: o.subject, text: o.text, ...(o.html ? { html: o.html } : {}), headers: o.headers }),
    });
    if (!res.ok) console.error('[subscriber email] Resend failed:', res.status, await res.text());
    return res.ok;
}

export type Cadence = 'weekly' | 'daily' | 'both';

/** Where the current issue lives on the site. Everyone starts at the current weekly issue; the daily page is linked from daily edition emails. */
export function currentIssuePath(_cadence?: Cadence | string | null): string {
    return '/newsletter/current';
}

export async function sendSubscriberLink(o: { email: string; subscriberId: number; cadence: Cadence | string | null; again?: boolean; weekly?: { subject: string; description: string; path: string; slug?: string } }): Promise<boolean> {
    if (!RESEND_API_KEY) { console.warn('[link email] RESEND_API_KEY not configured'); return false; }
    try {
        const facts = await liveFacts(new Date());
        const tok = makeDailyLinkToken(o.subscriberId);
        const snd = await senderForSubscriber(o.email);
        const base = snd.host ? `https://${snd.host}` : BASE_URL;
        const unsubscribeUrl = `${base}/newsletter/unsubscribe?token=${await makeLongUnsubscribeToken(o.subscriberId)}`;
        const m = (snd.host ? renderLinkEmailLight : renderLinkEmail)({
            subject: o.weekly ? o.weekly.subject : o.again ? `Your issue link: the brief for the ${facts.weekLabel.toLowerCase()}` : `You are subscribed. Read the brief for the ${facts.weekLabel.toLowerCase()}`,
            description: o.weekly ? o.weekly.description : (o.again ? 'Here is the current issue, as you asked. ' : 'Welcome. ') + 'The current TradeMind brief is on the site: market weather, the copilot readout, a flight plan idea and a turbulence test, risk first. About five minutes.',
            // The signed reader key (k) lets the page recognise the subscriber, so it shows no subscribe button.
            url: `${base}${o.weekly ? o.weekly.path : currentIssuePath(o.cadence)}?k=${encodeURIComponent(tok)}`,
            signatureLink: snd.host ? { label: 'LinkedIn', url: LINKEDIN_URL } : null,
            unsubscribeUrl,
            preferencesUrl: `${base}/newsletter/preferences?k=${encodeURIComponent(tok)}`,
            address: `TradeMind, ${MAILING_ADDRESS}`,
        });
        const headers = snd.host ? undefined : {
            'List-Unsubscribe': `<${unsubscribeUrl.replace('/newsletter/unsubscribe?', '/api/newsletter/unsubscribe?')}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        };
        const ok = await deliverSubscriberMail({ snd, to: o.email, subscriberId: o.subscriberId, subject: m.subject, text: m.text, html: m.html, headers });
        await logNewsletterSend({ email: o.email, subscriberId: o.subscriberId, kind: o.weekly ? 'weekly_issue' : o.again ? 'issue_now' : 'welcome', issueSlug: o.weekly?.slug ?? null, ok });
        return ok;
    } catch (err) {
        console.error('[link email]', err);
        return false;
    }
}
