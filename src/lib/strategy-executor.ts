/**
 * Strategy Executor
 * Modular execution dispatching for different trading strategies
 */

import {
    executeCalendarSpread,
    executeThetaPut,
    type OrderResponse
} from './tastytrade-api';

export interface SignalData {
    strategy?: string;
    symbol?: string;
    strike?: number;
    short_strike?: number;   // For diagonal spreads
    long_strike?: number;    // For diagonal spreads
    expiration?: string;     // Option expiration from backend (YYYY-MM-DD)
    expiry?: string;
    frontExpiry?: string;
    backExpiry?: string;
    short_expiry?: string;   // Alias for frontExpiry
    long_expiry?: string;    // Alias for backExpiry
    entry_price?: number;
    price?: number;
    cost?: number;           // Frontend signal uses 'cost' for price
    net_debit?: number;      // For diagonal spreads
    contracts?: number;
    direction?: 'bullish' | 'bearish' | 'neutral';
    dte?: number;
    [key: string]: unknown;
}

export type StrategyExecutor = (
    accessToken: string,
    accountNumber: string,
    signal: SignalData,
    defaultExpiry: { front: string; back: string }
) => Promise<OrderResponse>;

/**
 * Execute Theta Cash-Secured Put Strategy
 */
const executeThetaStrategy: StrategyExecutor = async (
    accessToken,
    accountNumber,
    signal,
    defaultExpiry
) => {
    console.log(`📋 Executing Theta Cash-Secured Put for ${signal.symbol}`);

    // Use expiration from backend first (real option chain data)
    const expiration = signal.expiration || signal.expiry || signal.frontExpiry || defaultExpiry.front;
    console.log(`   Expiration source: expiration=${signal.expiration}, expiry=${signal.expiry}, frontExpiry=${signal.frontExpiry}, default=${defaultExpiry.front}`);
    console.log(`   Using expiration: ${expiration}`);

    return await executeThetaPut(
        accessToken,
        accountNumber,
        {
            symbol: signal.symbol || 'UNKNOWN',
            strike: signal.strike || 0,
            expiration,
            contracts: signal.contracts || 1,
            price: signal.entry_price || signal.price || signal.cost,
        }
    );
};

/**
 * Execute Diagonal/Calendar Spread Strategy
 * Handles both directional (PMCC/PMCP) and neutral (calendar) modes
 */
const executeDiagonalStrategy: StrategyExecutor = async (
    accessToken,
    accountNumber,
    signal,
    defaultExpiry
) => {
    const mode = signal.direction && signal.direction !== 'neutral' ? 'Diagonal' : 'Calendar';
    console.log(`📋 Executing ${mode} Spread for ${signal.symbol}`);

    return await executeCalendarSpread(
        accessToken,
        accountNumber,
        {
            symbol: signal.symbol || 'UNKNOWN',
            strike: signal.strike || signal.short_strike || 0,
            frontExpiry: signal.frontExpiry || signal.short_expiry || signal.expiry || defaultExpiry.front,
            backExpiry: signal.backExpiry || signal.long_expiry || defaultExpiry.back,
            price: signal.price || signal.net_debit || signal.cost,
            // API only accepts bullish/bearish, neutral mode uses same execution as calendar (no direction needed)
            direction: signal.direction === 'neutral' ? undefined : signal.direction,
        }
    );
};

/**
 * Guard for ZEBRA strategies which require 3-leg execution
 */
const executeServerManagedStrategy: StrategyExecutor = async (accessToken, accountNumber, signal) => {
    throw new Error(
        `${signal.strategy} trades require live pricing and multi-leg execution which are managed by the EC2 backend. ` +
        'Please use the manual approve button which will proxy to the server, or enable auto-approve in Settings.'
    );
};

/**
 * TurboCore Order - rich data for both display and execution
 */
export interface TurboCoreOrder {
    symbol: string;
    action: 'Buy' | 'Sell';
    quantity: number;         // Whole shares (floored/ceiled)
    exactShares: number;      // Exact fractional shares
    diffValue: number;        // Dollar amount of the adjustment
    targetPct: number;        // Target allocation %
    targetValue: number;      // Target dollar value
    currentShares: number;    // Current position
    currentValue: number;     // Current dollar value
    currentPrice: number;     // Live price per share
}

/**
 * Calculate TurboCore Sizer Strategy (Equity Rebalance) Orders
 * Returns rich order data for both display and execution.
 */
export const calculateTurboCoreOrders = async (
    accessToken: string,
    accountNumber: string,
    signal: SignalData
): Promise<TurboCoreOrder[]> => {
    const { getAccountBalance, getAccountPositions, getEquityQuote } = await import('./tastytrade-api');

    // 1. Fetch live Net Liq
    const balance = await getAccountBalance(accessToken, accountNumber);
    const netLiq = signal.capital_required ? Number(signal.capital_required) : balance.netLiquidatingValue;
    console.log(`   💰 Allocating against: $${netLiq} (Account Net Liq: $${balance.netLiquidatingValue})`);

    let legs = signal.legs as Array<{ symbol: string; target_pct: number }> | undefined;

    if (!legs) {
        if (!signal.symbol || signal.target_pct === undefined) {
            throw new Error('TurboCore signal missing required "legs" array or "symbol"/"target_pct"');
        }
        legs = [{ symbol: signal.symbol, target_pct: signal.target_pct as number }];
    }

    // 2. Fetch current positions
    const positions = await getAccountPositions(accessToken, accountNumber);
    const posMap = new Map(positions.map(p => [p.symbol, p.quantity]));

    // 3. Process each leg
    const ordersToSubmit: TurboCoreOrder[] = [];

    for (const leg of legs) {
        const symbol = leg.symbol;
        if (symbol === 'SGOV') continue;

        const targetPct = leg.target_pct;
        const targetValue = netLiq * targetPct;
        const currentShares = posMap.get(symbol) || 0;

        const quote = await getEquityQuote(accessToken, symbol);
        const currentPrice = quote?.last || quote?.mid || signal.cost || 0;

        if (currentPrice === 0) {
            throw new Error(`Failed to resolve a live market price for ${symbol}.`);
        }

        const currentValue = currentShares * currentPrice;
        const diffValue = targetValue - currentValue;
        const action: 'Buy' | 'Sell' = diffValue > 0 ? 'Buy' : 'Sell';

        // 🛡️ For SELL orders: cap to the floor of the current position value (to the cent).
        // Floating-point math can produce a dollarValue slightly > currentValue, which causes
        // Tastytrade to reject with "cannot_close_more_than_existing_position".
        // We floor the sell value to guarantee we never oversell the actual holding.
        let orderDollarValue = Math.abs(diffValue);
        if (action === 'Sell') {
            const maxSellValue = Math.floor(currentValue * 100) / 100; // floor to cent
            if (orderDollarValue > maxSellValue) {
                console.log(`   ⚠️  ${symbol}: Capping SELL from $${orderDollarValue.toFixed(4)} → $${maxSellValue.toFixed(2)} (prevents oversell)`);
                orderDollarValue = maxSellValue;
            }
        }

        const exactShares = orderDollarValue / currentPrice;
        const wholeShares = action === 'Buy' ? Math.floor(exactShares) : Math.ceil(exactShares);

        // Only add order if delta >= $5 (Tastytrade notional minimum)
        if (orderDollarValue >= 5) {
            ordersToSubmit.push({
                symbol,
                action,
                quantity: Math.abs(wholeShares),
                exactShares: Math.abs(exactShares),
                diffValue: orderDollarValue,
                targetPct,
                targetValue,
                currentShares,
                currentValue,
                currentPrice,
            });
            console.log(`   🔄 ${symbol}: Target ${(targetPct * 100).toFixed(1)}% ($${targetValue.toFixed(0)}), Curr ${currentShares}sh ($${currentValue.toFixed(0)}) -> ${action.toUpperCase()} $${orderDollarValue.toFixed(2)} (≈${Math.abs(exactShares).toFixed(2)} shares)`);
        } else {
            console.log(`   ✅ ${symbol}: Target ${(targetPct * 100).toFixed(1)}% -> OK (delta < $5)`);
        }
    }

    // 4. Sequence: SELLS before BUYS
    ordersToSubmit.sort((a, b) => {
        if (a.action === 'Sell' && b.action !== 'Sell') return -1;
        if (a.action !== 'Sell' && b.action === 'Sell') return 1;
        return 0;
    });

    return ordersToSubmit;
};

/**
 * Execute TurboCore Sizer Strategy (Equity Rebalance)
 * Uses Notional Market orders for precise dollar-based allocation (supports fractional shares).
 */
const executeTurboCoreStrategy: StrategyExecutor = async (
    accessToken,
    accountNumber,
    signal,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    defaultExpiry
) => {
    console.log(`📋 Executing TurboCore Rebalance for signal ${signal.id}`);

    const ordersToSubmit = await calculateTurboCoreOrders(accessToken, accountNumber, signal);

    if (ordersToSubmit.length === 0) {
        return {
            orderId: 'no_action_needed',
            status: 'completed',
            message: 'Portfolio already matches target allocation.'
        };
    }

    console.log(`🚀 Submitting ${ordersToSubmit.length} notional rebalance orders...`);

    const { executeNotionalEquityOrder } = await import('./tastytrade-api');

    let lastOrderId = 'unknown';
    for (const order of ordersToSubmit) {
        try {
            const resp = await executeNotionalEquityOrder(accessToken, accountNumber, {
                symbol: order.symbol,
                action: order.action,
                dollarValue: order.diffValue,
            });
            lastOrderId = resp.orderId;
            console.log(`   ✅ ${order.action} $${order.diffValue.toFixed(2)} of ${order.symbol} submitted: ${resp.orderId}`);
        } catch (err) {
            console.error(`   ❌ Failed to ${order.action} $${order.diffValue.toFixed(2)} of ${order.symbol}:`, err);
            throw new Error(`Rebalance failed on ${order.symbol}: ${err instanceof Error ? err.message : String(err)}`);
        }
    }

    return {
        orderId: `batch_${lastOrderId}`,
        status: 'submitted',
        message: `Successfully submitted ${ordersToSubmit.length} notional rebalance orders.`
    };
};

/**
 * Strategy Execution Map
 * Add new strategies here - key is the strategy name from backend
 */
const STRATEGY_EXECUTORS: Record<string, StrategyExecutor> = {
    // Theta strategies
    'theta': executeThetaStrategy,
    'Theta Cash-Secured Put': executeThetaStrategy,

    // Diagonal spread strategies (unified: PMCC/PMCP + Calendar)
    'diagonal': executeDiagonalStrategy,
    'diagonal-spread': executeDiagonalStrategy,
    'Diagonal Spread': executeDiagonalStrategy,
    'BULL_DIAGONAL': executeDiagonalStrategy,
    'BEAR_DIAGONAL': executeDiagonalStrategy,
    'NEUTRAL_DIAGONAL': executeDiagonalStrategy,

    // Legacy calendar support (backward compat)
    'calendar': executeDiagonalStrategy,
    'calendar-spread': executeDiagonalStrategy,
    'Calendar Spread': executeDiagonalStrategy,

    // DVO strategies (put selling = same execution as theta)
    'dvo': executeThetaStrategy,
    'SHORT_PUT': executeThetaStrategy,
    'deep-value': executeThetaStrategy,

    // ZEBRA & TurboBounce — Managed by EC2 for live pricing/multi-leg
    'zebra': executeServerManagedStrategy,
    'ZEBRA': executeServerManagedStrategy,
    'turbobounce': executeServerManagedStrategy,
    'TurboBounce': executeServerManagedStrategy,

    // TurboCore natively executed on Vercel
    'tqqq_turbocore': executeTurboCoreStrategy,
    'TQQQ_TURBOCORE': executeTurboCoreStrategy,
    'rebalance': executeTurboCoreStrategy,
    'REBALANCE': executeTurboCoreStrategy,
};

/**
 * Get the appropriate executor for a signal's strategy
 */
export function getStrategyExecutor(strategy?: string): StrategyExecutor {
    if (!strategy) {
        console.warn('⚠️ No strategy specified, defaulting to diagonal spread');
        return executeDiagonalStrategy;
    }

    const executor = STRATEGY_EXECUTORS[strategy];

    if (!executor) {
        console.warn(`⚠️ Unknown strategy "${strategy}", defaulting to diagonal spread`);
        return executeDiagonalStrategy;
    }

    return executor;
}

/**
 * Execute a trade signal with the appropriate strategy
 */
export async function executeSignal(
    accessToken: string,
    accountNumber: string,
    signal: SignalData,
    defaultExpiry: { front: string; back: string }
): Promise<OrderResponse> {
    const executor = getStrategyExecutor(signal.strategy);

    console.log(`🎯 Strategy: ${signal.strategy || 'default'}`);

    try {
        const result = await executor(accessToken, accountNumber, signal, defaultExpiry);
        console.log(`✅ Trade executed successfully: ${result.orderId}`);
        return result;
    } catch (error) {
        console.error(`❌ Trade execution failed for ${signal.strategy}:`, error);
        throw error;
    }
}
