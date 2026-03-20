import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/virtual-accounts/realized-pnl?strategy=TQQQ_TURBOCORE_PRO
 * 
 * Calculates the realized P&L for a virtual account by matching sell orders
 * against prior buy orders using the FIFO method on virtual_transactions.
 * 
 * Returns: { realizedPnl: number, txCount: number }
 */
export async function GET(request: Request) {
    const cookieStore = await cookies();
    const privyToken = cookieStore.get('privy-token')?.value;
    if (!privyToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const payload = privyToken.split('.')[1];
        const decoded = JSON.parse(Buffer.from(payload, 'base64').toString());
        const userId = decoded.sub || decoded.privy_did;
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const url = new URL(request.url);
        const strategy = url.searchParams.get('strategy') || '';

        // Fetch all virtual transactions for this user+strategy, ordered by time
        const res = await query(
            `SELECT type, symbol, quantity, price, amount, created_at
             FROM virtual_transactions
             WHERE user_id = $1 AND strategy = $2
             ORDER BY created_at ASC`,
            [userId, strategy]
        );

        const rows = res.rows;

        // FIFO cost tracking per symbol: Map<symbol, Array<{qty, price}>>
        const costBuckets: Map<string, Array<{ qty: number; price: number }>> = new Map();
        let realizedPnl = 0;

        for (const row of rows) {
            const symbol: string = row.symbol || '';
            const qty = Number(row.quantity || 0);
            const price = Number(row.price || 0);
            const type: string = row.type; // 'buy' | 'sell'

            if (!symbol || qty === 0) continue;

            if (type === 'buy') {
                if (!costBuckets.has(symbol)) costBuckets.set(symbol, []);
                costBuckets.get(symbol)!.push({ qty, price });
            } else if (type === 'sell') {
                // FIFO: pop from front of cost queue
                const bucket = costBuckets.get(symbol) || [];
                let qtyToSell = qty;

                while (qtyToSell > 0 && bucket.length > 0) {
                    const front = bucket[0];
                    const matched = Math.min(qtyToSell, front.qty);
                    realizedPnl += matched * (price - front.price);
                    front.qty -= matched;
                    qtyToSell -= matched;
                    if (front.qty <= 0) bucket.shift();
                }

                costBuckets.set(symbol, bucket);
            }
        }

        return NextResponse.json({
            realizedPnl: Math.round(realizedPnl * 100) / 100,
            txCount: rows.length
        });

    } catch (error) {
        console.error('Realized P&L error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
