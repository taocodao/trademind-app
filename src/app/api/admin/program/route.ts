import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { resolveAdmin } from '@/lib/admin-gate';
import { ensureProgramTables } from '@/lib/program/db';
import { FIRST_GROUP, HARD_LIMIT, WAVE_SIZE_MAX, PREVIEW_DAYS, addDays } from '@/lib/program/rules';
import { sendProgramEmail } from '@/lib/program/emails';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const gate = await resolveAdmin(req);
    if (!gate.isAdmin) return NextResponse.json({ error: gate.error || 'Forbidden' }, { status: gate.status });
    await ensureProgramTables();
    const apps = await pool.query(`SELECT id, email, name, role, track, answers, status, created_at FROM program_application ORDER BY created_at DESC LIMIT 200`);
    const parts = await pool.query(`SELECT email_norm, cohort, track, path, started_at, paid_started_at FROM program_participant ORDER BY started_at DESC LIMIT 300`);
    return NextResponse.json({ applications: apps.rows, participants: parts.rows, limits: { first_group: FIRST_GROUP, wave_max: WAVE_SIZE_MAX, hard_limit: HARD_LIMIT } });
}

/** POST { action: 'accept' | 'decline', id, cohort? }. Accepting starts the 30 day preview and emails the person. */
export async function POST(req: NextRequest) {
    const gate = await resolveAdmin(req);
    if (!gate.isAdmin) return NextResponse.json({ error: gate.error || 'Forbidden' }, { status: gate.status });
    await ensureProgramTables();
    const b = await req.json().catch(() => ({}));
    const id = Number(b.id);
    if (!id || !['accept', 'decline'].includes(b.action)) return NextResponse.json({ error: 'id and action required' }, { status: 400 });
    const app = (await pool.query(`SELECT * FROM program_application WHERE id = $1`, [id])).rows[0];
    if (!app) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (b.action === 'decline') {
        await pool.query(`UPDATE program_application SET status = 'declined', decided_at = NOW() WHERE id = $1`, [id]);
        return NextResponse.json({ ok: true });
    }
    const cohort = Number(b.cohort) > 0 ? Number(b.cohort) : 1;
    const total = Number((await pool.query(`SELECT count(*) FROM program_participant WHERE left_at IS NULL`)).rows[0].count);
    const inCohort = Number((await pool.query(`SELECT count(*) FROM program_participant WHERE cohort = $1 AND left_at IS NULL`, [cohort])).rows[0].count);
    if (total >= HARD_LIMIT) return NextResponse.json({ error: `Hard limit of ${HARD_LIMIT} reached.` }, { status: 409 });
    if (inCohort >= (cohort === 1 ? FIRST_GROUP : WAVE_SIZE_MAX)) return NextResponse.json({ error: 'That group is full.' }, { status: 409 });

    const started = new Date().toISOString();
    const end = addDays(started, PREVIEW_DAYS);
    const ins = await pool.query(
        `INSERT INTO program_participant (email_norm, cohort, track, started_at) VALUES ($1, $2, $3, $4)
         ON CONFLICT (email_norm) DO NOTHING RETURNING id`, [app.email_norm, cohort, app.track, started]
    );
    await pool.query(
        `INSERT INTO entitlement (email_norm, plan, source, starts_at, ends_at) VALUES ($1, 'research_plus_tracking', 'program_preview', $2, $3)
         ON CONFLICT (email_norm, source) DO NOTHING`, [app.email_norm, started, end]
    );
    await pool.query(`UPDATE program_application SET status = 'accepted', decided_at = NOW() WHERE id = $1`, [id]);
    if (ins.rows[0]) {
        await pool.query(`INSERT INTO program_email_log (participant_id, key) VALUES ($1, 'preview_started') ON CONFLICT DO NOTHING`, [ins.rows[0].id]);
        await sendProgramEmail('accepted', { to: app.email, endDate: end });
    }
    return NextResponse.json({ ok: true, preview_ends: end });
}
