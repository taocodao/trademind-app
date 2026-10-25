import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { ensureBriefingTables } from '@/lib/briefing/db';

export const dynamic = 'force-dynamic';

/**
 * The model engine reports each run here: { strategy, date, ok, note }. A strategy is only called "no change"
 * in the briefing when its run for the day reported ok.
 * Auth: Bearer INTERNAL_API_SECRET (same secret the EC2 publishers use).
 */
export async function POST(req: NextRequest) {
    const secret = process.env.INTERNAL_API_SECRET;
    if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const b = await req.json().catch(() => ({}));
    const strategy = String(b.strategy || '');
    const date = String(b.date || '');
    if (!['QQQ_LEAPS', 'TQQQ_TURBOCORE_PRO'].includes(strategy) || !/^\d{4}-\d{2}-\d{2}$/.test(date) || typeof b.ok !== 'boolean') {
        return NextResponse.json({ error: 'strategy, date (YYYY-MM-DD) and ok (boolean) are required' }, { status: 400 });
    }
    await ensureBriefingTables();
    await pool.query(
        `INSERT INTO engine_heartbeat (strategy, run_date, ok, note) VALUES ($1, $2::date, $3, $4)
         ON CONFLICT (strategy, run_date) DO UPDATE SET ok = $3, note = $4, reported_at = NOW()`,
        [strategy, date, b.ok, b.note ? String(b.note).slice(0, 300) : null]
    );
    return NextResponse.json({ ok: true });
}
