import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { ACTIVITY_GRACE_DAYS, PREVIEW_DAYS, activityDue, addDays, daysBetween, freeAccessEnd } from '@/lib/program/rules';
import { loadParticipant, verifiedEmail } from '@/lib/program/session';

export const dynamic = 'force-dynamic';

/**
 * POST { action: 'path', path: 'partner' | 'founding' | 'free', level?, interval? }
 *      { action: 'activity', month, answers }
 *      { action: 'leave' }
 * Only the signed-in, verified owner of the participant record can act. Nothing here charges anyone.
 */
export async function POST(req: NextRequest) {
    const email = await verifiedEmail(req);
    if (!email) return NextResponse.json({ error: 'Sign in with a verified email.' }, { status: 401 });
    const p = await loadParticipant(email);
    if (!p || p.left_at) return NextResponse.json({ error: 'No program membership for this email.' }, { status: 404 });
    const b = await req.json().catch(() => ({}));
    const now = new Date().toISOString();

    if (b.action === 'path') {
        if (p.paid_started_at) return NextResponse.json({ error: 'Already a paying member.' }, { status: 409 });
        if (!['partner', 'founding', 'free'].includes(b.path)) return NextResponse.json({ error: 'Invalid choice.' }, { status: 400 });
        // The choice screen opens on day 23 (the notice) and stays open until the offer window closes 30 days after free access ends.
        if (new Date(now) > new Date(addDays(freeAccessEnd(p), 30))) return NextResponse.json({ error: 'The founding offer window has closed.' }, { status: 410 });
        if (b.path === 'founding') {
            const level = b.level === 'tracking' ? 'tracking' : 'research';
            const interval = b.interval === 'year' ? 'year' : 'month';
            await pool.query(
                `UPDATE program_participant SET path = 'founding', founding_selected_at = COALESCE(founding_selected_at, NOW()), founding_level = $2, founding_interval = $3 WHERE id = $1`,
                [p.id, level, interval]
            );
        } else {
            await pool.query(`UPDATE program_participant SET path = $2 WHERE id = $1`, [p.id, b.path]);
        }
        if (b.path === 'free') {
            await pool.query(`UPDATE entitlement SET ends_at = LEAST(COALESCE(ends_at, NOW()), NOW()) WHERE email_norm = $1 AND source = 'program_preview'`, [email]);
        }
        return NextResponse.json({ ok: true });
    }

    if (b.action === 'activity') {
        const month = Number(b.month);
        if (p.path !== 'partner' || !(month >= 1 && month <= 6)) return NextResponse.json({ error: 'Not available.' }, { status: 400 });
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
        await pool.query(`UPDATE program_participant SET left_at = NOW() WHERE id = $1`, [p.id]); // earned credit is kept in the records
        return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
}
