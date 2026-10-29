import { NextRequest, NextResponse } from 'next/server';
import { resolveAdmin } from '@/lib/admin-gate';
import pool from '@/lib/db';
import { stageForAge, isStageControl, STAGES } from '@/lib/outreach/copy-seq7';

export const dynamic = 'force-dynamic';

/** Retail outreach results by life stage, with the generic-copy control group split out. */
export async function GET(req: NextRequest) {
    const gate = await resolveAdmin(req);
    if (!gate.isAdmin) return NextResponse.json({ error: gate.error || 'Forbidden' }, { status: gate.status });
    const r = await pool.query(`
        SELECT c.token, c.age, c.status, (c.subscriber_email IS NOT NULL) AS has_sub,
               EXISTS (SELECT 1 FROM outreach_sends x WHERE x.token = c.token AND x.step BETWEEN 21 AND 27 AND x.status IN ('sent','delivered')) AS sent,
               EXISTS (SELECT 1 FROM outreach_click_events e WHERE e.token = c.token AND NOT e.is_bot AND e.link_type <> 'unsub') AS clicked,
               EXISTS (SELECT 1 FROM outreach_click_events e WHERE e.token = c.token AND e.human_confirmed) AS human
        FROM outreach_contacts c WHERE c.wave IN ('W1_pilot','W2_rollout')`);
    type Row = { contacts: number; sent: number; clicked: number; human: number; signups: number; unsubscribed: number };
    const blank = (): Row => ({ contacts: 0, sent: 0, clicked: 0, human: 0, signups: 0, unsubscribed: 0 });
    const out: Record<string, { stage: Row; control: Row }> = {};
    for (const s of [...STAGES, 'unknown']) out[s] = { stage: blank(), control: blank() };
    for (const c of r.rows) {
        const st = stageForAge(c.age) ?? 'unknown';
        const b = st !== 'unknown' && isStageControl(c.token) ? out[st].control : out[st].stage;
        b.contacts++; if (c.sent) b.sent++; if (c.clicked) b.clicked++; if (c.human) b.human++;
        if (c.status === 'subscribed' || c.has_sub) b.signups++;
        if (c.status === 'unsubscribed') b.unsubscribed++;
    }
    return NextResponse.json({ stages: out, note: 'No stage is called a winner before 30 confirmed signups per variant.' });
}
