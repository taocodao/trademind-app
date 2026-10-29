import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { ACTIVITY_GRACE_DAYS, MAX_ACTIVITIES, activityDue, daysBetween, freeAccessEnd } from '@/lib/program/rules';
import { loadParticipant, verifiedEmail } from '@/lib/program/session';

export const dynamic = 'force-dynamic';

/**
 * POST { action: 'path', path: 'free' }  (step away from the preview)
 *      { action: 'activity', month, answers }
 *      { action: 'leave' }
 * Only the signed-in, verified owner of the participant record can act. Nothing here charges anyone.
 */
export async function POST(req: NextRequest) {
    const email = await verifiedEmail(req);
    if (!email) return NextResponse.json({ error: 'Sign in with a verified email.' }, { status: 401 });
    const p = await loadParticipant(email);
    if (!p) return NextResponse.json({ error: 'No program membership for this email.' }, { status: 404 });
    const b = await req.json().catch(() => ({}));
    const now = new Date().toISOString();

    if (b.action === 'path') {
        // The only choice left is to step away. Buying a plan happens on the plans page.
        if (b.path !== 'free') return NextResponse.json({ error: 'Invalid choice.' }, { status: 400 });
        await pool.query(`UPDATE program_participant SET path = 'free', left_at = NOW() WHERE id = $1`, [p.id]);
        const left = await loadParticipant(email);
        if (left) await pool.query(`UPDATE entitlement SET ends_at = $2 WHERE email_norm = $1 AND source = 'program_preview'`, [email, freeAccessEnd(left)]);
        return NextResponse.json({ ok: true });
    }

    if (b.action === 'activity') {
        const month = Number(b.month);
        if (p.path === 'free' || !(month >= 1 && month <= MAX_ACTIVITIES)) return NextResponse.json({ error: 'Not available.' }, { status: 400 });
        const due = activityDue(p.started_at, month);
        if (now < due) return NextResponse.json({ error: 'This activity is not open yet.' }, { status: 400 });
        if (daysBetween(due, now) > ACTIVITY_GRACE_DAYS && !p.completed_months.includes(month)) return NextResponse.json({ error: 'The grace period for this activity has passed.' }, { status: 410 });
        const answers = typeof b.answers === 'object' && b.answers ? b.answers : {};
        const ins = await pool.query(
            `INSERT INTO program_activity (participant_id, month, answers) VALUES ($1, $2, $3) ON CONFLICT (participant_id, month) DO NOTHING RETURNING 1`,
            [p.id, month, JSON.stringify(answers).slice(0, 8000)]
        );
        if (ins.rows[0]) {
            const fresh = await loadParticipant(email);
            if (fresh) {
                await pool.query(`UPDATE entitlement SET ends_at = $2 WHERE email_norm = $1 AND source = 'program_preview'`, [email, freeAccessEnd(fresh)]);
            }
        }
        return NextResponse.json({ ok: true });
    }

    if (b.action === 'leave') {
        await pool.query(`UPDATE program_participant SET left_at = NOW() WHERE id = $1`, [p.id]);
        const gone = await loadParticipant(email);
        if (gone) await pool.query(`UPDATE entitlement SET ends_at = $2 WHERE email_norm = $1 AND source = 'program_preview'`, [email, freeAccessEnd(gone)]); // months stayed plus 3 per survey passed
        return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
}
