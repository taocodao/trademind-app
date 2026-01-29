// Centralized Execution Service for All Strategies
// ================================================

import { Signal, ThetaSignal, CalendarSignal, isThetaSignal, isCalendarSignal } from '@/types/signals';

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
            } else if (isCalendarSignal(signal)) {
                return await this.executeCalendarSignal(signal);
            } else {
                throw new Error(`Unknown strategy: ${signal.strategy}`);
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
     * Execute calendar spread signal
     */
    private static async executeCalendarSignal(signal: CalendarSignal): Promise<ExecutionResult> {
        const response = await fetch('/api/tastytrade/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                strategy: 'calendar',
                symbol: signal.symbol,
                order_type: 'Limit',
                time_in_force: 'Day',
                price: signal.cost,
                legs: [
                    {
                        instrument_type: 'Equity Option',
                        symbol: this.buildOptionSymbol(
                            signal.symbol,
                            signal.front_expiry,
                            'P',
                            signal.strike
                        ),
                        action: 'SELL_TO_OPEN',
                        quantity: 1
                    },
                    {
                        instrument_type: 'Equity Option',
                        symbol: this.buildOptionSymbol(
                            signal.symbol,
                            signal.back_expiry,
                            'P',
                            signal.strike
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
