import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { resolveAdmin } from '@/lib/admin-gate';
import { contentHash, stable } from '@/lib/briefing/approval';
import { ensureEditionTables } from '@/lib/newsletter/pipeline/db';
import { checkEdition, toInput, type PublicPayload } from '@/lib/newsletter/pipeline/build';
import { renderNewsletter } from '@/lib/newsletter/edition-render';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const gate = await resolveAdmin(req);
    if (!gate.isAdmin) return NextResponse.json({ error: gate.error || 'Forbidden' }, { status: gate.status });
    await ensureEditionTables();
    const { rows } = await pool.query(`SELECT id, kind, edition_date::text AS edition_date, status, subject, payload, sources, checks, approved_by, approved_at FROM newsletter_edition ORDER BY edition_date DESC, kind LIMIT 30`);
    return NextResponse.json({ editions: rows });
}

/** POST { id, action: 'approve' | 'hold' | 'edit', payload? }. Approval stores a hash of the exact subject and payload. Any edit clears it. */
export async function POST(req: NextRequest) {
    const gate = await resolveAdmin(req);
    if (!gate.isAdmin) return NextResponse.json({ error: gate.error || 'Forbidden' }, { status: gate.status });
    await ensureEditionTables();
    const b = await req.json().catch(() => ({}));
    const id = Number(b.id); const action = String(b.action || '');
    if (!id || !['approve', 'hold', 'edit'].includes(action)) return NextResponse.json({ error: 'id and action required' }, { status: 400 });
    const e = (await pool.query(`SELECT * FROM newsletter_edition WHERE id = $1`, [id])).rows[0];
    if (!e) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (e.status === 'sent') return NextResponse.json({ error: 'Already sent' }, { status: 409 });
    let payload: PublicPayload = e.payload;
    if (action === 'edit') {
        if (!b.payload || typeof b.payload !== 'object') return NextResponse.json({ error: 'payload required' }, { status: 400 });
        payload = { ...payload, ...b.payload };
    }
    const date = String(e.edition_date instanceof Date ? e.edition_date.toISOString().slice(0, 10) : e.edition_date).slice(0, 10);
    const r = renderNewsletter(toInput(payload, date, {}));
    // An edit by a reviewer replaces the writer check; the wording checks always run again.
    const checks = checkEdition(r.subject, r.text, r.html, [], payload);
    const pass = checks.every((c) => c.pass);
    if (action === 'approve' && !pass) return NextResponse.json({ error: 'Checks failed. Edit the edition or hold it.', checks }, { status: 422 });
    const status = action === 'approve' ? 'approved' : action === 'hold' ? 'held' : pass ? 'draft' : 'held';
    await pool.query(`UPDATE newsletter_edition SET status = $2, payload = $3, subject = $4, checks = $5, approved_by = $6, approved_at = $7, approved_hash = $8 WHERE id = $1`,
        [id, status, JSON.stringify(payload), r.subject, JSON.stringify(checks), status === 'approved' ? (gate.did || 'admin') : null, status === 'approved' ? new Date() : null, status === 'approved' ? contentHash(r.subject, stable(payload)) : null]);
    return NextResponse.json({ ok: true, status, checks });
}
