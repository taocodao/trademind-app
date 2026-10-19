import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { query } from '@/lib/db';

// Adviser sample page events. Stored for follow-up decisions on named contacts.
// Types: view (page load), human (a scroll, tap or key press shortly after load), chip, link, cta.
const TYPES = new Set(['view', 'human', 'chip', 'link', 'cta']);
let ready = false;
async function ensure() {
    if (ready) return;
    await query(`CREATE TABLE IF NOT EXISTS adviser_page_events (
        id BIGSERIAL PRIMARY KEY, token TEXT NOT NULL, type TEXT NOT NULL, label TEXT, ip_hash TEXT, user_agent TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await query(`CREATE INDEX IF NOT EXISTS adviser_page_events_token_idx ON adviser_page_events (token, created_at)`);
    ready = true;
}

export async function POST(req: NextRequest) {
    let b: { r?: string; type?: string; label?: string };
    try { b = await req.json(); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
    const token = String(b.r ?? '').slice(0, 64);
    if (!/^[A-Za-z0-9_-]{6,64}$/.test(token) || !TYPES.has(String(b.type))) return NextResponse.json({ ok: false }, { status: 400 });
    const label = b.label ? String(b.label).slice(0, 60) : null;
    const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim();
    const ipHash = ip ? createHash('sha256').update(ip + ':adv').digest('hex').slice(0, 16) : null;
    try {
        await ensure();
        await query(`INSERT INTO adviser_page_events (token, type, label, ip_hash, user_agent) VALUES ($1,$2,$3,$4,$5)`,
            [token, b.type, label, ipHash, (req.headers.get('user-agent') ?? '').slice(0, 200)]);
    } catch { return NextResponse.json({ ok: false }, { status: 500 }); }
    return NextResponse.json({ ok: true });
}
