import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { ensureStartTables } from '@/lib/start/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const KINDS = ['verify', 'challenge', 'advice', 'feedback', 'error'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** POST: a verification finding, challenge, advice, feedback or error report. Stored for review. Nothing is sent. */
export async function POST(req: NextRequest) {
    try {
        const b = await req.json();
        if (b.website) return NextResponse.json({ ok: true }); // honeypot
        const kind = String(b.kind ?? '');
        const email = String(b.email ?? '').trim().toLowerCase().slice(0, 200);
        const body = String(b.body ?? '').trim().slice(0, 4000);
        if (!KINDS.includes(kind) || !EMAIL_RE.test(email) || body.length < 20) return NextResponse.json({ error: 'Please check the form and try again.' }, { status: 400 });
        await ensureStartTables();
        const recent = await pool.query(`SELECT COUNT(*)::int AS n FROM start_submission WHERE email = $1 AND created_at > NOW() - INTERVAL '1 day'`, [email]);
        if (recent.rows[0].n >= 5) return NextResponse.json({ error: 'That is the daily limit. Please try again tomorrow.' }, { status: 429 });
        const name = String(b.name ?? '').trim().slice(0, 80) || null;
        const tok = /^[A-Za-z0-9_-]{10,11}$/.test(String(b.t ?? '')) ? String(b.t) : null;
        await pool.query(
            `INSERT INTO start_submission (kind, name, email, body, public_credit, token) VALUES ($1, $2, $3, $4, $5, $6)`,
            [kind, name, email, body, !!b.public_credit, tok]
        );
        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
    }
}
