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
    expiry?: string;
    frontExpiry?: string;
    backExpiry?: string;
    entry_price?: number;
    price?: number;
    contracts?: number;
    direction?: 'bullish' | 'bearish';
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

    return await executeThetaPut(
        accessToken,
        accountNumber,
        {
            symbol: signal.symbol || 'UNKNOWN',
            strike: signal.strike || 0,
            expiration: signal.expiry || signal.frontExpiry || defaultExpiry.front,
            contracts: signal.contracts || 1,
            price: signal.entry_price || signal.price,
        }
    );
};

/**
 * Execute Calendar Spread Strategy
 */
const executeCalendarStrategy: StrategyExecutor = async (
    accessToken,
    accountNumber,
    signal,
    defaultExpiry
) => {
    console.log(`📋 Executing Calendar Spread for ${signal.symbol}`);

    return await executeCalendarSpread(
        accessToken,
        accountNumber,
        {
            symbol: signal.symbol || 'UNKNOWN',
            strike: signal.strike || 0,
            frontExpiry: signal.frontExpiry || signal.expiry || defaultExpiry.front,
            backExpiry: signal.backExpiry || defaultExpiry.back,
            price: signal.price,
            direction: signal.direction,
        }
    );
};

/**
 * Strategy Execution Map
 * Add new strategies here - key is the strategy name from backend
 */
const STRATEGY_EXECUTORS: Record<string, StrategyExecutor> = {
    'theta': executeThetaStrategy,
    'Theta Cash-Secured Put': executeThetaStrategy,
    'calendar': executeCalendarStrategy,
    'calendar-spread': executeCalendarStrategy,
    // Add new strategies here:
    // 'iron-condor': executeIronCondorStrategy,
    // 'butterfly': executeButterflyStrategy,
    // 'straddle': executeStraddleStrategy,
};

/**
 * Get the appropriate executor for a signal's strategy
 */
export function getStrategyExecutor(strategy?: string): StrategyExecutor {
    if (!strategy) {
        console.warn('⚠️ No strategy specified, defaulting to calendar spread');
        return executeCalendarStrategy;
    }

    const executor = STRATEGY_EXECUTORS[strategy];

    if (!executor) {
        console.warn(`⚠️ Unknown strategy "${strategy}", defaulting to calendar spread`);
        return executeCalendarStrategy;
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
