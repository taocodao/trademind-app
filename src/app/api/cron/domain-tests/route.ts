import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { query } from '@/lib/db';
import { ensureOutreachTables, getSettings, CAMPAIGN } from '@/lib/outreach/db';
import { sendMail } from '@/lib/outreach/transport';
import { renderV8 } from '@/lib/outreach/copy-v8';
import { MAILING_ADDRESS } from '@/lib/newsletter/email';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Daily placement test: one sample email from every SendGrid sending domain to the owner's test inbox.
 * Retail domains send the current retail first email; adviser domains send the current adviser first note.
 * trademindmailbox.com is used by both lanes, so it sends both. Runs once a day (Vercel cron), never touches
 * real contacts, and records each result in outreach_domain_tests (one row per domain and kind per day).
 */
const TEST_TO = 'testtrademindnewsletter@gmail.com';
const ADVISER_DOMAINS = ['trademindria.com', 'trademindmailbox.com'];

const ADVISER_BODY = (token: string) => [
    'Hi Eric,', '',
    'Here is a research result I would like you to try to break.', '',
    'From October 14, 2024 through October 13, 2026:',
    '- QQQ LEAPS simulation: +229.48% total return, with a 14.59% largest drop.',
    '- QQQ buy and hold: +49.46% total return, with a 22.88% largest drop.', '',
    'These are simulated results, not returns from real accounts. The simulation used modeled option prices and includes a test-phase SMH put-spread sleeve. The rules were developed with hindsight, and one favorable two-year window does not show how it would behave elsewhere.', '',
    'That is why the sample shows the rules, the assumptions and the limitations next to the numbers, and why every published signal is timestamped in a public ledger. Check it yourself:', '',
    `Inspect the assumptions: https://trademind.bot/advisers/sample?r=${token}&s=independent`,
    'Check the public ledger: https://trademind.bot/verify/ledger', '',
    'No sign-up or brokerage connection. If you find a flaw in the method, I would like to hear it.', '',
    'Eric Huang', 'Founder, TradeMind', 'Queens, New York', '',
    'You are receiving this at your business address because of your work as an investment professional. To stop these emails, reply "unsubscribe". Any performance figures on the linked pages are simulated, not results from real accounts.',
    'TradeMind, 151-58 24th Rd, Whitestone, NY 11357',
].join('\n');

export async function GET(req: NextRequest) {
    const expected = process.env.CRON_SECRET;
    if (!expected || req.headers.get('authorization') !== `Bearer ${expected}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        await ensureOutreachTables();
        await query(`CREATE TABLE IF NOT EXISTS outreach_domain_tests (
            id SERIAL PRIMARY KEY, day DATE NOT NULL, domain TEXT NOT NULL, kind TEXT NOT NULL,
            status TEXT NOT NULL, detail TEXT, message_id TEXT, sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            UNIQUE (day, domain, kind))`);
        // Seed contact for the test inbox, created once. Wave 'seed' keeps it out of every real send plan.
        let tok = (await query(`SELECT token FROM outreach_contacts WHERE lower(email) = $1 AND wave = 'seed'`, [TEST_TO])).rows[0]?.token as string | undefined;
        if (!tok) {
            tok = randomBytes(8).toString('hex').slice(0, 10);
            await query(`INSERT INTO outreach_contacts (token, email, first_name, st, segment, template, wave, tz, status)
                         VALUES ($1, $2, 'Eric', 'NY', 'SEED', 'T1', 'seed', 'America/New_York', 'pending')`, [tok, TEST_TO]);
        }
        const s = await getSettings();
        const doms = (await query(`SELECT domain, from_local FROM outreach_domains WHERE transport = 'sendgrid' ORDER BY domain`)).rows as { domain: string; from_local: string }[];
        const jobs: { domain: string; local: string; kind: 'retail' | 'adviser' }[] = [];
        for (const d of doms) {
            if (ADVISER_DOMAINS.includes(d.domain)) jobs.push({ domain: d.domain, local: d.from_local || 'eric', kind: 'adviser' });
            jobs.push({ domain: d.domain, local: d.from_local || 'eric', kind: 'retail' });
        }
        for (const ad of ADVISER_DOMAINS) if (!jobs.some((j) => j.domain === ad && j.kind === 'adviser')) jobs.push({ domain: ad, local: 'eric', kind: 'adviser' });
        const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date());
        const out: { domain: string; kind: string; status: string }[] = [];
        for (const j of jobs) {
            const done = await query(`SELECT 1 FROM outreach_domain_tests WHERE day = $1 AND domain = $2 AND kind = $3`, [day, j.domain, j.kind]);
            if (done.rowCount) { out.push({ domain: j.domain, kind: j.kind, status: 'already sent today' }); continue; }
            let subject: string, text: string, html: string | null = null, display: string;
            if (j.kind === 'retail') {
                const m = renderV8({ token: tok, firstName: 'Eric', baseUrl: 'https://trademind.bot', mailingAddress: MAILING_ADDRESS, sigSep: '-'.repeat(2), useHtml: s.html_enabled === 'true', force: 'C' });
                subject = m.subject; text = m.text; html = m.html;
                display = s.from_display || 'Eric Huang';
            } else {
                subject = 'A QQQ simulation worth checking'; text = ADVISER_BODY(tok); display = 'Eric Huang';
            }
            const r = await sendMail({
                transport: 'sendgrid', from: `${display} <${j.local}@${j.domain}>`, to: TEST_TO, subject, text, html,
                headers: { 'X-TradeMind-Domain-Test': `${j.domain}/${j.kind}` }, token: tok, step: 900, campaign: `${CAMPAIGN}-domain-test`,
            });
            await query(`INSERT INTO outreach_domain_tests (day, domain, kind, status, detail, message_id) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING`,
                [day, j.domain, j.kind, r.ok ? 'sent' : 'failed', r.ok ? null : `${r.status} ${r.body}`.slice(0, 300), r.id]);
            out.push({ domain: j.domain, kind: j.kind, status: r.ok ? 'sent' : `failed ${r.status}` });
        }
        return NextResponse.json({ ok: true, day, results: out });
    } catch (err) {
        console.error('[cron/domain-tests]', err);
        return NextResponse.json({ error: 'Domain tests failed' }, { status: 500 });
    }
}
