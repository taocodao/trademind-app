import { NextRequest, NextResponse } from 'next/server';
import { etDate, isMarketDay } from '@/lib/briefing/calendar';
import { ensureBriefingTables } from '@/lib/briefing/db';
import { lockFacts } from '@/lib/briefing/facts';
import { buildEdition, dailyReadiness } from '@/lib/newsletter/pipeline/build';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;

/**
 * Builds a newsletter edition draft. It never emails anyone.
 *   ?kind=weekly   the next Monday edition (built Sunday evening, or on Monday itself)
 *   ?kind=daily    waits for both strategy runs (or the late deadline), locks the facts record, builds the day's draft
 * The run is idempotent per kind and date.
 */
export async function GET(req: NextRequest) {
    const expected = process.env.CRON_SECRET;
    if (!expected || req.headers.get('authorization') !== `Bearer ${expected}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const kind = req.nextUrl.searchParams.get('kind') === 'daily' ? 'daily' : 'weekly';
    if (kind === 'weekly') {
        const d = new Date(`${etDate()}T12:00:00Z`);
        const dow = d.getUTCDay(); // 0 Sunday, 1 Monday
        if (dow !== 0 && dow !== 1) return NextResponse.json({ skipped: 'weekly drafts are built Sunday evening or Monday' });
        if (dow === 0) d.setUTCDate(d.getUTCDate() + 1);
        return NextResponse.json({ kind, date: d.toISOString().slice(0, 10), ...(await buildEdition('weekly', d.toISOString().slice(0, 10))) });
    }
    const date = etDate();
    if (!isMarketDay(date)) return NextResponse.json({ skipped: 'not a market day', date });
    await ensureBriefingTables();
    const ready = await dailyReadiness(date);
    if (!ready.ready) return NextResponse.json({ skipped: 'strategy runs not in yet', date, ...ready });
    const facts = await lockFacts(date);
    return NextResponse.json({ kind, date, readiness: ready, ...(await buildEdition('daily', date, facts.hash)) });
}
