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
    expiry?: string;
    frontExpiry?: string;
    backExpiry?: string;
    short_expiry?: string;   // Alias for frontExpiry
    long_expiry?: string;    // Alias for backExpiry
    entry_price?: number;
    price?: number;
    net_debit?: number;      // For diagonal spreads
    contracts?: number;
    direction?: 'bullish' | 'bearish' | 'neutral';
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
            price: signal.price || signal.net_debit,
            // API only accepts bullish/bearish, neutral mode uses same execution as calendar (no direction needed)
            direction: signal.direction === 'neutral' ? undefined : signal.direction,
        }
    );
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

    // Add new strategies here:
    // 'iron-condor': executeIronCondorStrategy,
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
