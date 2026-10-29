import { NextRequest, NextResponse } from 'next/server';
import { etDate, etMinutes, isMarketDay, schedule } from '@/lib/briefing/calendar';
import { ensureBriefingTables } from '@/lib/briefing/db';
import { buildDailyFacts, dailyRecipients, sendOne, renderForRecipient } from '@/lib/newsletter/daily-brief';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const TEST_ADDRESSES = new Set(['web3aistore@gmail.com', 'web3aistore1@gmail.com', 'web3aistore2@gmail.com', 'web3aistore3@gmail.com', 'web3aistore4@gmail.com',
    'testtrademind@gmail.com', 'erichuang2005@gmail.com', 'eric@vochat.ai', 'eric@vochat.com', 'eric@arenza.tv', 'eric@trademind.bot', 'eric@taocodao.com']);
const BATCH = 120;

/**
 * Daily brief send. Not scheduled in vercel.json until the owner approves.
 *   ?dry=1                    count recipients and show the first subject, send nothing (works any day)
 *   ?to=<test address>        send one preview to an approved test address, rendered as that subscriber
 *   (no params)               real send, only when DAILY_BRIEF_SEND_ENABLED=1, on market days after 3:30 PM ET,
 *                             at most 120 readers per call; the ledger stops double sends, so repeat calls continue the run.
 */
export async function GET(req: NextRequest) {
    const expected = process.env.CRON_SECRET;
    if (!expected || req.headers.get('authorization') !== `Bearer ${expected}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const q = req.nextUrl.searchParams;
    const dry = q.get('dry') === '1';
    const to = q.get('to')?.toLowerCase() ?? null;
    const date = dry && q.get('date') ? String(q.get('date')) : etDate();
    await ensureBriefingTables();

    if (to) {
        if (!TEST_ADDRESSES.has(to)) return NextResponse.json({ error: 'Not an approved test address' }, { status: 400 });
        const { facts, hash } = await buildDailyFacts(date, false);
        const rcp = (await dailyRecipients({ limit: 1, date, onlyEmail: to }))[0] ?? { id: 0, email: to, firstName: null, account: null };
        const r = await sendOne(rcp, facts, date, hash, to);
        return NextResponse.json({ preview: true, to, withAccount: !!rcp.account, ...r });
    }
    if (dry) {
        const { facts } = await buildDailyFacts(date, false);
        const rcps = await dailyRecipients({ limit: 5000, date });
        const first = rcps[0] ? await renderForRecipient(rcps[0], facts, date) : null;
        return NextResponse.json({ dry: true, date, status: facts.status, recipients: rcps.length, withAccount: rcps.filter((x) => x.account).length, firstSubject: first?.subject ?? null });
    }
    if (process.env.DAILY_BRIEF_SEND_ENABLED !== '1') return NextResponse.json({ skipped: 'daily brief sending is off' });
    if (!isMarketDay(date)) return NextResponse.json({ skipped: 'not a market day', date });
    if (etMinutes() < schedule(date).send) return NextResponse.json({ skipped: 'too early', date });

    const { facts, hash } = await buildDailyFacts(date, true);
    const rcps = await dailyRecipients({ limit: BATCH, date });
    let sent = 0, failed = 0;
    for (const rcp of rcps) { const r = await sendOne(rcp, facts, date, hash); if (r.ok) sent++; else failed++; await new Promise((res) => setTimeout(res, 400)); }
    return NextResponse.json({ date, status: facts.status, batch: rcps.length, sent, failed, more: rcps.length === BATCH });
}
