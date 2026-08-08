import { NextRequest, NextResponse } from 'next/server';
import { getAccount, getAccountActivities, addManualActivity, type ActivityType } from '@/lib/accounts';
import { getUserId } from '@/lib/auth';

// GET /api/accounts/[id]/activities — the account's activity ledger
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const accountId = Number(id);

    const account = await getAccount(accountId, userId);
    if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '100', 10);
    const activities = await getAccountActivities(accountId, limit);
    return NextResponse.json({ account, activities });
}

// POST /api/accounts/[id]/activities — add a manual activity (trade or cash adjustment)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const accountId = Number(id);

    const account = await getAccount(accountId, userId);
    if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

    try {
        const body = await req.json();
        const { type, symbol, quantity, price, note } = body;

        if (!['buy', 'sell', 'deposit', 'withdraw'].includes(type)) {
            return NextResponse.json({ error: 'Invalid activity type' }, { status: 400 });
        }
        const t = type as ActivityType;
        const isTrade = t === 'buy' || t === 'sell';

        if (isTrade) {
            if (!symbol || typeof symbol !== 'string') {
                return NextResponse.json({ error: 'Symbol is required for a trade' }, { status: 400 });
            }
            const qty = Number(quantity);
            const px = Number(price);
            if (!isFinite(qty) || qty <= 0) return NextResponse.json({ error: 'Quantity must be positive' }, { status: 400 });
            if (!isFinite(px) || px < 0) return NextResponse.json({ error: 'Price must be non-negative' }, { status: 400 });
            await addManualActivity(accountId, { type: t, symbol: symbol.trim().toUpperCase(), quantity: qty, price: px, note });
        } else {
            const amt = Number(quantity); // cash amount carried in `quantity`
            if (!isFinite(amt) || amt <= 0) return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 });
            await addManualActivity(accountId, { type: t, quantity: amt, note });
        }

        return NextResponse.json({ success: true }, { status: 201 });
    } catch (err) {
        console.error('[accounts/activities] add failed:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
