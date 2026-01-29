'use client';

import { Signal } from '@/types/signals';
import { SignalCard } from './SignalCard';

interface SignalsListProps {
    signals: Signal[];
    onApprove: (signal: Signal) => void;
    onReject: (signal: Signal) => void;
    loading?: boolean;
    emptyMessage?: string;
}

export function SignalsList({
    signals,
    onApprove,
    onReject,
    loading,
    emptyMessage = 'No signals available'
}: SignalsListProps) {
    if (signals.length === 0) {
        return (
            <div className="text-center py-16">
                <div className="text-gray-400 text-6xl mb-4">📡</div>
                <p className="text-gray-500 text-lg">{emptyMessage}</p>
                <p className="text-gray-400 text-sm mt-2">
                    Signals will appear here when generated
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {signals.map(signal => (
                <SignalCard
                    key={signal.id}
                    signal={signal}
                    onApprove={onApprove}
                    onReject={onReject}
                    loading={loading}
                />
            ))}
        </div>
    );
}
