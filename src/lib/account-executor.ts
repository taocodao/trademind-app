/**
 * Account-scoped Order Generation + Execution
 * ============================================
 * Account-centric counterparts of per-user-order-generator / virtual-executor.
 * They size orders off the NAMED account's ledger (accounts / account_positions)
 * and write trades into account_activities, with (account, signal) idempotency.
 */

import pool from '@/lib/db';
import {
    getAccount,
    getAccountPositions,
    applyActivity,
    recordAccountSignal,
    hasAccountExecutedSignal,
} from '@/lib/accounts';
import type { GenericSignal, SignalLeg, DeltaOrder, UserOrders } from '@/lib/per-user-order-generator';

// ─── Order Generation ────────────────────────────────────────────────────────

/**
 * Generate delta orders for a specific account from a (tier-selected) signal.
 * NLV = cash + Σ(position × live price). Sell orders first to free cash.
 */
export async function generateAccountOrders(signal: GenericSignal, accountId: number): Promise<UserOrders> {
    const account = await getAccount(accountId);
    if (!account) throw new Error(`Account ${accountId} not found`);

    const positions = await getAccountPositions(accountId);
    const posMap: Record<string, { qty: number; avgPrice: number }> = {};
    for (const p of positions) posMap[p.symbol] = { qty: p.quantity, avgPrice: p.avg_price };

    const equityLegs: SignalLeg[] = (signal.legs || []).filter(
        (l) => l.leg_type === 'equity' || (!l.leg_type && typeof l.target_pct === 'number' && l.target_pct > 0 && l.target_pct <= 1)
    );
    const symbols = equityLegs.map((l) => l.symbol);
    const prices = await fetchMarketPrices(symbols);

    // NLV
    let nlv = account.cash_balance;
    for (const [sym, pos] of Object.entries(posMap)) {
        const px = prices[sym] || pos.avgPrice || 0;
        nlv += pos.qty * px;
    }

    const rawOrders: DeltaOrder[] = [];
    for (const leg of equityLegs) {
        const livePrice = prices[leg.symbol];
        if (!livePrice || livePrice <= 0) {
            console.warn(`[AccountOrderGen] No price for ${leg.symbol} — skipping`);
            continue;
        }
        const targetQty = Math.floor((nlv * leg.target_pct) / livePrice);
        const currentQty = posMap[leg.symbol]?.qty ?? 0;
        const delta = targetQty - currentQty;
        if (Math.abs(delta) < 1) continue;
        const isBuy = delta > 0;
        const qty = Math.abs(delta);
        rawOrders.push({
            symbol: leg.symbol,
            action: isBuy ? 'buy' : 'sell',
            quantity: qty,
            price: livePrice,
            instruction: `${isBuy ? 'Buy' : 'Sell'} ${qty} share${qty !== 1 ? 's' : ''} of ${leg.symbol} at Market Price`,
        });
    }

    const equityOrders = rawOrders.sort((a, b) => (a.action === 'sell' && b.action !== 'sell' ? -1 : 1));

    // Options pass-through: the named-account model currently executes equity
    // legs; options intent is surfaced in the email but not auto-executed.
    return {
        equityOrders,
        optionsOrders: [],
        virtualNlv: nlv,
        cashBalance: account.cash_balance,
        skipOptions: false,
    };
}

// ─── Execution ───────────────────────────────────────────────────────────────

export interface AccountExecuteResult {
    success: boolean;
    alreadyExecuted?: boolean;
    newBalance?: number;
}

/**
 * Execute delta orders into an account's ledger. Idempotent per (account, signal).
 */
export async function executeAccountOrders(
    accountId: number,
    signalId: string,
    orders: DeltaOrder[]
): Promise<AccountExecuteResult> {
    if (await hasAccountExecutedSignal(accountId, signalId)) {
        return { success: false, alreadyExecuted: true };
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Lock the account row to serialize concurrent executions
        await client.query(`SELECT id FROM accounts WHERE id = $1 FOR UPDATE`, [accountId]);

        for (const order of orders) {
            const qty = Math.abs(Math.round(order.quantity));
            if (qty === 0) continue;
            await applyActivity(client, accountId, {
                type: order.action,
                symbol: order.symbol,
                quantity: qty,
                price: order.price,
                signal_id: signalId,
                source: 'signal',
            });
        }

        // Record idempotency (unique constraint guards races)
        const ins = await client.query(
            `INSERT INTO account_signals (account_id, signal_id, status) VALUES ($1, $2, 'executed')
             ON CONFLICT (account_id, signal_id) DO NOTHING RETURNING id`,
            [accountId, signalId]
        );
        if (ins.rowCount === 0) {
            await client.query('ROLLBACK');
            return { success: false, alreadyExecuted: true };
        }

        const bal = await client.query(`SELECT cash_balance FROM accounts WHERE id = $1`, [accountId]);
        await client.query('COMMIT');
        return { success: true, newBalance: Number(bal.rows[0]?.cash_balance ?? 0) };
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function fetchMarketPrices(symbols: string[]): Promise<Record<string, number>> {
    if (symbols.length === 0) return {};
    try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.trademind.bot';
        const res = await fetch(`${baseUrl}/api/quotes?symbols=${symbols.join(',')}`, { cache: 'no-store' });
        if (res.ok) return await res.json();
    } catch (err) {
        console.warn('[AccountOrderGen] Failed to fetch market prices:', err);
    }
    return {};
}
