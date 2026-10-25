import { NextRequest, NextResponse } from 'next/server';
import { accessNow, freeAccessEnd, billingStart, PRICES, activityDue } from '@/lib/program/rules';
import { loadParticipant, verifiedEmail } from '@/lib/program/session';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const email = await verifiedEmail(req);
    if (!email) return NextResponse.json({ error: 'Sign in with a verified email.' }, { status: 401 });
    const p = await loadParticipant(email);
    if (!p || p.left_at) return NextResponse.json({ member: false, email });
    const now = new Date().toISOString();
    const activities = [1, 2, 3, 4, 5, 6].map((m) => ({ month: m, due: activityDue(p.started_at, m), done: p.completed_months.includes(m) }));
    return NextResponse.json({
        member: true, email, path: p.path, access: accessNow(p, now),
        free_access_ends: freeAccessEnd(p), billing_starts: billingStart(p),
        can_check_out: p.path === 'founding' && !p.paid_started_at && now >= billingStart(p),
        paid: Boolean(p.paid_started_at), prices: PRICES, activities,
    });
}
