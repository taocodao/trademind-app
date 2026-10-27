import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { ensureProgramTables } from '@/lib/program/db';
import { dueEmails, freeAccessEnd } from '@/lib/program/rules';
import { sendProgramEmail } from '@/lib/program/emails';
import { loadParticipant } from '@/lib/program/session';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Daily lifecycle emails for program participants (activity due, free time ending).
 * It never starts a charge. The welcome email is sent when a person is accepted.
 *   ?dry=1  list what would be sent without sending
 */
export async function GET(req: NextRequest) {
    const expected = process.env.CRON_SECRET;
    if (!expected || req.headers.get('authorization') !== `Bearer ${expected}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const dry = new URL(req.url).searchParams.get('dry') === '1';
    await ensureProgramTables();
    const { rows } = await pool.query(`SELECT email_norm FROM program_participant WHERE left_at IS NULL`);
    const now = new Date().toISOString();
    const out: Array<{ email: string; key: string; sent: boolean }> = [];
    for (const r of rows) {
        const p = await loadParticipant(r.email_norm);
        if (!p) continue;
        const sentRows = await pool.query(`SELECT key FROM program_email_log WHERE participant_id = $1`, [p.id]);
        const sent = new Set<string>(sentRows.rows.map((x) => x.key));
        for (const d of dueEmails(p, now, sent)) {
            if (dry) { out.push({ email: p.email, key: d.key, sent: false }); continue; }
            const claim = await pool.query(`INSERT INTO program_email_log (participant_id, key) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING 1`, [p.id, d.key]);
            if (!claim.rows[0]) continue;
            const ok = await sendProgramEmail(d.kind, { to: p.email, endDate: freeAccessEnd(p), month: d.month });
            if (!ok) await pool.query(`DELETE FROM program_email_log WHERE participant_id = $1 AND key = $2`, [p.id, d.key]);
            out.push({ email: p.email, key: d.key, sent: ok });
        }
    }
    return NextResponse.json({ participants: rows.length, emails: out, dry });
}
