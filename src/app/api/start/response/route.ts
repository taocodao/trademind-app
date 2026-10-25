import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getContact, validToken } from '@/lib/outreach/db';
import { ensureStartTables } from '@/lib/start/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** POST { t, value: 'a'|'b'|'c', note? }: the answer to the challenge question. */
export async function POST(req: NextRequest) {
    try {
        const b = await req.json();
        const t = String(b.t ?? ''), value = String(b.value ?? '');
        if (!validToken(t) || !['a', 'b', 'c'].includes(value) || !(await getContact(t))) return NextResponse.json({ ok: false }, { status: 400 });
        await ensureStartTables();
        const note = typeof b.note === 'string' ? b.note.trim().slice(0, 500) : null;
        if (!note) {
            const dup = await pool.query(`SELECT 1 FROM start_response WHERE token = $1 AND kind = 'challenge' AND value = $2 AND note IS NULL LIMIT 1`, [t, value]);
            if (dup.rowCount) return NextResponse.json({ ok: true });
        }
        await pool.query(`INSERT INTO start_response (token, kind, value, note) VALUES ($1, 'challenge', $2, $3)`, [t, value, note]);
        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ ok: false }, { status: 400 });
    }
}
