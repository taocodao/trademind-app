import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { etDate, etMinutes, isMarketDay, schedule } from '@/lib/briefing/calendar';
import { ensureBriefingTables } from '@/lib/briefing/db';
import { buildFacts, lockFacts } from '@/lib/briefing/facts';
import { assemble, draftCommentary } from '@/lib/briefing/assemble';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Daily briefing builder. Phase 1: internal only. It locks the facts record, drafts the daily briefing and
 * the strategy alert, runs the wording checks and stores the drafts for review. It never emails anyone.
 * Two schedules (19:10 and 20:10 UTC on weekdays) cover daylight and standard time; the run is idempotent
 * and waits until 3:05 PM Eastern.
 *   ?dry=1   build and return the draft without storing anything
 *   ?date=YYYY-MM-DD  use another date (with dry=1 only)
 */
export async function GET(req: NextRequest) {
    const expected = process.env.CRON_SECRET;
    if (!expected || req.headers.get('authorization') !== `Bearer ${expected}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const url = new URL(req.url);
    const dry = url.searchParams.get('dry') === '1';
    const date = dry && url.searchParams.get('date') ? String(url.searchParams.get('date')) : etDate();

    if (!isMarketDay(date)) return NextResponse.json({ skipped: 'not a market day', date });
    if (!dry && etMinutes() < schedule(date).run + 5) return NextResponse.json({ skipped: 'too early', date });

    await ensureBriefingTables();
    if (!dry) {
        const done = await pool.query(`SELECT 1 FROM briefing_issue WHERE run_date = $1::date AND kind = 'daily'`, [date]);
        if (done.rows[0]) return NextResponse.json({ skipped: 'already built', date });
    }

    const facts = dry ? await buildFacts(date) : await lockFacts(date);
    const commentary = await draftCommentary(facts);
    const daily = assemble(facts, 'daily', commentary);
    const drafts = [daily];
    if (facts.strategies.some((s) => s.status === 'CHANGE')) drafts.push(assemble(facts, 'alert', null));

    if (dry) return NextResponse.json({ dry: true, date, facts, drafts });

    for (const d of drafts) {
        await pool.query(
            `INSERT INTO briefing_issue (run_date, kind, status, subject, text_body, html_body, commentary, status_only, checks, facts_hash)
             VALUES ($1::date, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT (run_date, kind) DO NOTHING`,
            [date, d.kind, d.pass ? 'draft' : 'held', d.subject, d.text, d.html, d.commentary, d.status_only, JSON.stringify(d.checks), facts.hash]
        );
    }
    return NextResponse.json({ built: drafts.map((d) => ({ kind: d.kind, pass: d.pass, status_only: d.status_only })), date });
}
