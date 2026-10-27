import { NextRequest, NextResponse } from 'next/server';
import { accessNow, freeAccessEnd, activityDue, MAX_ACTIVITIES } from '@/lib/program/rules';
import { loadParticipant, verifiedEmail } from '@/lib/program/session';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const email = await verifiedEmail(req);
    if (!email) return NextResponse.json({ error: 'Sign in with a verified email.' }, { status: 401 });
    const p = await loadParticipant(email);
    if (!p || p.left_at) return NextResponse.json({ member: false, email });
    const now = new Date().toISOString();
    const activities = Array.from({ length: MAX_ACTIVITIES }, (_, i) => i + 1).map((m) => ({ month: m, due: activityDue(p.started_at, m), done: p.completed_months.includes(m) }));
    return NextResponse.json({
        member: true, email, path: p.path, access: accessNow(p, now),
        free_access_ends: freeAccessEnd(p),
        paid: Boolean(p.paid_started_at), activities,
    });
}
