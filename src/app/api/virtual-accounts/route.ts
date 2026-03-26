import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getVirtualBalance, updateVirtualBalance, query } from '@/lib/db';

async function getUserId(): Promise<string | null> {
    const cookieStore = await cookies();
    const privyToken = cookieStore.get('privy-token')?.value;
    if (!privyToken) return null;
    try {
        const payload = privyToken.split('.')[1];
        const decoded = JSON.parse(atob(payload));
        return decoded.sub || decoded.privy_did || null;
    } catch { return null; }
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const strategy = searchParams.get('strategy');
    if (!strategy) return NextResponse.json({ error: 'Missing strategy parameter' }, { status: 400 });

    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const result = await getVirtualBalance(userId, strategy);
        const cashBalance = result.balance;

        // Fetch shadow positions to compute full NLV (cash + position market values)
        let positionsValue = 0;
        try {
            const posRes = await query(
                `SELECT symbol, quantity, avg_price FROM shadow_positions WHERE user_id = $1 AND strategy = $2`,
                [userId, strategy]
            );
            for (const row of posRes.rows) {
                positionsValue += Number(row.quantity) * Number(row.avg_price);
            }
        } catch (e) {
            console.warn('[virtual-accounts] Failed to fetch shadow positions for NLV:', e);
        }

        const nlv = cashBalance + positionsValue;

        return NextResponse.json({
            balance:         cashBalance,   // remaining deployable cash
            nlv,                            // total portfolio value (cash + positions)
            positionsValue,                 // sum of position market values at avg cost
            isDefault:       result.isDefault,
        });
    } catch (error) {
        console.error('Failed to get virtual balance:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await req.json();
        const { strategy, action, amount } = body;

        if (!strategy || !action || !amount || amount <= 0) {
            return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
        }
        if (action !== 'deposit' && action !== 'withdraw') {
            return NextResponse.json({ action: 'Invalid action type' }, { status: 400 });
        }

        const delta = action === 'deposit' ? amount : -amount;
        const newBalance = await updateVirtualBalance(userId, strategy, delta, action);
        return NextResponse.json({ success: true, balance: newBalance });
    } catch (error) {
        console.error('Failed to update virtual balance:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
