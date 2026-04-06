/**
 * Virtual Executor — shared helper for executing virtual trades
 * Can be called directly from any server-side context without HTTP round-trips.
 * Used by:
 *   - /api/virtual-accounts/execute  (client-initiated, uses cookie for userId)
 *   - /api/signals/[id]/approve       (server-initiated, passes userId directly)
 */

import pool, { getDefaultVirtualBalance, getUserExecutionForSignal } from '@/lib/db';

export interface VirtualOrder {
    symbol: string;
    action: 'buy' | 'sell';
    quantity: number;  // integer shares
    price: number;     // market price per share
}

export interface VirtualExecuteResult {
    success: boolean;
    balance: number;
    alreadyExecuted?: boolean;
}

export async function executeVirtualOrders(
    userId: string,
    signalId: string,
    strategy: string,
    orders: VirtualOrder[]
): Promise<VirtualExecuteResult> {
    // 1. Idempotency — return gracefully if already executed
    const existingExecution = await getUserExecutionForSignal(userId, signalId);
    if (existingExecution && existingExecution.status === 'executed') {
        return { success: false, balance: 0, alreadyExecuted: true };
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 2. Fetch (or create) virtual balance
        const balanceRes = await client.query(
            `SELECT cash_balance FROM virtual_accounts WHERE user_id = $1 AND strategy = $2 FOR UPDATE`,
            [userId, strategy]
        );

        let currentBalance = getDefaultVirtualBalance(strategy);
        if (balanceRes.rows.length > 0) {
            currentBalance = parseFloat(balanceRes.rows[0].cash_balance);
        } else {
            await client.query(
                `INSERT INTO virtual_accounts (user_id, strategy, cash_balance) VALUES ($1, $2, $3)`,
                [userId, strategy, currentBalance]
            );
        }

        // 3. Process orders → net cash delta + order lines
        let netCashChange = 0;
        const orderLines: Array<{
            symbol: string; action: string; quantity: number; price: number; notional_value: number;
        }> = [];

        for (const order of orders) {
            const qty = Math.abs(Math.round(order.quantity));
            if (qty === 0) continue;
            const notional = qty * order.price;
            const isBuy = order.action.toLowerCase() === 'buy';
            netCashChange += isBuy ? -notional : notional;
            orderLines.push({
                symbol: order.symbol,
                action: isBuy ? 'buy' : 'sell',
                quantity: qty,
                price: order.price,
                notional_value: notional,
            });
        }

        // 4. Update cash balance
        const newBalance = currentBalance + netCashChange;
        await client.query(
            `UPDATE virtual_accounts SET cash_balance = $1, updated_at = NOW() WHERE user_id = $2 AND strategy = $3`,
            [newBalance, userId, strategy]
        );

        // 5. Create execution record (atomic insert to prevent race conditions)
        const execRes = await client.query(
            `INSERT INTO user_signal_executions (user_id, signal_id, status, source, executed_at, created_at)
             VALUES ($1, $2, 'executed', 'virtual', NOW(), NOW())
             ON CONFLICT (user_id, signal_id) DO NOTHING
             RETURNING id`,
            [userId, signalId]
        );
        
        if (execRes.rowCount === 0) {
            // A parallel request beat us to it
            await client.query('ROLLBACK');
            return { success: false, balance: currentBalance, alreadyExecuted: true };
        }
        const executionId = execRes.rows[0].id;

        // 6. Log transactions + shadow positions + order lines
        for (const line of orderLines) {
            const isBuy = line.action === 'buy';

            // Virtual transaction log
            await client.query(
                `INSERT INTO virtual_transactions (user_id, strategy, type, symbol, quantity, price, amount, signal_id, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
                [userId, strategy, line.action, line.symbol, line.quantity, line.price, line.notional_value, signalId]
            );

            // Shadow positions upsert — always additive (delta-based):
            // buildVirtualOrdersFromSignal returns delta quantities (e.g. "buy 3 more QQQ"),
            // not full target quantities. SET-to-delta was incorrect (overwriting 18 sh → 3 sh).
            // Drift prevention relies on the idempotency check in user_signal_executions.
            if (isBuy) {
                await client.query(
                    `INSERT INTO shadow_positions (user_id, strategy, symbol, quantity, avg_price, signal_id, executed_at)
                     VALUES ($1, $2, $3, $4, $5, $6, NOW())
                     ON CONFLICT (user_id, strategy, symbol) DO UPDATE SET
                        quantity  = shadow_positions.quantity + $4,
                        avg_price = ((shadow_positions.quantity * shadow_positions.avg_price) + ($4 * $5)) / (shadow_positions.quantity + $4),
                        signal_id = $6, executed_at = NOW()`,
                    [userId, strategy, line.symbol, line.quantity, line.price, signalId]
                );
            } else {
                // SELL: reduce position; delete row when quantity reaches zero
                // Note: only 5 params — $5 = signalId (price excluded to avoid PG type error on unused param)
                await client.query(
                    `UPDATE shadow_positions
                     SET quantity = GREATEST(0, quantity - $4), signal_id = $5, executed_at = NOW()
                     WHERE user_id = $1 AND strategy = $2 AND symbol = $3`,
                    [userId, strategy, line.symbol, line.quantity, signalId]
                );
                await client.query(
                    `DELETE FROM shadow_positions WHERE user_id = $1 AND strategy = $2 AND symbol = $3 AND quantity <= 0`,
                    [userId, strategy, line.symbol]
                );
            }

            // Order lines
            await client.query(
                `INSERT INTO user_order_lines (execution_id, user_id, symbol, action, quantity, notional_value, price, is_virtual)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, true)`,
                [executionId, userId, line.symbol, line.action, line.quantity, line.notional_value, line.price]
            );
        }

        await client.query('COMMIT');
        return { success: true, balance: newBalance };
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}
