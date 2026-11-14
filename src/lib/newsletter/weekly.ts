/**
 * The weekly issue. Each Sunday evening an edition is built from sourced market context and, when every check
 * passes, published at once with no manual approval. Each subscriber then gets the link seven days after the last
 * issue email they were sent (the welcome email counts), so a new subscriber gets the first issue right away and one
 * issue a week after that. The edition is shown on the site in the same layout as every other issue.
 */
import { query } from '@/lib/db';
import type { PublicPayload } from './pipeline/build';
import { ensureEditionTables } from './pipeline/db';
import { FIRST_PUBLISHED_NUMBER, ISSUES, PUBLISHED_ISSUES, type NewsletterIssue } from './issues';

/** Email kinds that start a subscriber's seven day clock. Get issue (issue_now) is a resend and does not. */
export const CLOCK_KINDS = `('welcome','issue','weekly_issue')`;
/** Editions built before this date were never published and are ignored. */
const FIRST_EDITION_DATE = '2026-11-15';

export interface WeeklyEdition { id: number; date: string; subject: string; createdAt: Date; issue: NewsletterIssue; path: string }

const longDate = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'long', day: 'numeric', year: 'numeric' });

export function editionBody(p: PublicPayload): string {
    const tpl = p.templateNumber ? ISSUES.find((i) => i.number === p.templateNumber) : undefined;
    const out: string[] = [p.hook, ''];
    out.push('## What moved this week', '');
    for (const c of p.context) out.push(`- **${c.headline}.** ${c.body} ([${c.sourceName}](${c.sourceUrl}))`);
    out.push('');
    if (p.weekAhead?.length) { out.push('## The week ahead', ''); for (const w of p.weekAhead) out.push(`- ${w}`); out.push(''); }
    if (tpl) {
        out.push(`## This week's flight plan: ${tpl.title}`, '');
        if (p.tieIn) out.push(p.tieIn, '');
        out.push(tpl.body, '');
    } else {
        out.push(`## Flight plan idea: ${p.idea.title}`, '', p.idea.body, '', p.idea.why, '');
    }
    // The page already carries its own Turbulence test card, so the body ends with the flight plan.
    return out.join('\n').trim();
}

export function editionToIssue(row: { id: number; date: string; subject: string; payload: PublicPayload }, ordinal: number): NewsletterIssue {
    const p = row.payload;
    return {
        number: FIRST_PUBLISHED_NUMBER + ordinal, slug: `flight-plan-week-of-${row.date}`,
        title: `Flight Plan: week of ${longDate(row.date)}`, subtitle: p.hook, publishDate: row.date, readTime: '5 min',
        tags: ['Weekly Brief'], excerpt: p.hook, deepLinks: (p.templateNumber ? ISSUES.find((i) => i.number === p.templateNumber)?.deepLinks : undefined) ?? [], body: editionBody(p), emailSubject: row.subject, previewText: p.preheader,
    };
}

let cache: { at: number; list: WeeklyEdition[] } | null = null;

/** Published weekly editions, oldest first. The first one is Issue 2 for readers (Issue 1 is the launch issue). */
export async function weeklyEditions(): Promise<WeeklyEdition[]> {
    if (cache && Date.now() - cache.at < 60_000) return cache.list;
    try {
        await ensureEditionTables();
        const r = await query(`SELECT id, edition_date::text AS d, subject, payload, created_at FROM newsletter_edition
            WHERE kind = 'weekly' AND status IN ('approved','sent') AND edition_date >= $1::date ORDER BY edition_date`, [FIRST_EDITION_DATE]);
        const list = (r.rows as any[]).map((x, i) => {
            const issue = editionToIssue({ id: x.id, date: x.d, subject: x.subject, payload: x.payload }, i + 1);
            return { id: x.id, date: x.d, subject: x.subject, createdAt: new Date(x.created_at), issue, path: `/newsletter/issues/${issue.publishDate}-${issue.slug}` };
        });
        cache = { at: Date.now(), list };
        return list;
    } catch { return cache?.list ?? []; }
}

/** The public sequence in reading order: the launch issue, then each weekly edition. */
export async function publicSequence(): Promise<NewsletterIssue[]> {
    return [...PUBLISHED_ISSUES, ...(await weeklyEditions()).map((e) => e.issue)];
}

export async function weeklySendOn(): Promise<boolean> {
    try { return (await query(`SELECT value FROM outreach_settings WHERE key = 'weekly_issue_send'`)).rows[0]?.value === 'on'; } catch { return false; }
}

/** Exact time of the subscriber's next issue: seven days after their last issue email, or seven days from now. */
export async function nextIssueText(email?: string | null, now = new Date()): Promise<string> {
    let base = now;
    if (email) {
        try {
            const r = await query(`SELECT max(l.created_at) AS last FROM newsletter_send_log l JOIN newsletter_subscribers s ON s.id = l.subscriber_id
                WHERE lower(s.email) = lower($1) AND l.ok AND l.kind IN ${CLOCK_KINDS}`, [email]);
            if (r.rows[0]?.last) base = new Date(r.rows[0].last);
        } catch { /* use now */ }
    }
    const due = new Date(base.getTime() + 7 * 86_400_000);
    const day = due.toLocaleDateString('en-US', { timeZone: 'America/New_York', weekday: 'long', month: 'long', day: 'numeric' });
    const time = due.toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' });
    return `${day} at ${time} ET`;
}

const OWNER = 'eric@trademind.bot';

/** Emails the owner a copy of a new weekly issue, or a note that it was held or could not be built. Held and failed notes go out once per edition date. */
export async function mailOwner(date: string, built: { stored: boolean; id?: number; status?: string; reason?: string; checks?: { name: string; pass: boolean; detail?: string }[] }): Promise<void> {
    const key = `weekly_owner_note_${date}_${built.status ?? built.reason ?? 'x'}`;
    try {
        if (built.reason === 'already built') return;
        const seen = await query(`SELECT 1 FROM outreach_settings WHERE key = $1`, [key]);
        if (seen.rowCount) return;
        if (!process.env.RESEND_API_KEY) return;
        let subject: string; let text: string;
        if (built.status === 'approved') cache = null;
        const ed = built.status === 'approved' ? (await weeklyEditions()).find((e) => e.id === built.id) : undefined;
        if (ed) {
            const due = await query(`SELECT count(*)::int AS n FROM newsletter_subscribers s WHERE s.status = 'confirmed' AND s.cadence IN ('weekly','both') AND EXISTS (SELECT 1 FROM newsletter_send_log l WHERE l.subscriber_id = s.id AND l.ok AND l.kind IN ${CLOCK_KINDS})`);
            subject = `[Copy] ${ed.subject}`;
            text = [`This week's issue was built and published automatically. Each subscriber gets the link seven days after their last issue email.`, '',
                `Read it: https://trademind.bot${ed.path}`, '', `Subject line: ${ed.subject}`, `Subscribers in the weekly cycle: ${due.rows[0]?.n ?? 0}`, '',
                'Checks:', ...(((await query(`SELECT checks FROM newsletter_edition WHERE id = $1`, [ed.id])).rows[0]?.checks ?? []) as { name: string; pass: boolean }[]).map((c) => `- ${c.name}: ${c.pass ? 'pass' : 'FAIL'}`), '',
                `Issue text:`, '', ed.issue.body].join('\n');
        } else if (built.stored) {
            subject = `[Held] Weekly issue for ${date} was not published`;
            text = [`The weekly issue for ${date} failed a check, so it was held and nobody was emailed. Subscribers keep their place and get the next good issue.`, '',
                ...(built.checks ?? []).filter((c) => !c.pass).map((c) => `- ${c.name}: ${c.detail ?? 'failed'}`)].join('\n');
        } else {
            subject = `[Not built] Weekly issue for ${date}`;
            text = `The weekly issue for ${date} could not be built (${built.reason ?? 'unknown reason'}). The build tries again on its next scheduled run, and nobody is emailed until an issue is published.`;
        }
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ from: process.env.TRANSACTIONAL_FROM ?? 'TradeMind <signals@trademind.bot>', to: OWNER, subject, text }),
        });
        if (res.ok) await query(`INSERT INTO outreach_settings (key, value) VALUES ($1,'sent') ON CONFLICT (key) DO NOTHING`, [key]);
    } catch (e) { console.error('[weekly owner copy]', e); }
}
