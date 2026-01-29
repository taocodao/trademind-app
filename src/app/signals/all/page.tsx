'use client';

import { useState } from 'react';
import { useSignals } from '@/hooks/useSignals';
import { useOrderExecution } from '@/hooks/useOrderExecution';
import { SignalsList } from '@/components/signals/SignalsList';
import { Signal } from '@/types/signals';
import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function AllSignalsPage() {
    const { ready, authenticated } = usePrivy();
    const router = useRouter();
    const [selectedStrategies, setSelectedStrategies] = useState<string[]>(['theta', 'calendar']);
    const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

    const {
        signals,
        isConnected,
        updateSignalStatus,
        pendingSignals,
        approvedSignals,
        rejectedSignals
    } = useSignals({ strategies: selectedStrategies });

    const { executeSignal, loading, error } = useOrderExecution();

    useEffect(() => {
        if (ready && !authenticated) {
            router.push('/');
        }
    }, [ready, authenticated, router]);

    const handleApprove = async (signal: Signal) => {
        try {
            const result = await executeSignal(signal);
            if (result.success) {
                updateSignalStatus(signal.id, 'approved');
                // Optionally redirect to positions
                // router.push('/positions');
            }
        } catch (error) {
            console.error('Execution failed:', error);
        }
    };

    const handleReject = (signal: Signal) => {
        updateSignalStatus(signal.id, 'rejected');
    };

    const getFilteredSignals = () => {
        switch (filter) {
            case 'pending': return pendingSignals;
            case 'approved': return approvedSignals;
            case 'rejected': return rejectedSignals;
            default: return signals;
        }
    };

    const toggleStrategy = (strategy: string) => {
        setSelectedStrategies(prev =>
            prev.includes(strategy)
                ? prev.filter(s => s !== strategy)
                : [...prev, strategy]
        );
    };

    if (!ready || !authenticated) {
        return (
            <main className="min-h-screen flex items-center justify-center">
                <div className="animate-pulse">
                    <div className="w-12 h-12 rounded-full bg-tm-purple/30" />
                </div>
            </main>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <header className="flex items-center gap-4 mb-8">
                    <Link href="/dashboard" className="w-10 h-10 rounded-full bg-white shadow flex items-center justify-center hover:bg-gray-50 transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div className="flex-1">
                        <h1 className="text-4xl font-bold text-gray-900">Trading Signals</h1>
                        <p className="text-gray-600 mt-2">Real-time signals from automated strategies</p>
                    </div>

                    {/* Connection Status */}
                    <div className="flex items-center gap-2">
                        <div className={`h-3 w-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                        <span className={`text-sm font-medium ${isConnected ? 'text-green-700' : 'text-red-700'}`}>
                            {isConnected ? 'Connected' : 'Disconnected'}
                        </span>
                    </div>
                </header>

                {/* Filters */}
                <div className="bg-white p-4 rounded-lg shadow-sm mb-6 flex flex-wrap gap-4 items-center">
                    {/* Strategy Filter */}
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700">Strategies:</span>
                        {['theta', 'calendar'].map(strategy => (
                            <button
                                key={strategy}
                                onClick={() => toggleStrategy(strategy)}
                                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${selectedStrategies.includes(strategy)
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    }`}
                            >
                                {strategy.charAt(0).toUpperCase() + strategy.slice(1)}
                            </button>
                        ))}
                    </div>

                    {/* Status Filter */}
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700">Status:</span>
                        {(['all', 'pending', 'approved', 'rejected'] as const).map(status => (
                            <button
                                key={status}
                                onClick={() => setFilter(status)}
                                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${filter === status
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    }`}
                            >
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                            </button>
                        ))}
                    </div>

                    {/* Signal Count */}
                    <div className="ml-auto text-sm text-gray-600">
                        {getFilteredSignals().length} signal{getFilteredSignals().length !== 1 ? 's' : ''}
                    </div>
                </div>

                {/* Error Display */}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6 flex items-center justify-between">
                        <div>
                            <strong>Error:</strong> {error}
                        </div>
                        <button className="text-red-500 hover:text-red-700">✕</button>
                    </div>
                )}

                {/* Signals List */}
                <SignalsList
                    signals={getFilteredSignals()}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    loading={loading}
                    emptyMessage={`No ${filter !== 'all' ? filter : ''} signals available`}
                />
            </div>
        </div>
    );
}
