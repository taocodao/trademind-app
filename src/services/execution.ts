// Centralized Execution Service for All Strategies
// ================================================

import { Signal, ThetaSignal, DiagonalSignal, isThetaSignal, isDiagonalSignal } from '@/types/signals';

export interface ExecutionResult {
    success: boolean;
    orderId?: string;
    error?: string;
}

export class ExecutionService {
    /**
     * Execute any signal type to Tastytrade
     */
    static async executeSignal(signal: Signal): Promise<ExecutionResult> {
        try {
            if (isThetaSignal(signal)) {
                return await this.executeThetaSignal(signal);
            } else if (isDiagonalSignal(signal)) {
                return await this.executeDiagonalSignal(signal);
            } else {
                // TypeScript knows this should never happen, but handle it anyway
                const exhaustiveCheck: never = signal;
                throw new Error(`Unknown strategy: ${(signal as Signal).strategy}`);
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Execution failed';
            return { success: false, error: message };
        }
    }

    /**
     * Execute theta signal (cash-secured put)
     */
    private static async executeThetaSignal(signal: ThetaSignal): Promise<ExecutionResult> {
        const response = await fetch('/api/tastytrade/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                strategy: 'theta',
                symbol: signal.symbol,
                order_type: 'Limit',
                time_in_force: 'Day',
                price: signal.entry_price,
                legs: [{
                    instrument_type: 'Equity Option',
                    symbol: this.buildOptionSymbol(
                        signal.symbol,
                        signal.expiration,
                        'P',
                        signal.strike
                    ),
                    action: 'SELL_TO_OPEN',
                    quantity: signal.contracts
                }]
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Order execution failed');
        }

        const data = await response.json();
        return {
            success: true,
            orderId: data.order?.id || data.orderId
        };
    }

    /**
     * Execute diagonal/calendar spread signal
     */
    private static async executeDiagonalSignal(signal: DiagonalSignal): Promise<ExecutionResult> {
        // Use short_expiry/long_expiry if available, otherwise fall back to front_expiry/back_expiry
        const frontExpiry = signal.short_expiry || signal.front_expiry;
        const backExpiry = signal.long_expiry || signal.back_expiry;
        const strike = signal.short_strike || signal.strike;

        if (!frontExpiry || !backExpiry || !strike) {
            throw new Error('Missing required expiry or strike information');
        }

        const response = await fetch('/api/tastytrade/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                strategy: 'diagonal',
                symbol: signal.symbol,
                order_type: 'Limit',
                time_in_force: 'Day',
                price: signal.net_debit || signal.cost,
                legs: [
                    {
                        instrument_type: 'Equity Option',
                        symbol: this.buildOptionSymbol(
                            signal.symbol,
                            frontExpiry,
                            signal.option_type || 'P',
                            strike
                        ),
                        action: 'SELL_TO_OPEN',
                        quantity: 1
                    },
                    {
                        instrument_type: 'Equity Option',
                        symbol: this.buildOptionSymbol(
                            signal.symbol,
                            backExpiry,
                            signal.option_type || 'P',
                            signal.long_strike || strike
                        ),
                        action: 'BUY_TO_OPEN',
                        quantity: 1
                    }
                ]
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Order execution failed');
        }

        const data = await response.json();
        return {
            success: true,
            orderId: data.order?.id || data.orderId
        };
    }

    /**
     * Build OCC option symbol format
     * Example: SPY 251231P00595000
     */
    private static buildOptionSymbol(
        stock: string,
        expiration: string,  // YYYY-MM-DD
        type: 'P' | 'C',
        strike: number
    ): string {
        // Convert 2025-12-31 to 251231
        const exp = expiration.replace(/-/g, '').slice(2, 8);

        // Convert 595.00 to 00595000
        const strikeStr = Math.round(strike * 1000).toString().padStart(8, '0');

        return `${stock} ${exp}${type}${strikeStr}`;
    }
}
