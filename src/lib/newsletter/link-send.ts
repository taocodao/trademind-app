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
 * Sender that matches the outreach. When setting newsletter_match_domain is 'on', a subscriber who came from outreach gets the email from the
 * same sending domain (and link host) that reached them, if that domain is in newsletter_match_domains (default vochat.ai,echoads.tv).
 * Microsoft mailboxes go through Workspace, everyone else through Resend. Anyone else gets the default sender.
 */
export async function senderForSubscriber(email: string): Promise<{ from: string; replyTo: string; host: string; transport: 'resend' | 'workspace' }> {
    const def = await senderFor();
    const base = { ...def, transport: 'resend' as const };
    try {
        const r = await query(`SELECT key, value FROM outreach_settings WHERE key IN ('newsletter_match_domain','newsletter_match_domains','from_display') OR key LIKE 'link_host_%' OR key LIKE 'reply_to_%'`);
        const m: Record<string, string> = {};
        for (const row of r.rows as { key: string; value: string }[]) m[row.key] = row.value;
        if (m.newsletter_match_domain !== 'on') return base;
        const allowed = String(m.newsletter_match_domains || 'vochat.ai,echoads.tv').toLowerCase().split(',').map((x) => x.trim()).filter(Boolean);
        const e = email.trim().toLowerCase();
        const d = (await query(
            `SELECT s.domain FROM outreach_sends s JOIN outreach_contacts c ON c.token = s.token
             WHERE (lower(c.email) = $1 OR lower(COALESCE(c.subscriber_email, '')) = $1) AND s.step < 100 AND s.token NOT LIKE 'dt%' AND s.status <> 'failed' AND c.wave <> 'seed'
             ORDER BY s.sent_at DESC LIMIT 1`, [e])).rows[0]?.domain as string | undefined;
        const dom = (d || '').toLowerCase();
        if (!dom || !allowed.includes(dom) || !m[`link_host_${dom}`]) return base;
        const { mailHostOfEmail } = await import('@/lib/outreach/mailhost');
        const { workspaceReady } = await import('@/lib/outreach/transport');
        const ms = (await mailHostOfEmail(e)) === 'microsoft' && workspaceReady(dom);
        return {
            from: `${m.from_display || 'Eric Huang'} <eric@${dom}>`,
            replyTo: m[`reply_to_${dom}`] || def.replyTo,
            host: m[`link_host_${dom}`].trim().replace(/^https?:\/\//, '').replace(/\/+$/, ''),
            transport: ms ? 'workspace' : 'resend',
        };
    } catch { return base; }
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
        let ok = false;
        if (snd.transport === 'workspace') {
            const { sendMail } = await import('@/lib/outreach/transport');
            const r = await sendMail({ transport: 'workspace', from: snd.from, to: o.email, replyTo: snd.replyTo, subject: m.subject, text: m.text, html: m.html ?? null, headers, token: `nl${o.subscriberId}`, step: Date.now() % 1000000, campaign: 'newsletter' });
            ok = r.ok;
            if (!ok) console.error('[link email] Workspace failed:', r.status, r.body);
        } else {
            const res = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ from: snd.from, reply_to: snd.replyTo, to: o.email, subject: m.subject, text: m.text, ...(m.html ? { html: m.html } : {}), headers }),
            });
            if (!res.ok) console.error('[link email] Resend failed:', res.status, await res.text());
            ok = res.ok;
        }
        await logNewsletterSend({ email: o.email, subscriberId: o.subscriberId, kind: o.weekly ? 'weekly_issue' : o.again ? 'issue_now' : 'welcome', issueSlug: o.weekly?.slug ?? null, ok });
        return ok;
    } catch (err) {
        console.error('[link email]', err);
        return false;
    }
}
