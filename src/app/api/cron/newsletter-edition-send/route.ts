import { NextRequest, NextResponse } from 'next/server';
import { etDate, etMinutes, isMarketDay } from '@/lib/briefing/calendar';
import { ensureBriefingTables } from '@/lib/briefing/db';
import { lockFacts } from '@/lib/briefing/facts';
import { editionApproval, type PublicPayload } from '@/lib/newsletter/pipeline/build';
import { pendingRecipients, renderFor, sendRendered } from '@/lib/newsletter/pipeline/send';
import { ensureEditionTables } from '@/lib/newsletter/pipeline/db';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const TEST_ADDRESSES = new Set(['web3aistore@gmail.com', 'web3aistore1@gmail.com', 'web3aistore2@gmail.com', 'web3aistore3@gmail.com', 'web3aistore4@gmail.com',
    'testtrademind@gmail.com', 'testtrademindnewsletter@gmail.com', 'testtrademindspam1@gmail.com', 'ericyaohuang@gmail.com', 'erichuang2005@gmail.com',
    'eric@vochat.ai', 'eric@vochat.com', 'eric@arenza.tv', 'eric@trademind.bot', 'eric@taocodao.com']);
const BATCH = 400;

/**
 * Sends an approved edition from the outbox. Off unless NEWSLETTER_EDITIONS_ENABLED=1.
 *   ?kind=weekly|daily
 *   ?dry=1               count recipients, send nothing
 *   ?to=<test address>   send a preview of the edition (draft or approved) to an approved test address, rendered for that subscriber
 * Weekly goes out on Monday from 8:00 AM ET. Daily goes out once approved. Repeat calls continue a run; the outbox stops double sends.
 */
export async function GET(req: NextRequest) {
    const expected = process.env.CRON_SECRET;
    if (!expected || req.headers.get('authorization') !== `Bearer ${expected}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const q = req.nextUrl.searchParams;
    if (q.get('kind') !== 'daily' && !q.get('to') && q.get('dry') !== '1') return NextResponse.json({ skipped: 'weekly issues are sent one subscriber at a time by the weekly sender' });
    if (q.get('kind') === 'daily') return NextResponse.json({ skipped: 'the daily brief is retired' });
    const kind = 'weekly' as 'daily' | 'weekly';
    const dry = q.get('dry') === '1'; const to = q.get('to')?.toLowerCase() ?? null;
    const date = (dry || to) && q.get('date') ? String(q.get('date')) : etDate();
    await ensureEditionTables(); await ensureBriefingTables();
    const facts = kind === 'daily' ? await lockFacts(date) : null;

    if (to) {
        if (!TEST_ADDRESSES.has(to)) return NextResponse.json({ error: 'Not an approved test address' }, { status: 400 });
        const e = (await pool.query(`SELECT * FROM newsletter_edition WHERE kind = $1 AND edition_date = $2::date`, [kind, date])).rows[0];
        if (!e) return NextResponse.json({ error: 'no edition for this date' }, { status: 404 });
        const rcp = (await pendingRecipients(e.id, kind, 1, to))[0] ?? { subscriberId: 0, email: to, accountId: 0, account: null };
        const m = await renderFor(rcp, kind, e.payload as PublicPayload, date, facts);
        const r = await sendRendered(e.id, rcp, m, to);
        return NextResponse.json({ preview: true, to, withAccount: !!rcp.account, subject: m.subject, ...r });
    }
    const ap = await editionApproval(kind, date, facts?.hash ?? null);
    if (dry) {
        if (!ap.ok) return NextResponse.json({ dry: true, date, approved: false, reason: ap.reason });
        const rcps = await pendingRecipients(ap.edition.id, kind, 100000);
        return NextResponse.json({ dry: true, date, approved: true, subject: ap.edition.subject, recipients: rcps.length, withAccount: rcps.filter((x) => x.account).length });
    }
    if (process.env.NEWSLETTER_EDITIONS_ENABLED !== '1') return NextResponse.json({ skipped: 'edition sending is off' });
    if (kind === 'weekly') {
        if (new Date(`${date}T12:00:00Z`).getUTCDay() !== 1) return NextResponse.json({ skipped: 'weekly sends on Monday', date });
        if (etMinutes() < 8 * 60) return NextResponse.json({ skipped: 'too early, weekly sends from 8:00 AM ET', date });
    } else if (!isMarketDay(date)) return NextResponse.json({ skipped: 'not a market day', date });
    if (!ap.ok) return NextResponse.json({ skipped: 'not approved', reason: ap.reason, date });

    const rcps = await pendingRecipients(ap.edition.id, kind, BATCH);
    let sent = 0, failed = 0;
    for (const rcp of rcps) {
        const m = await renderFor(rcp, kind, ap.edition.payload as PublicPayload, date, facts);
        const r = await sendRendered(ap.edition.id, rcp, m);
        if (r.ok) sent++; else failed++;
        await new Promise((res) => setTimeout(res, 400));
    }
    if (rcps.length < BATCH) await pool.query(`UPDATE newsletter_edition SET status = 'sent' WHERE id = $1 AND status = 'approved'`, [ap.edition.id]);
    return NextResponse.json({ date, kind, batch: rcps.length, sent, failed, more: rcps.length === BATCH });
}
