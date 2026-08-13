import { NextRequest, NextResponse } from 'next/server';
import { getAccount, getAccountPositions } from '@/lib/accounts';
import { phaseForNlv, getAccountPhase, getPhaseSpec } from '@/lib/account-phase';
import { getUserId } from '@/lib/auth';

// GET /api/accounts/[id]/positions — positions with live market value
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const accountId = Number(id);

    const account = await getAccount(accountId, userId);
    if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

    const positions = await getAccountPositions(accountId);

    // Fetch live quotes for equity symbols
    let prices: Record<string, number> = {};
    const symbols = positions.map((p) => p.symbol);
    if (symbols.length > 0) {
        try {
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.trademind.bot';
            const qRes = await fetch(`${baseUrl}/api/quotes?symbols=${symbols.join(',')}`, { cache: 'no-store' });
            if (qRes.ok) prices = await qRes.json();
        } catch (e) {
            console.warn('[accounts/positions] quote fetch failed', e);
        }
    }

    const enriched = positions.map((p) => {
        const live = prices[p.symbol] || p.avg_price;
        // Options settle per contract (100 shares); equity is 1×.
        const mult = p.instrument_type === 'option' ? 100 : 1;
        const marketValue = p.quantity * live * mult;
        const unrealizedPnl = (live - p.avg_price) * p.quantity * mult;
        const unrealizedPnlPct = p.avg_price > 0 ? ((live - p.avg_price) / p.avg_price) * 100 : 0;
        return { ...p, currentPrice: live, marketValue, unrealizedPnl, unrealizedPnlPct };
    });

    const positionsValue = enriched.reduce((s, p) => s + p.marketValue, 0);
    const nlv = account.cash_balance + positionsValue;

    const persistedPhase = await getAccountPhase(accountId);
    const phase = persistedPhase || phaseForNlv(nlv).name;
    const phaseCap = getPhaseSpec(phase).maxPositionPct;

    return NextResponse.json({
        account,
        positions: enriched,
        cash: account.cash_balance,
        positionsValue,
        nlv,
        initialPrincipal: account.initial_principal,
        phase,
        phaseCap,
    });
}
