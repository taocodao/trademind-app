import { NextRequest, NextResponse } from 'next/server';
import { getAccount, reverseActivity, editActivity, type ActivityType } from '@/lib/accounts';
import { getUserId } from '@/lib/auth';

// PATCH /api/accounts/[id]/activities/[activityId], edit an activity (reverses + reapplies)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; activityId: string }> }) {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id, activityId } = await params;
    const accountId = Number(id);

    const account = await getAccount(accountId, userId);
    if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

    try {
        const body = await req.json();
        const updated: any = {};
        if (body.type && ['buy', 'sell', 'deposit', 'withdraw'].includes(body.type)) updated.type = body.type as ActivityType;
        if (body.symbol !== undefined) updated.symbol = body.symbol ? String(body.symbol).trim().toUpperCase() : null;
        if (body.quantity !== undefined) updated.quantity = Number(body.quantity);
        if (body.price !== undefined) updated.price = Number(body.price);
        if (body.note !== undefined) updated.note = body.note;

        const ok = await editActivity(accountId, Number(activityId), updated);
        if (!ok) return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('[accounts/activities] edit failed:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE /api/accounts/[id]/activities/[activityId], delete (reverses its effect)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; activityId: string }> }) {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id, activityId } = await params;
    const accountId = Number(id);

    const account = await getAccount(accountId, userId);
    if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

    const ok = await reverseActivity(accountId, Number(activityId));
    if (!ok) return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    return NextResponse.json({ success: true });
}
