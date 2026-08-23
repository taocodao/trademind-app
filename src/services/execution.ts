// Signal confirmations are manual. TradeMind does not submit brokerage orders.

import { Signal } from '@/types/signals';

export interface ExecutionResult {
    success: boolean;
    orderId?: string;
    error?: string;
}

export class ExecutionService {
    static async executeSignal(signal: Signal): Promise<ExecutionResult> {
        try {
            const response = await fetch(`/api/signals/${encodeURIComponent(signal.id)}/approve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ signal, source: 'manual' }),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                return { success: false, error: data.error || 'Unable to record signal confirmation' };
            }
            return { success: true, orderId: data.orderId };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unable to record signal confirmation' };
        }
    }
}
