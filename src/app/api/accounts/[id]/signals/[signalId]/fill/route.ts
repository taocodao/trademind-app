import { NextRequest, NextResponse } from 'next/server';
import { getAccount } from '@/lib/accounts';
import { confirmSignalFill, clearSignalFillConfirmation } from '@/lib/signal-fills';
import { getUserId } from '@/lib/auth';

// POST /api/accounts/[id]/signals/[signalId]/fill — member reports their broker
// fill prices; the virtual account re-prices the signal's orders accordingly.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; signalId: string }> }) {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id, signalId } = await params;
    const accountId = Number(id);
    if (!Number.isInteger(accountId) || accountId <= 0) {
        return NextResponse.json({ error: 'Invalid account id' }, { status: 400 });
    }

    const account = await getAccount(accountId, userId);
    if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

    try {
        const body = await req.json();
        const fills = Array.isArray(body?.fills) ? body.fills : [];
        const result = await confirmSignalFill(accountId, signalId, fills, body?.note ?? null);
        if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('[accounts/signals/fill] confirm failed:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE /api/accounts/[id]/signals/[signalId]/fill — undo a reported fill,
// restoring the model prices on the signal's orders.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; signalId: string }> }) {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id, signalId } = await params;
    const accountId = Number(id);
    if (!Number.isInteger(accountId) || accountId <= 0) {
        return NextResponse.json({ error: 'Invalid account id' }, { status: 400 });
    }

    const account = await getAccount(accountId, userId);
    if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

    try {
        const result = await clearSignalFillConfirmation(accountId, signalId);
        if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('[accounts/signals/fill] undo failed:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
