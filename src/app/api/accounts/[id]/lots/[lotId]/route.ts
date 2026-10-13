import { NextRequest, NextResponse } from 'next/server';
import { getAccount } from '@/lib/accounts';
import { getUserId } from '@/lib/auth';
import {
    skipLot, partialFillLot, repriceEntry, differentContractLot, stillHoldingLot, soldAtPrice, LotError,
} from '@/lib/option-lots';

// PATCH /api/accounts/[id]/lots/[lotId]
// body: { action: 'skip' | 'partial' | 'reprice' | 'different_contract' | 'still_holding' | 'sold_at', ...fields }
// Members correct their own virtual account to match what really happened at their broker.
// Changes only touch this account; the public track record is computed from the model.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; lotId: string }> }) {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id, lotId: lotParam } = await params;
    const accountId = Number(id);
    const lotId = Number(lotParam);
    if (!Number.isInteger(accountId) || accountId <= 0 || !Number.isInteger(lotId) || lotId <= 0) {
        return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }
    const account = await getAccount(accountId, userId);
    if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

    try {
        const b = await req.json();
        switch (b?.action) {
            case 'skip': await skipLot(accountId, lotId); break;
            case 'partial': await partialFillLot(accountId, lotId, Number(b.contracts), b.price != null && b.price !== '' ? Number(b.price) : undefined); break;
            case 'reprice': await repriceEntry(accountId, lotId, Number(b.price)); break;
            case 'different_contract':
                await differentContractLot(accountId, lotId, {
                    strike: Number(b.strike), expiry: String(b.expiry || ''), price: Number(b.price),
                    contracts: b.contracts != null && b.contracts !== '' ? Number(b.contracts) : undefined,
                });
                break;
            case 'still_holding': await stillHoldingLot(accountId, lotId); break;
            case 'sold_at': await soldAtPrice(accountId, lotId, Number(b.price)); break;
            default: return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
        }
        return NextResponse.json({ success: true });
    } catch (err) {
        if (err instanceof LotError) return NextResponse.json({ error: err.message }, { status: 400 });
        console.error('[accounts/lots] adjust failed:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
