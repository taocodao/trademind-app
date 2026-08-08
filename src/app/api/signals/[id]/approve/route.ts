/**
 * Approve Signal API Route
 * ========================
 * Marks a signal as "approved" by the user, confirming they have manually
 * entered the orders into their own brokerage account.
 *
 * This does NOT execute any trades — it only records the user's confirmation
 * and mirrors the orders to their virtual account for P&L tracking.
 *
 * Users receive signal emails with order instructions, enter the trades
 * manually in their brokerage, then come back here to confirm.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTastytradeTokens } from '@/lib/redis';
import { createUserExecution, getUserSettings } from '@/lib/db';
import { executeVirtualOrders } from '@/lib/virtual-executor';
import { getPrivyUserId } from '@/lib/auth-helpers';
import pool, { getDefaultVirtualBalance } from '@/lib/db';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json().catch(() => ({}));

        // Resolve Privy user ID — never fall back to a shared default key
        const userId = await getPrivyUserId(request as NextRequest);
        if (!userId) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        console.log(`✅ User ${userId} confirming manual entry for signal ${id}`);

        // Get signal data from request body
        const signalData = body.signal || body.signalDetails || body;
        const strategy = signalData.strategy || 'TQQQ_TURBOCORE';

        // ========================================================================
        // DISABLED: Live brokerage execution is no longer supported.
        // All signals are now virtual-only. Users receive order instructions via
        // email and manually enter trades in their own brokerage account.
        // This route now only confirms the user's manual entry and mirrors the
        // orders to their virtual account for P&L tracking.
        // ========================================================================

        // Get user's Tastytrade credentials from Redis (for reference only — not used for execution)
        const tokens = await getTastytradeTokens(userId);
        const hasTastytrade = tokens?.refreshToken;

        if (hasTastytrade) {
            console.log(`ℹ️ User ${userId} has Tastytrade connected (reference only — not used for execution)`);
        }

        // Build virtual orders from signal (for virtual account mirroring)
        const orders = await buildVirtualOrdersFromSignal(signalData, strategy, userId);

        // Execute virtually (idempotent — returns gracefully if already executed)
        try {
            const execResult = await executeVirtualOrders(userId, id, strategy, orders);
            if (execResult.alreadyExecuted) {
                return NextResponse.json({
                    status: 'already_executed',
                    error: 'Already confirmed',
                    message: 'You have already confirmed this signal.'
                }, { status: 409 });
            }

            // Record the user's manual-entry confirmation
            await createUserExecution(userId, id, 'executed', undefined, body.source || 'manual');

            console.log(`✅ Signal ${id} confirmed and mirrored to virtual account for user ${userId}`);

            return NextResponse.json({
                status: 'success',
                virtual: true,
                message: 'Signal confirmed. Orders mirrored to your virtual account for P&L tracking.',
                balance: execResult.balance,
                orders: orders.map(o => ({
                    symbol: o.symbol,
                    action: o.action,
                    quantity: o.quantity,
                    price: o.price,
                })),
            });

        } catch (execErr) {
            console.error('Virtual execution failed:', execErr);
            return NextResponse.json({
                status: 'failed',
                error: 'Virtual execution failed',
                message: 'Failed to mirror orders to virtual account. Please try again.'
            }, { status: 500 });
        }

    } catch (error) {
        console.error('Approve signal error:', error);
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Unknown error',
                status: 'failed',
            },
            { status: 500 }
        );
    }
}

/**
 * Build virtual orders from a signal.
 * Fetches virtual state directly from DB (never via HTTP cookie-forwarding — that fails on serverless).
 * Handles: equity rebalance legs, LEAPS (tracked as placeholder option position), and legacy signals.
 */
async function buildVirtualOrdersFromSignal(signal: any, strategy: string, userId: string): Promise<any[]> {
    const isTurboCore = signal.type === 'REBALANCE' || String(signal.strategy).includes('TURBOCORE') || String(signal.strategy).includes('PRO');

    // ── QQQ LEAPS: option-specific virtual order ─────────────────────────────
    // Signals from signal_publisher/qqq_leaps.py carry strike/contracts/entry_px
    // rather than TurboCore's target_pct legs — handle them explicitly.
    if (String(signal.strategy).toUpperCase() === 'QQQ_LEAPS') {
        const action = (signal.action || 'ENTER').toUpperCase();
        if (action === 'HOLD') return []; // No trade on HOLD
        const contracts = signal.contracts || 1;
        const px = action === 'EXIT' ? (signal.exit_px || 0) : (signal.entry_px || 0);
        return [{
            symbol: 'QQQ_LEAPS',
            action: action === 'EXIT' ? 'sell' : 'buy',
            quantity: contracts,
            price: px * 100, // notional per contract
            instrument_type: 'option',
            strike: signal.strike,
            expiry: signal.expiry,
            delta: signal.delta,
        }];
    }

    if (!isTurboCore) {
        // Individual equity/options signals (legacy/theta/zebra)
        return [{
            symbol: signal.symbol || 'UNKNOWN',
            action: signal.direction === 'bearish' ? 'sell' : 'buy',
            quantity: signal.contracts || 1,
            price: signal.cost || signal.price || 0
        }];
    }

    const legs = signal.legs || signal.data?.legs || [];

    // 1. Fetch live Yahoo quotes for real equity symbols
    let prices: Record<string, number> = {};
    try {
        const equitySymbols = legs.map((l: any) => l.symbol).filter((s: string) => s !== 'QQQ_LEAPS').join(',');
        if (equitySymbols) {
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.trademind.bot';
            const res = await fetch(`${baseUrl}/api/quotes?symbols=${equitySymbols}`, { cache: 'no-store' });
            if (res.ok) prices = await res.json();
        }
    } catch(e) { console.warn('[buildVirtualOrders] Failed to fetch Yahoo quotes:', e); }

    // 2. Fetch virtual balance and shadow positions DIRECTLY from DB
    //    (avoids cookie-forwarding failures on Vercel serverless)
    let cashBalance = getDefaultVirtualBalance(strategy);
    const posMap = new Map<string, { qty: number; avgPrice: number }>();
    try {
        const [balRes, posRes] = await Promise.all([
            pool.query(
                `SELECT cash_balance FROM virtual_accounts WHERE user_id = $1 AND strategy = $2`,
                [userId, strategy]
            ),
            pool.query(
                `SELECT symbol, quantity, avg_price FROM shadow_positions WHERE user_id = $1 AND strategy = $2`,
                [userId, strategy]
            ),
        ]);
        if (balRes.rows.length > 0) cashBalance = parseFloat(balRes.rows[0].cash_balance);
        for (const row of posRes.rows) {
            posMap.set(row.symbol, { qty: Number(row.quantity), avgPrice: Number(row.avg_price) });
        }
    } catch(e) { console.warn('[buildVirtualOrders] Failed to fetch virtual state from DB:', e); }

    // 3. Compute Net Liq from cash + current position values
    let netLiq = cashBalance;
    for (const [sym, pos] of posMap.entries()) {
        const livePrice = prices[sym] || pos.avgPrice || 100;
        netLiq += pos.qty * livePrice;
    }

    // Override with capital_required if explicitly set on signal
    if (signal.capital_required) netLiq = Number(signal.capital_required);

    console.log(`[buildVirtualOrders] NetLiq=$${netLiq.toFixed(0)}, Cash=$${cashBalance.toFixed(0)}, Positions:`, Object.fromEntries(posMap));

    // 4. Generate buy/sell orders for each leg
    const orders: any[] = [];
    for (const leg of legs) {
        const symbol = leg.symbol;

        // LEAPS: track as a virtual option position using signal-embedded cost or estimate
        if (symbol === 'QQQ_LEAPS') {
            const targetValue = netLiq * leg.target_pct;
            const leaspsPrice = signal.leaps_price || signal.cost || 205; // approx $205/contract from signal card
            const contracts = Math.floor(targetValue / (leaspsPrice * 100));
            if (contracts > 0) {
                orders.push({
                    symbol: 'QQQ_LEAPS',
                    action: 'buy',
                    quantity: contracts,
                    price: leaspsPrice * 100, // notional per contract
                    instrument_type: 'option'
                });
            }
            continue;
        }

        const livePrice = prices[symbol] || signal.cost || 100;
        const targetValue = netLiq * leg.target_pct;
        const pos = posMap.get(symbol);
        const currentShares = pos?.qty || 0;
        const currentValue = currentShares * livePrice;

        const diffValue = targetValue - currentValue;
        const action = diffValue > 0 ? 'buy' : 'sell';
        let orderDollarValue = Math.abs(diffValue);

        // Cap sell at what we actually hold
        if (action === 'sell') {
            const maxSellValue = currentShares * livePrice;
            if (orderDollarValue > maxSellValue) orderDollarValue = maxSellValue;
        }

        // If target is 0% and we hold shares, sell everything
        if (leg.target_pct === 0 && currentShares > 0) {
            orders.push({ symbol, action: 'sell', quantity: currentShares, price: livePrice });
            continue;
        }

        const exactShares = orderDollarValue / livePrice;
        let wholeShares = action === 'buy' ? Math.floor(exactShares) : Math.ceil(exactShares);
        if (action === 'sell' && wholeShares > currentShares) wholeShares = currentShares;

        if (wholeShares > 0 && orderDollarValue >= 5) {
            orders.push({ symbol, action, quantity: wholeShares, price: livePrice });
        }
    }

    // SELLs first to free cash before BUYs
    orders.sort((a, b) => {
        if (a.action === 'sell' && b.action !== 'sell') return -1;
        if (a.action !== 'sell' && b.action === 'sell') return 1;
        return 0;
    });

    console.log(`[buildVirtualOrders] Generated ${orders.length} orders:`, orders.map(o => `${o.action} ${o.quantity} ${o.symbol} @ $${o.price}`));
    return orders;
}
