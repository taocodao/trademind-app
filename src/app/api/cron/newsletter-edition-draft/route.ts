import { NextRequest, NextResponse } from 'next/server';
import { etDate, isMarketDay } from '@/lib/briefing/calendar';
import { ensureBriefingTables } from '@/lib/briefing/db';
import { lockFacts } from '@/lib/briefing/facts';
import { buildEdition, dailyReadiness } from '@/lib/newsletter/pipeline/build';
import { mailOwner } from '@/lib/newsletter/weekly';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;

/**
 * Builds the weekly issue. It never emails subscribers; the weekly sender does that, one subscriber at a time. A passing issue is published at once and a copy goes to the owner.
 *   ?kind=weekly   the next Monday edition (built Sunday evening, or on Monday itself)
 *   ?kind=daily    waits for both strategy runs (or the late deadline), locks the facts record, builds the day's draft
 * The run is idempotent per kind and date.
 */
export async function GET(req: NextRequest) {
    const expected = process.env.CRON_SECRET;
    if (!expected || req.headers.get('authorization') !== `Bearer ${expected}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (req.nextUrl.searchParams.get('kind') === 'daily') return NextResponse.json({ skipped: 'the daily brief is retired' });
    const kind = 'weekly' as 'daily' | 'weekly';
    if (kind === 'weekly') {
        const d = new Date(`${etDate()}T12:00:00Z`);
        const dow = d.getUTCDay(); // 0 Sunday, 1 Monday
        if (dow !== 0 && dow !== 1) return NextResponse.json({ skipped: 'weekly drafts are built Sunday evening or Monday' });
        if (dow === 0) d.setUTCDate(d.getUTCDate() + 1);
        const date = d.toISOString().slice(0, 10);
        const built = await buildEdition('weekly', date);
        // A weekly issue publishes on its own when every check passes. The owner gets a copy, or a note if it was held or not built.
        await mailOwner(date, built);
        return NextResponse.json({ kind, date, ...built });
    }
    const date = etDate();
    if (!isMarketDay(date)) return NextResponse.json({ skipped: 'not a market day', date });
    await ensureBriefingTables();
    const ready = await dailyReadiness(date);
    if (!ready.ready) return NextResponse.json({ skipped: 'strategy runs not in yet', date, ...ready });
    const facts = await lockFacts(date);
    return NextResponse.json({ kind, date, readiness: ready, ...(await buildEdition('daily', date, facts.hash)) });
}
