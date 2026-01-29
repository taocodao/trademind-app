'use client';

import { useState } from 'react';
import { Signal } from '@/types/signals';
import { ExecutionService, ExecutionResult } from '@/services/execution';

export function useOrderExecution() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastResult, setLastResult] = useState<ExecutionResult | null>(null);

    const executeSignal = async (signal: Signal): Promise<ExecutionResult> => {
        setLoading(true);
        setError(null);

        try {
            const result = await ExecutionService.executeSignal(signal);
            setLastResult(result);

            if (!result.success) {
                setError(result.error || 'Execution failed');
            }

            return result;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Execution failed';
            setError(message);
            const failedResult = { success: false, error: message };
            setLastResult(failedResult);
            return failedResult;
        } finally {
            setLoading(false);
        }
    };

    const clearError = () => setError(null);

    return {
        executeSignal,
        loading,
        error,
        lastResult,
        clearError
    };
}
