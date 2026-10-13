import { NextRequest, NextResponse } from 'next/server';
import { getAccount } from '@/lib/accounts';
import { getUserId } from '@/lib/auth';
import {
    getAccountLots, getOptionMarks, addExistingHolding, LotError, MAX_LOTS_PER_ACCOUNT, EDIT_WINDOW_TRADING_DAYS,
    isWithinEditWindow,
} from '@/lib/option-lots';

// GET /api/accounts/[id]/lots, every QQQ call lot of this account with its latest mark
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const accountId = Number(id);
    if (!Number.isInteger(accountId) || accountId <= 0) return NextResponse.json({ error: 'Invalid account id' }, { status: 400 });
    const account = await getAccount(accountId, userId);
    if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

    const lots = await getAccountLots(accountId);
    const marks = await getOptionMarks(Array.from(new Set(lots.filter((l) => l.status === 'open').map((l) => l.symbol))));
    return NextResponse.json({
        maxLots: MAX_LOTS_PER_ACCOUNT,
        editWindowDays: EDIT_WINDOW_TRADING_DAYS,
        lots: lots.map((l) => ({
            ...l,
            mark: marks[l.symbol]?.mid ?? null,
            markAsOf: marks[l.symbol]?.asOf ?? null,
            markDelta: marks[l.symbol]?.delta ?? null,
            canEditEntry: l.status === 'open' && isWithinEditWindow(l.entryDate),
            canEditExit: l.status === 'closed' && isWithinEditWindow(l.exitDate),
        })),
    });
}

// POST /api/accounts/[id]/lots, add a QQQ call the member already holds
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const accountId = Number(id);
    if (!Number.isInteger(accountId) || accountId <= 0) return NextResponse.json({ error: 'Invalid account id' }, { status: 400 });
    const account = await getAccount(accountId, userId);
    if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    if (account.strategy !== 'QQQ_LEAPS') return NextResponse.json({ error: 'Only QQQ LEAPS accounts hold QQQ calls' }, { status: 400 });

    try {
        const b = await req.json();
        const lotId = await addExistingHolding(accountId, {
            strike: Number(b.strike), expiry: String(b.expiry || ''), contracts: Number(b.contracts),
            price: Number(b.price), entryDate: b.entryDate ? String(b.entryDate) : undefined,
        });
        return NextResponse.json({ success: true, lotId }, { status: 201 });
    } catch (err) {
        if (err instanceof LotError) return NextResponse.json({ error: err.message }, { status: 400 });
        console.error('[accounts/lots] add failed:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
