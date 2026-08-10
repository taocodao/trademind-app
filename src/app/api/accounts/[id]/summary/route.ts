import { NextRequest, NextResponse } from 'next/server';
import { getAccount, getAccountPositions } from '@/lib/accounts';
import { phaseForNlv, getAccountPhase, getPhaseSpec } from '@/lib/account-phase';
import { getUserId } from '@/lib/auth';

// GET /api/accounts/[id]/summary — cash + NLV + P&L for account cards
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const accountId = Number(id);

    const account = await getAccount(accountId, userId);
    if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

    const positions = await getAccountPositions(accountId);

    let prices: Record<string, number> = {};
    const symbols = positions.map((p) => p.symbol);
    if (symbols.length > 0) {
        try {
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.trademind.bot';
            const qRes = await fetch(`${baseUrl}/api/quotes?symbols=${symbols.join(',')}`, { cache: 'no-store' });
            if (qRes.ok) prices = await qRes.json();
        } catch (e) {
            console.warn('[accounts/summary] quote fetch failed', e);
        }
    }

    const positionsValue = positions.reduce((s, p) => s + p.quantity * (prices[p.symbol] || p.avg_price), 0);
    const nlv = account.cash_balance + positionsValue;
    const cumulativePnl = nlv - account.initial_principal;
    const cumulativePnlPct = account.initial_principal > 0 ? (cumulativePnl / account.initial_principal) * 100 : 0;

    // Phase: prefer the persisted phase (set by the fan-out engine); fall back
    // to the NLV-appropriate phase for display before the first evaluation.
    const persistedPhase = await getAccountPhase(accountId);
    const phase = persistedPhase || phaseForNlv(nlv).name;
    const phaseCap = getPhaseSpec(phase).maxPositionPct;

    return NextResponse.json({
        account,
        cash: account.cash_balance,
        positionsValue,
        nlv,
        initialPrincipal: account.initial_principal,
        cumulativePnl,
        cumulativePnlPct,
        positionCount: positions.length,
        phase,
        phaseCap,
    });
}
