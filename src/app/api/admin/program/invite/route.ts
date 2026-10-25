import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { resolveAdmin } from '@/lib/admin-gate';
import { eligible, ensureInviteTable, sendInviteBatch, sendTestInvite, TEST_ADDRESSES } from '@/lib/program/invite';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;

/** GET: how many people could receive the invite, and how many were invited. */
export async function GET(req: NextRequest) {
    const gate = await resolveAdmin(req);
    if (!gate.isAdmin) return NextResponse.json({ error: gate.error || 'Forbidden' }, { status: gate.status });
    await ensureInviteTable();
    const e = await eligible();
    const invited = await pool.query(`SELECT count(*)::int AS n FROM program_invite_log`);
    return NextResponse.json({ eligible: e.list.length, include_imported: e.includeImported, invited: invited.rows[0].n, test_addresses: TEST_ADDRESSES });
}

/** POST { action: 'test', to } sends one test to an authorized address. { action: 'send', max } sends the next batch. */
export async function POST(req: NextRequest) {
    const gate = await resolveAdmin(req);
    if (!gate.isAdmin) return NextResponse.json({ error: gate.error || 'Forbidden' }, { status: gate.status });
    const b = await req.json().catch(() => ({}));
    if (b.action === 'test') return NextResponse.json(await sendTestInvite(String(b.to || '')));
    if (b.action === 'send') {
        const max = Math.min(Math.max(Number(b.max) || 25, 1), 50);
        return NextResponse.json(await sendInviteBatch(max, Number(b.wave) || 1));
    }
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
