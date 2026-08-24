import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { applyVestedReferral } from '@/lib/referrals';

// POST /api/referrals/apply — apply part or all of a vested referrer grant
// to a chosen account. Body: { eventId: string, accountId: number, dollars: number }.
// The reward account and amount are chosen at apply time, so members can
// share their link before any account exists.
export async function POST(req: NextRequest) {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await req.json();
        const eventId = String(body?.eventId ?? '');
        const accountId = Number(body?.accountId);
        if (!eventId || !Number.isInteger(accountId) || accountId <= 0) {
            return NextResponse.json({ error: 'eventId and accountId are required' }, { status: 400 });
        }

        const dollars = Number(body?.dollars);
        const result = await applyVestedReferral(userId, eventId, accountId, dollars);
        return NextResponse.json({ ok: true, ...result });
    } catch (err: any) {
        const message = err?.message ?? 'Unable to apply reward';
        const status = /not found/i.test(message) ? 404
            : /fully applied|not available/i.test(message) ? 409
            : /amount|remains|one day/i.test(message) ? 400
            : 500;
        return NextResponse.json({ error: message }, { status });
    }
}
