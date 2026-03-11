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
 * Calculate TurboCore Sizer Strategy (Equity Rebalance) Orders
 * Calculates delta between target % and current holdings, then returns the orders to execute.
 */
export const calculateTurboCoreOrders = async (
    accessToken: string,
    accountNumber: string,
    signal: SignalData
) => {
    const { getAccountBalance, getAccountPositions, getEquityQuote } = await import('./tastytrade-api');

    // 1. Fetch live Net Liq
    const balance = await getAccountBalance(accessToken, accountNumber);
    // Use Target Investment Capital from UI if provided, otherwise fallback to account net liq
    const netLiq = signal.capital_required ? Number(signal.capital_required) : balance.netLiquidatingValue;
    console.log(`   💰 Live Net Liq to allocate against: $${netLiq} (Account Net Liq: $${balance.netLiquidatingValue})`);

    // If signal.legs exists, this is a portfolio rebalance. Otherwise, it might be a single ticker.
    let legs = signal.legs as Array<{ symbol: string; target_pct: number }> | undefined;

    if (!legs) {
        // Build single leg if only basic signal fields are present
        if (!signal.symbol || signal.target_pct === undefined) {
            throw new Error('TurboCore signal missing required "legs" array or "symbol"/"target_pct"');
        }
        legs = [{ symbol: signal.symbol, target_pct: signal.target_pct as number }];
    }

    // 2. Fetch current positions
    const positions = await getAccountPositions(accessToken, accountNumber);
    const posMap = new Map(positions.map(p => [p.symbol, p.quantity]));

    // 3. Process each leg and calculate orders
    const ordersToSubmit: Array<{ symbol: string; action: 'Buy' | 'Sell'; quantity: number; price?: number; diffValue: number }> = [];

    for (const leg of legs) {
        const symbol = leg.symbol;
        if (symbol === 'SGOV') continue; // Skip cash equivalent for now, we just let cash ride in BP

        const targetPct = leg.target_pct;
        const targetValue = netLiq * targetPct;
        const currentShares = posMap.get(symbol) || 0;

        // Fetch live price
        const quote = await getEquityQuote(accessToken, symbol);
        const currentPrice = quote?.last || quote?.mid || signal.cost || 0;

        if (currentPrice === 0) {
            throw new Error(`Failed to resolve a live market price or fallback cost for ${symbol}. Discarding order to prevent dangerous executions.`);
        }

        const currentValue = currentShares * currentPrice;
        const diffValue = targetValue - currentValue;
        const diffShares = diffValue / currentPrice;

        // Truncate toward zero (floor for buys, ceil for sells) to ensure we don't over-leverage
        const orderShares = diffShares > 0 ? Math.floor(diffShares) : Math.ceil(diffShares);

        // 📈 MARKET ORDER EXECUTION
        // User requested Market orders explicitly since we only trade highly liquid ETFs during market hours.
        if (orderShares !== 0) {
            ordersToSubmit.push({
                symbol,
                action: orderShares > 0 ? 'Buy' : 'Sell',
                quantity: Math.abs(orderShares),
                price: undefined, // Market order doesn't need a price
                diffValue
            });
            console.log(`   🔄 ${symbol}: Target ${(targetPct * 100).toFixed(1)}% ($${targetValue.toFixed(0)}), Curr ${currentShares}sh ($${currentValue.toFixed(0)}) -> ${orderShares > 0 ? 'BUY' : 'SELL'} ${Math.abs(orderShares)}sh @ MARKET`);
        } else {
            console.log(`   ✅ ${symbol}: Target ${(targetPct * 100).toFixed(1)}% ($${targetValue.toFixed(0)}), Curr ${currentShares}sh ($${currentValue.toFixed(0)}) -> OK (No trade)`);
        }
    }

    // 4. Sequence orders: SELLS before BUYS to free up Buying Power
    ordersToSubmit.sort((a, b) => {
        if (a.action === 'Sell' && b.action !== 'Sell') return -1;
        if (a.action !== 'Sell' && b.action === 'Sell') return 1;
        return 0;
    });

    return ordersToSubmit;
};

/**
 * Execute TurboCore Sizer Strategy (Equity Rebalance)
 * Calculates delta between target % and current holdings, then submits Market orders.
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

    console.log(`🚀 Submitting ${ordersToSubmit.length} rebalance orders...`);

    const { executeEquityOrder } = await import('./tastytrade-api');

    // Execute orders sequentially
    let lastOrderId = 'unknown';
    for (const order of ordersToSubmit) {
        try {
            const resp = await executeEquityOrder(accessToken, accountNumber, {
                symbol: order.symbol,
                action: order.action,
                quantity: order.quantity,
                price: order.price
            });
            lastOrderId = resp.orderId;
            console.log(`   ✅ ${order.action} ${order.quantity} ${order.symbol} submitted: ${resp.orderId}`);
        } catch (err) {
            console.error(`   ❌ Failed to ${order.action} ${order.quantity} ${order.symbol}:`, err);
            throw new Error(`Rebalance failed on ${order.symbol}: ${err instanceof Error ? err.message : String(err)}`);
        }
    }

    return {
        orderId: `batch_${lastOrderId}`,
        status: 'submitted',
        message: `Successfully submitted ${ordersToSubmit.length} rebalance orders.`
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
