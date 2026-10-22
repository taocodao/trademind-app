import { sendMail, type Transport } from './transport';
import { query } from '@/lib/db';
import { MAILING_ADDRESS } from '@/lib/newsletter/email';
import { ISSUES, issueUrl } from '@/lib/newsletter/issues';
import { RECAP_HTML } from './recap-html';
import { BASE_URL, CAMPAIGN, ensureOutreachTables, getSettings } from './db';
import { etParts } from './sender';


/**
 * Monthly recap for people who chose "monthly" on the invitation unsubscribe page.
 * Content per month lives in outreach_recaps. Nothing is sent until that month is approved
 * and its market lines are filled in. Window: first 14 days of the following month, 8 AM to 8 PM ET.
 */
export interface RecapContent {
    intro_line?: string; preheader?: string; weather_summary?: string; readout_summary?: string;
    risk_lesson?: string; keep_idea?: string; offer_line?: string;
}

export const COLD_OFFER_LINE = 'Subscribe free to unlock 30% off a yearly TradeMind subscription.';
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MON3 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const SEPT_DEFAULT: RecapContent = {
    risk_lesson: 'A backtest is only as good as its assumptions. Always ask what pricing, costs and time period it used.',
    keep_idea: 'Use machine learning to filter and veto trades, not to start them. A model that can only say "no" is much harder to fool than one that says "buy."',
    preheader: 'What ML can and cannot do, how to read a backtest, and the month in one minute.',
};

let ready = false;
export async function ensureRecapTables(): Promise<void> {
    if (ready) return;
    await ensureOutreachTables();
    await query(`CREATE TABLE IF NOT EXISTS outreach_recaps (month_key TEXT PRIMARY KEY, content JSONB NOT NULL DEFAULT '{}'::jsonb, approved BOOLEAN NOT NULL DEFAULT FALSE, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await query(`CREATE TABLE IF NOT EXISTS outreach_recap_sends (token TEXT NOT NULL, month_key TEXT NOT NULL, domain TEXT, resend_id TEXT, sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY (token, month_key))`);
    await query(`INSERT INTO outreach_recaps (month_key, content) VALUES ('2026-09', $1) ON CONFLICT (month_key) DO NOTHING`, [JSON.stringify(SEPT_DEFAULT)]);
    ready = true;
}

function esc(v: string): string { return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

export function recapIssues(monthKey: string) {
    return ISSUES.filter((i) => i.publishDate.startsWith(monthKey)).sort((a, b) => (a.publishDate < b.publishDate ? -1 : 1)).map((i) => {
        const [, m, d] = i.publishDate.split('-');
        return { n: i.number, date: `${MON3[Number(m) - 1]} ${Number(d)}`, title: i.title, takeaway: i.subtitle, url: `${BASE_URL}${issueUrl(i)}` };
    });
}

export function recapMonthName(monthKey: string): string { return MONTHS[Number(monthKey.split('-')[1]) - 1]; }

export function renderRecap(opts: { token: string; firstName: string | null; senderName: string; monthKey: string; content: RecapContent }) {
    const c = opts.content;
    const issues = recapIssues(opts.monthKey);
    if (!issues.length) throw new Error(`No issues for ${opts.monthKey}`);
    for (const k of ['weather_summary', 'readout_summary', 'risk_lesson', 'keep_idea'] as const) {
        if (!c[k] || /\{\{/.test(c[k] as string)) throw new Error(`Recap ${opts.monthKey} is missing ${k}`);
    }
    const month = recapMonthName(opts.monthKey);
    const first = (opts.firstName ?? '').trim();
    const intro = c.intro_line || `You asked for one email a month instead of weekly ones. Here is what ${month} covered, in about three minutes.`;
    const offer = c.offer_line || COLD_OFFER_LINE;
    const unsubUrl = `${BASE_URL}/u/${opts.token}`;
    const weeklyUrl = `${BASE_URL}/r/${opts.token}/s?s=4`;
    const prefsUrl = unsubUrl;
    const subjBase = `here is your ${month} recap: ${issues.length} issues in 3 minutes`;
    const subject = first ? `${first}, ${subjBase}` : subjBase.charAt(0).toUpperCase() + subjBase.slice(1);
    const preheader = c.preheader || `${month} in three minutes: ${issues.length} issues and the month in one minute.`;

    const m: Record<string, string> = {
        first_name: first || 'there', month, intro_line: intro, preheader, weather_summary: c.weather_summary!, readout_summary: c.readout_summary!,
        risk_lesson: c.risk_lesson!, keep_idea: c.keep_idea!, offer_line: offer, weekly_url: weeklyUrl, prefs_url: prefsUrl, unsub_url: unsubUrl,
        sender_name: opts.senderName, mailing_address: MAILING_ADDRESS,
    };
    const fillHtml = (src: string, extra: Record<string, string> = {}) => src.replace(/\{\{(\w+)\}\}/g, (_x, k: string) => esc((extra[k] ?? m[k]) ?? ''));
    const blockRe = /<tr><td style="padding:14px 0;border-bottom:1px solid #[0-9a-f]{6};[\s\S]*?<\/td><\/tr>/;
    const block = RECAP_HTML.match(blockRe)?.[0];
    if (!block) throw new Error('recap template block not found');
    const tIssue = (url: string, amp: string) => `${BASE_URL}/r/${opts.token}/n?s=4${amp}u=${encodeURIComponent(url.replace(BASE_URL, ''))}`;
    const blocks = issues.map((i) => fillHtml(block, { n: String(i.n), date: i.date, title: i.title, one_line_takeaway: i.takeaway, issue_url: tIssue(i.url, '&') })).join('');
    let html = RECAP_HTML.replace(blockRe, '\u0000BLOCKS\u0000');
    html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(subject)}</title>`);
    html = fillHtml(html).replace('\u0000BLOCKS\u0000', blocks).replace(/href="https:\/\/trademind\.bot"/g, `href="${BASE_URL}/r/${opts.token}/h?s=4"`);

    const issueText = issues.map((i) => `Issue ${i.n} (${i.date}, ${opts.monthKey.slice(0, 4)}): ${i.title}\n${i.takeaway}\n${tIssue(i.url, '&')}`).join('\n\n');
    const text = [
        `Hi ${m.first_name},`, '', intro, '', 'THE MONTH IN ONE MINUTE',
        `Market weather: ${m.weather_summary}`, `Copilot readout: ${m.readout_summary}`, `Biggest risk lesson: ${m.risk_lesson}`, '',
        "THIS MONTH'S ISSUES", issueText, '', 'ONE IDEA TO KEEP', m.keep_idea, '',
        `Want every issue weekly instead? ${weeklyUrl}`, offer, '', opts.senderName, 'Founder, TradeMind, New York', '--',
        "You're getting this once a month because you chose the monthly recap.", `Change how often: ${prefsUrl}`, `Unsubscribe in one click: ${unsubUrl}`,
        `AI Investor Copilot, published by TradeMind, ${MAILING_ADDRESS}`,
        'Educational content only, not investment advice. Investing involves risk, including loss of principal. Options involve substantial risk and are not suitable for every investor. Any performance figures are hypothetical or simulated and do not guarantee future results.',
    ].join('\n');
    return { subject, text, html, unsubUrl };
}

/** Send the latest approved recap to monthly contacts who have not had it. Small batches each tick. */
export async function processRecaps(limit = 15, now = new Date()): Promise<Record<string, number | string>> {
    await ensureRecapTables();
    const s = await getSettings();
    if (s.paused === 'true') return { skipped: 'paused' };
    const et = etParts(now);
    const [yy, mm, dd] = et.date.split('-');
    if (Number(dd) > 14 || et.hour < 8 || et.hour >= 20) return { skipped: 'outside window' };
    const cur = `${yy}-${mm}`;
    const r = await query(`SELECT month_key, content FROM outreach_recaps WHERE approved AND month_key < $1 ORDER BY month_key DESC LIMIT 1`, [cur]);
    if (!r.rowCount) return { skipped: 'no approved recap' };
    const { month_key: monthKey, content } = r.rows[0] as { month_key: string; content: RecapContent };
    const due = await query(
        `SELECT c.token, c.email, c.first_name FROM outreach_contacts c
         WHERE c.status = 'monthly'
           AND NOT EXISTS (SELECT 1 FROM outreach_recap_sends x WHERE x.token = c.token AND x.month_key = $1)
           AND NOT EXISTS (SELECT 1 FROM newsletter_suppression ns WHERE ns.email = c.email)
         ORDER BY c.updated_at LIMIT $2`, [monthKey, limit]);
    const doms = (await query(`SELECT domain, from_local, transport FROM outreach_domains WHERE status = 'active' ORDER BY domain`)).rows as { domain: string; from_local: string; transport: string }[];
    if (!doms.length) return { skipped: 'no active domains' };
    let sent = 0, failed = 0, i = 0;
    for (const c of due.rows) {
        const d = doms[i++ % doms.length];
        const msg = renderRecap({ token: c.token, firstName: c.first_name, senderName: s.sender_name || 'Eric Huang', monthKey, content });
        try {
            const res = await sendMail({
                transport: (d.transport === 'sendgrid' ? 'sendgrid' : 'resend') as Transport,
                from: `${s.from_display || 'Eric Huang From AI Investor Copilot'} <${d.from_local}@${d.domain}>`, to: c.email, replyTo: s.reply_to || undefined,
                subject: msg.subject, text: msg.text, html: msg.html,
                headers: s.list_unsub_header === 'false' ? undefined : { 'List-Unsubscribe': `<${msg.unsubUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
                token: c.token, step: 0, campaign: CAMPAIGN, idempotencyKey: `recap-${c.token}-${monthKey}`,
            });
            const data = { id: res.id ?? undefined };
            if (!res.ok) { failed++; continue; }
            await query(`INSERT INTO outreach_recap_sends (token, month_key, domain, resend_id) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`, [c.token, monthKey, d.domain, data.id ?? null]);
            sent++;
        } catch { failed++; }
    }
    return { month: monthKey, sent, failed };
}
