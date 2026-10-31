import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { ensureOutreachTables } from '@/lib/outreach/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Daily production placement check. For every SendGrid sending domain, find the last real email it sent to a real contact
 * (current seven-email retail or five-email adviser sequence), copy that contact's profile to a throwaway test contact on the
 * owner's test inbox, and queue the same email number for the same domain. The normal sender then renders and sends it through
 * the production path, so the copy, links, headers and sender are exactly what a real contact receives. Domains with no
 * production send yet are skipped. Test contacts use tokens starting with "dt" and are excluded from every real send plan.
 */
const TEST_LOCAL = 'testtrademindnewsletter';

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
        const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date());
        const tag = day.replace(/-/g, '');
        const doms = (await query(`SELECT domain FROM outreach_domains WHERE transport = 'sendgrid' ORDER BY domain`)).rows as { domain: string }[];
        const out: { domain: string; status: string; email?: number; audience?: string }[] = [];
        let i = 0;
        for (const d of doms) {
            i++;
            const done = await query(`SELECT 1 FROM outreach_domain_tests WHERE day = $1 AND domain = $2 AND kind = 'production'`, [day, d.domain]);
            if (done.rowCount) { out.push({ domain: d.domain, status: 'already queued today' }); continue; }
            const last = (await query(
                `SELECT s.step, c.first_name, c.st, c.zip5, c.age, c.segment, c.template, c.wave, c.tz
                 FROM outreach_sends s JOIN outreach_contacts c ON c.token = s.token
                 WHERE s.domain = $1 AND s.step BETWEEN 21 AND 27 AND s.status IN ('sent','delivered')
                   AND c.wave <> 'seed' AND c.token NOT LIKE 'dt%' AND c.token NOT LIKE 'prod%'
                 ORDER BY s.sent_at DESC LIMIT 1`, [d.domain])).rows[0];
            if (!last) {
                await query(`INSERT INTO outreach_domain_tests (day, domain, kind, status, detail) VALUES ($1,$2,'production','skipped','no production send yet') ON CONFLICT DO NOTHING`, [day, d.domain]);
                out.push({ domain: d.domain, status: 'skipped, no production send yet' });
                continue;
            }
            const token = `dt${tag}${String(i).padStart(2, '0')}`;
            const email = `${TEST_LOCAL}+${token}@gmail.com`;
            await query(
                `INSERT INTO outreach_contacts (token, email, first_name, st, zip5, age, segment, template, wave, tz, status)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'testclone') ON CONFLICT DO NOTHING`,
                [token, email, last.first_name, last.st, last.zip5, last.age, last.segment, last.template, last.wave, last.tz]);
            await query(
                `INSERT INTO outreach_queue (plan_date, token, step, domain, scheduled_at, state) VALUES ($1,$2,$3,$4, now(), 'pending') ON CONFLICT (token, step) DO NOTHING`,
                [day, token, last.step, d.domain]);
            await query(`INSERT INTO outreach_domain_tests (day, domain, kind, status, detail) VALUES ($1,$2,'production','queued',$3) ON CONFLICT DO NOTHING`,
                [day, d.domain, `email ${last.step - 20} ${last.wave === 'ria' ? 'adviser' : 'retail'}`]);
            out.push({ domain: d.domain, status: 'queued', email: last.step - 20, audience: last.wave === 'ria' ? 'adviser' : 'retail' });
        }
        return NextResponse.json({ ok: true, day, results: out });
    } catch (err) {
        console.error('[cron/domain-tests]', err);
        return NextResponse.json({ error: 'Domain tests failed' }, { status: 500 });
    }
}
