import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool, { 
    getVirtualBalance, 
    updateVirtualBalance, 
    logVirtualTransaction,
    createUserExecution,
    createOrderLines,
    OrderLineData,
    getUserExecutionForSignal
} from '@/lib/db';

export async function POST(req: Request) {
    const cookieStore = await cookies();
    const privyToken = cookieStore.get('privy-token')?.value;
    if (!privyToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = privyToken.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    const userId = decoded.sub || decoded.privy_did;

    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await req.json();
        const { signalId, strategy, orders } = body;
        
        // orders should be an array of: { symbol, quantity (int), price, action ('buy' | 'sell') }

        if (!signalId || !strategy || !orders || !Array.isArray(orders)) {
            return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
        }

        // 1. Idempotency Check
        const existingExecution = await getUserExecutionForSignal(userId, signalId);
        if (existingExecution && existingExecution.status === 'executed') {
            return NextResponse.json({ error: 'Already executed' }, { status: 409 });
        }
        
        // Use a transaction if possible, but our db helper abstract away pool.query.
        // We will just do it sequentially.
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // 2. Fetch current balance
            const balanceRes = await client.query(
                `SELECT cash_balance FROM virtual_accounts WHERE user_id = $1 AND strategy = $2 FOR UPDATE`,
                [userId, strategy]
            );
            
            let currentBalance = 25000.00;
            if (balanceRes.rows.length > 0) {
                currentBalance = parseFloat(balanceRes.rows[0].cash_balance);
            } else {
                await client.query(
                    `INSERT INTO virtual_accounts (user_id, strategy, cash_balance) VALUES ($1, $2, $3)`,
                    [userId, strategy, currentBalance]
                );
            }

            // 3. Process orders
            let netCashChange = 0;
            const orderLines: any[] = [];
            
            for (const order of orders) {
                const qty = Math.abs(Math.round(order.quantity)); // enforce int
                if (qty === 0) continue;
                
                const notional = qty * order.price;
                const isBuy = order.action.toLowerCase() === 'buy';
                
                netCashChange += isBuy ? -notional : notional;
                orderLines.push({
                    symbol: order.symbol,
                    action: isBuy ? 'buy' : 'sell',
                    quantity: qty,
                    price: order.price,
                    notional_value: notional
                });
            }

            // 4. Update Cash Balance
            const newBalance = currentBalance + netCashChange;
            // Allow negative balance if they go on margin? Tastytrade allows some margin, but let's just warn or allow.
            // For now, we allow it.
            
            await client.query(
                `UPDATE virtual_accounts SET cash_balance = $1, updated_at = NOW() WHERE user_id = $2 AND strategy = $3`,
                [newBalance, userId, strategy]
            );

            // 5. Create Execution Record
            const execRes = await client.query(
                `INSERT INTO user_signal_executions (user_id, signal_id, status, source, executed_at, created_at)
                 VALUES ($1, $2, 'executed', 'virtual', NOW(), NOW())
                 ON CONFLICT (user_id, signal_id) DO UPDATE SET status = 'executed', executed_at = NOW()
                 RETURNING id`,
                [userId, signalId]
            );
            const executionId = execRes.rows[0].id;

            // 6. Log transactions, positions, and order lines
            for (const line of orderLines) {
                const isBuy = line.action === 'buy';
                
                // Virtual transaction log
                await client.query(
                    `INSERT INTO virtual_transactions (user_id, strategy, type, symbol, quantity, price, amount, signal_id, created_at)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
                    [userId, strategy, line.action, line.symbol, line.quantity, line.price, line.notional_value, signalId]
                );
                
                // Shadow positions (Upsert)
                if (isBuy) {
                    await client.query(
                        `INSERT INTO shadow_positions (user_id, strategy, symbol, quantity, avg_price, signal_id, executed_at)
                         VALUES ($1, $2, $3, $4, $5, $6, NOW())
                         ON CONFLICT (user_id, strategy, symbol) DO UPDATE SET
                            quantity = shadow_positions.quantity + $4,
                            avg_price = ((shadow_positions.quantity * shadow_positions.avg_price) + ($4 * $5)) / (shadow_positions.quantity + $4),
                            signal_id = $6, executed_at = NOW()`,
                        [userId, strategy, line.symbol, line.quantity, line.price, signalId]
                    );
                } else {
                    await client.query(
                        `UPDATE shadow_positions SET
                            quantity = quantity - $4,
                            signal_id = $6, executed_at = NOW()
                         WHERE user_id = $1 AND strategy = $2 AND symbol = $3`,
                        [userId, strategy, line.symbol, line.quantity, line.price, signalId]
                    );
                    // delete if 0
                    await client.query(`DELETE FROM shadow_positions WHERE quantity <= 0`);
                }
                
                // Order lines
                await client.query(
                    `INSERT INTO user_order_lines (execution_id, user_id, symbol, action, quantity, notional_value, price, is_virtual)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, true)`,
                     [executionId, userId, line.symbol, line.action, line.quantity, line.notional_value, line.price]
                );
            }

            await client.query('COMMIT');
            
            return NextResponse.json({ success: true, balance: newBalance });
        } catch (txnError) {
            await client.query('ROLLBACK');
            throw txnError;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Failed to execute virtual order:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
