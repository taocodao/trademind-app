import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { resolveAdmin } from '@/lib/admin-gate';
import { ensureStartTables } from '@/lib/start/db';

export const dynamic = 'force-dynamic';

/** GET: findings submitted from the Start here pages, and counts of challenge answers. */
export async function GET(req: NextRequest) {
    const gate = await resolveAdmin(req);
    if (!gate.isAdmin) return NextResponse.json({ error: gate.error || 'Forbidden' }, { status: gate.status });
    await ensureStartTables();
    const subs = await pool.query(`SELECT id, kind, name, email, body, public_credit, status, created_at FROM start_submission ORDER BY created_at DESC LIMIT 200`);
    const ans = await pool.query(`SELECT value, COUNT(DISTINCT token)::int AS people FROM start_response WHERE kind = 'challenge' GROUP BY value ORDER BY value`);
    return NextResponse.json({ submissions: subs.rows, answers: ans.rows });
}

/** POST { id, status: 'new' | 'reviewed' | 'credited' | 'declined' } */
export async function POST(req: NextRequest) {
    const gate = await resolveAdmin(req);
    if (!gate.isAdmin) return NextResponse.json({ error: gate.error || 'Forbidden' }, { status: gate.status });
    await ensureStartTables();
    const b = await req.json().catch(() => ({}));
    if (!['new', 'reviewed', 'credited', 'declined'].includes(b.status) || !Number(b.id)) return NextResponse.json({ error: 'Bad request' }, { status: 400 });
    await pool.query(`UPDATE start_submission SET status = $2 WHERE id = $1`, [Number(b.id), b.status]);
    return NextResponse.json({ ok: true });
}
