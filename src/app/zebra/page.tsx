'use client';

import { useState, useEffect } from 'react';
import { useSignalContext } from '@/components/providers/SignalProvider';
import { ZebraSignalCard } from '@/components/zebra/ZebraSignalCard';
import { ZebraBuilder } from '@/components/zebra/ZebraBuilder';
import { Loader2, RefreshCw } from 'lucide-react';
import { useSettings } from '@/components/providers/SettingsProvider';

export default function ZebraPage() {
    const { isConnected } = useSignalContext();
    const { settings } = useSettings();

    const [activeTab, setActiveTab] = useState<'signals' | 'builder' | 'positions'>('signals');
    const [candidates, setCandidates] = useState<any[]>([]);
    const [builtStructures, setBuiltStructures] = useState<any[]>([]);
    const [positions, setPositions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isexecuting, setIsExecuting] = useState<string | null>(null);

    // Fetch Candidates from DB
    const fetchCandidates = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/zebra/candidates');
            const data = await res.json();
            if (data.candidates) {
                setCandidates(data.candidates);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // Fetch Positions
    const fetchPositions = async () => {
        try {
            const res = await fetch('/api/zebra/positions');
            const data = await res.json();
            if (data.positions) {
                setPositions(data.positions);
            }
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        if (activeTab === 'positions') {
            fetchPositions();
        } else {
            fetchCandidates();
        }
    }, [activeTab]);

    // Handle Execution
    const handleExecute = async (signal: any) => {
        if (!settings?.tastytrade?.refreshToken || !settings?.tastytrade?.accounts?.[0]?.['account-number']) {
            alert('Please configure Tastytrade credentials in Settings first.');
            return;
        }

        setIsExecuting(signal.id || signal.tempId);

        try {
            const payload = {
                refreshToken: settings.tastytrade.refreshToken,
                accountNumber: settings.tastytrade.accounts[0]['account-number'],
                symbol: signal.symbol,
                direction: signal.direction,
                expiry: signal.expiry,
                // Extract strikes from legs if improved signal structure, otherwise rely on flat fields
                longStrike: signal.legs ? signal.legs.find((l: any) => l.side === 'md_long')?.strike : 0,
                shortStrike: signal.legs ? signal.legs.find((l: any) => l.side === 'md_short')?.strike : 0,
                quantity: 1, // Default to 1 lot
                limitPrice: signal.net_debit // Use net debit as limit
            };

            const res = await fetch('/api/zebra/order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await res.json();

            if (res.ok) {
                // Remove from list if it was a candidate
                if (activeTab === 'signals') {
                    setCandidates(prev => prev.filter(c => c.id !== signal.id));
                }
                alert(`Order Submitted! ID: ${result.order_id}`);
            } else {
                alert(`Error: ${result.error}`);
            }
        } catch (e) {
            console.error(e);
            alert('Execution failed');
        } finally {
            setIsExecuting(null);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-tm-purple to-purple-400">
                        ZEBRA Strategy
                    </h1>
                    <p className="text-tm-muted mt-1">Zero Extrinsic Back Ratio Spread Management</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex bg-tm-surface p-1 rounded-xl border border-white/10">
                        <button
                            onClick={() => setActiveTab('signals')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'signals'
                                ? 'bg-tm-purple text-white shadow-lg'
                                : 'text-tm-muted hover:text-white'
                                }`}
                        >
                            Active Signals ({candidates.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('builder')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'builder'
                                ? 'bg-tm-purple text-white shadow-lg'
                                : 'text-tm-muted hover:text-white'
                                }`}
                        >
                            Manual Builder
                        </button>
                    </div>
                    <button
                        onClick={fetchCandidates}
                        className="p-3 rounded-xl bg-tm-surface border border-white/10 hover:bg-white/5 transition-colors"
                    >
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Content */}
            {activeTab === 'signals' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {loading ? (
                        [...Array(3)].map((_, i) => (
                            <div key={i} className="h-64 rounded-xl bg-tm-surface animate-pulse" />
                        ))
                    ) : candidates.length > 0 ? (
                        candidates.map(signal => (
                            <ZebraSignalCard
                                key={signal.id}
                                signal={signal}
                                onApprove={() => handleExecute(signal)}
                                onSkip={() => { }}
                                isApproving={isexecuting === signal.id}
                            />
                        ))
                    ) : (
                        <div className="col-span-full py-12 text-center text-tm-muted bg-tm-surface/30 rounded-2xl border border-dashed border-white/10">
                            <p>No active ZEBRA signals found.</p>
                            <button onClick={() => setActiveTab('builder')} className="text-tm-purple hover:underline mt-2">
                                Try the Manual Builder
                            </button>
                        </div>
                    )}
                </div>
            ) : activeTab === 'positions' ? (
                <div className="space-y-6">
                    {positions.length === 0 ? (
                        <div className="py-12 text-center text-tm-muted bg-tm-surface/30 rounded-2xl border border-dashed border-white/10">
                            <p>No open ZEBRA positions tracking.</p>
                            <button onClick={() => setActiveTab('signals')} className="text-tm-purple hover:underline mt-2">
                                Find signals
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {positions.map((pos) => (
                                <div key={pos.id} className="glass-card p-6 flex items-center justify-between">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold text-lg">{pos.symbol}</span>
                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${pos.direction === 'LONG' ? 'bg-tm-green/20 text-tm-green' : 'bg-red-400/20 text-red-400'
                                                }`}>
                                                {pos.direction}
                                            </span>
                                            <span className="text-xs text-tm-muted bg-tm-surface px-2 py-0.5 rounded">
                                                Qty: {pos.quantity}
                                            </span>
                                        </div>
                                        <div className="flex gap-4 text-sm text-tm-muted">
                                            <span>Entry: <b className="text-white">${pos.entry_price?.toFixed(2)}</b></span>
                                            <span>Current: <b className="text-white">${pos.current_price?.toFixed(2)}</b></span>
                                            <span>Expiry: {pos.expiry?.split('T')[0]}</span>
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <p className="text-xs text-tm-muted mb-1">Unrealized P&L</p>
                                        <p className={`text-xl font-bold ${(pos.unrealized_pnl || 0) >= 0 ? 'text-tm-green' : 'text-red-400'
                                            }`}>
                                            {(pos.unrealized_pnl || 0) >= 0 ? '+' : ''}
                                            {pos.unrealized_pnl?.toFixed(2)}
                                        </p>
                                        <p className={`text-xs ${(pos.unrealized_pnl_pct || 0) >= 0 ? 'text-tm-green' : 'text-red-400'
                                            }`}>
                                            {(pos.unrealized_pnl_pct || 0) >= 0 ? '+' : ''}
                                            {pos.unrealized_pnl_pct?.toFixed(2)}%
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-8">
                    <ZebraBuilder onStructuresFound={(structs) => {
                        // Add temporary IDs
                        const withIds = structs.map((s, i) => ({
                            ...s,
                            id: `temp_${Date.now()}_${i}`,
                            tempId: `temp_${Date.now()}_${i}`,
                            status: 'derived'
                        }));
                        setBuiltStructures(withIds);
                    }} />

                    {builtStructures.length > 0 && (
                        <div>
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-tm-purple" />
                                Generated Structures ({builtStructures.length})
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {builtStructures.map(structure => (
                                    <ZebraSignalCard
                                        key={structure.id}
                                        signal={structure}
                                        onApprove={() => handleExecute(structure)}
                                        onSkip={() => setBuiltStructures(prev => prev.filter(s => s.id !== structure.id))}
                                        isApproving={isexecuting === structure.id}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
