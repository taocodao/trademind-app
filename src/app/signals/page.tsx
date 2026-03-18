"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
    ArrowLeft,
    TrendingUp,
    Calendar,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Loader2,
    RefreshCw,
    Wifi,
    WifiOff
} from "lucide-react";
import Link from "next/link";
import { useSignalContext } from "@/components/providers/SignalProvider";
import { ThetaSignalCard, isThetaSignal } from "@/components/signals/ThetaSignalCard";
import { CalendarSignalCard, isCalendarSignal } from "@/components/signals/CalendarSignalCard";
import { ZebraSignalCard, isZebraSignal } from "@/components/zebra/ZebraSignalCard";
import { DVOSignalCard, isDVOSignal } from "@/components/dvo/DVOSignalCard";
import { TurboBounceSignalCard, isTurboBounceSignal } from "@/components/signals/TurboBounceSignalCard";
import { TurboCoreSignalCard } from "@/components/signals/TurboCoreSignalCard";
import { useStrategyContext } from "@/components/providers/StrategyContext";
import { StrategyTabs } from "@/components/ui/StrategyTabs";
import { useSettings } from "@/components/providers/SettingsProvider";

interface Signal {
    id: string;
    symbol: string;
    strategy: string;
    direction?: string;
    strike?: number;
    frontExpiry?: string;
    backExpiry?: string;
    cost: number;
    potentialReturn: number;
    returnPercent?: number;
    winRate?: number;
    riskLevel?: string;
    status: string;
    rationale?: string;
    created_at?: string;
    receivedAt?: number;
    createdAt?: string;
    submittedAt?: string;
    // TurboBounce specific
    type?: string;
    pool?: string;
    scanner_rank?: number;
    total_score?: number;
    rsi_2?: number;
    iv_rank?: number;
    target_anchor_dte?: number;
    target_hedge_dte?: number;
    target_delta?: number;
    strategy_type?: string;
    contracts?: number; // Added for TQQQ dynamic sizing
}

// Format an ISO string or legacy timestamp string into the user's local timezone
function formatTime(timeStr: string | undefined): string {
    if (!timeStr) return 'N/A';
    try {
        // Strip microseconds and ensure Z suffix if missing
        const cleanStr = timeStr.split('.')[0];
        const hasTimechain = cleanStr.includes('T') || cleanStr.includes(' ');
        if (!hasTimechain) return timeStr; // Not a valid ISO date

        const expStr = cleanStr.endsWith('Z') || cleanStr.includes('+') ? cleanStr : cleanStr + 'Z';
        const safeExpStr = expStr.replace(' ', 'T');
        const date = new Date(safeExpStr);

        // Display as e.g. "3:30 PM EST"
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });
    } catch (e) {
        return timeStr;
    }
}

export default function SignalsPage() {
    const { ready, authenticated } = usePrivy();
    const { activeStrategy, setActiveStrategy, enabledStrategies } = useStrategyContext();
    const { settings } = useSettings();
    const router = useRouter();
    const { allSignals, isConnected, removeSignal, updateSignalStatus } = useSignalContext();
    const [approving, setApproving] = useState<string | null>(null);
    const [confirmModal, setConfirmModal] = useState<Signal | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [executedIds, setExecutedIds] = useState<Set<string>>(new Set());

    const signals = allSignals.filter((s: any) => {
        if (s.status !== 'pending') {
            return false;
        }

        // Strategy filter
        const strat = (s.strategy || '').toLowerCase();
        // Fallback matching 'REBALANCE' type to 'TQQQ_TURBOCORE' if not explicitly defined
        const isLegacyRebalance = ((s as any).type === 'REBALANCE' && activeStrategy === 'TQQQ_TURBOCORE' && s.strategy === undefined);
        if (strat !== activeStrategy.toLowerCase() && !isLegacyRebalance) {
            return false;
        }

        // Check expires_at from backend (next market open)
        const expiresAt = s.expiresAt || s.expires_at;
        if (expiresAt) {
            const cleanExp = expiresAt.split('.')[0];
            const expStr = cleanExp.endsWith('Z') || cleanExp.includes('+') ? cleanExp : cleanExp + 'Z';
            const safeExpStr = expStr.replace(' ', 'T');
            const expTime = new Date(safeExpStr).getTime();
            const now = Date.now();
            return expTime > now;
        }

        // Fallback: keep tracking signals from last 24 hours
        const timeStr = s.createdAt || s.created_at;
        const timestamp = timeStr
            ? new Date(timeStr.endsWith('Z') || timeStr.includes('+') ? timeStr : timeStr + 'Z').getTime()
            : (s.receivedAt || Date.now());

        const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
        return timestamp > twentyFourHoursAgo;
    }) as Signal[];

    useEffect(() => {
        if (ready && !authenticated) {
            router.push("/");
        }
    }, [ready, authenticated, router]);

    const handleApproveClick = (signal: Signal) => {
        setConfirmModal(signal);
    };

    const handleConfirmApprove = async () => {
        if (!confirmModal) return;

        setApproving(confirmModal.id);
        setConfirmModal(null); // Close modal immediately to show loading state on card

        try {
            const isTurboCore = (confirmModal.strategy || '').toLowerCase().includes('turbocore') || (confirmModal as any).type === 'REBALANCE';
            console.log(`Approving signal ${confirmModal.id} with execution...`);
            const response = await fetch(`/api/signals/${confirmModal.id}/approve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    execute: true,
                    signal: confirmModal,  // Include full signal data for strategy routing
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                console.error("Approval failed:", data);
                throw new Error(data.error || 'Trade execution failed');
            }

            console.log("Trade executed successfully:", data);

            // Mark as executed (lock the button) before removing from list
            setExecutedIds(prev => new Set(prev).add(confirmModal.id));

            // Remove the executed signal from the list
            removeSignal(confirmModal.id);

            // Navigate to positions to see the trade unless it's a shadow execution
            if (!settings?.tastytrade?.refreshToken && isTurboCore) {
                // For shadow trades, just clear it and maybe refresh
                const syncRes = await fetch('/api/shadow-positions', {
                    method: 'POST',
                    body: JSON.stringify({
                        action: 'sync',
                        strategy: confirmModal.strategy || 'TQQQ_TURBOCORE',
                        signalId: confirmModal.id,
                        orders: [] // Note: simplified, actual shadow sync might happen inside dashboard instead, or we let the backend handle it
                    }),
                    headers: { 'Content-Type': 'application/json' }
                });
            } else {
                router.push('/positions');
            }

        } catch (err) {
            console.error('Trade execution failed:', err);
            setError(err instanceof Error ? err.message : 'Trade failed');
        } finally {
            setApproving(null);
        }
    };

    const handleSkip = (id: string) => {
        removeSignal(id);
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
        <main className="min-h-screen pb-24 max-w-4xl mx-auto w-full border-x border-white/5 bg-tm-bg shadow-2xl relative">
            <header className="px-6 pt-12 pb-6 flex items-center gap-4">
                <Link href="/dashboard" className="w-10 h-10 rounded-full bg-tm-surface flex items-center justify-center">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div className="flex-1">
                    <h1 className="text-xl font-bold">Trade Signals</h1>
                    <p className="text-sm text-tm-muted">{signals.length} pending</p>
                </div>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isConnected ? 'bg-tm-green/20' : 'bg-tm-red/20'}`}>
                    {isConnected ? (
                        <Wifi className="w-5 h-5 text-tm-green" />
                    ) : (
                        <WifiOff className="w-5 h-5 text-tm-red" />
                    )}
                </div>
            </header>

            {/* Error */}
            {error && (
                <div className="px-6 mb-4">
                    <div className="glass-card p-4 border border-tm-red/30 flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-tm-red flex-shrink-0" />
                        <p className="text-sm text-tm-red">{error}</p>
                        <button onClick={() => setError(null)} className="ml-auto text-sm text-tm-purple">
                            Dismiss
                        </button>
                    </div>
                </div>
            )}

            {/* Waiting for signals message when disconnected */}
            {!isConnected && signals.length === 0 && (
                <div className="px-6 mb-4">
                    <div className="glass-card p-4 border border-yellow-500/30 flex items-center gap-3">
                        <WifiOff className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                        <p className="text-sm text-yellow-400">Connecting to signal server...</p>
                    </div>
                </div>
            )}

            <div className="px-6 mb-4">
                <StrategyTabs
                    strategies={enabledStrategies}
                    activeKey={activeStrategy}
                    onChange={setActiveStrategy}
                />
            </div>

            {/* Signals List */}
            <div className="px-6 space-y-4">
                {signals.map((signal) => (
                    isZebraSignal(signal) ? (
                        <ZebraSignalCard
                            key={signal.id}
                            signal={signal as any}
                            onApprove={() => handleApproveClick(signal)}
                            onSkip={() => handleSkip(signal.id)}
                            isApproving={approving === signal.id}
                        />
                    ) : isDVOSignal(signal) ? (
                        <DVOSignalCard
                            key={signal.id}
                            signal={signal as any}
                            onApprove={() => handleApproveClick(signal)}
                            onSkip={() => handleSkip(signal.id)}
                            isApproving={approving === signal.id}
                        />
                    ) : isThetaSignal(signal) ? (
                        <ThetaSignalCard
                            key={signal.id}
                            signal={signal as any}
                            onApprove={() => handleApproveClick(signal)}
                            onSkip={() => handleSkip(signal.id)}
                            isApproving={approving === signal.id}
                        />
                    ) : isCalendarSignal(signal) ? (
                        <CalendarSignalCard
                            key={signal.id}
                            signal={signal as any}
                            onApprove={() => handleApproveClick(signal)}
                            onSkip={() => handleSkip(signal.id)}
                            isApproving={approving === signal.id}
                        />
                    ) : isTurboBounceSignal(signal) ? (
                        <TurboBounceSignalCard
                            key={signal.id}
                            signal={signal as any}
                            onApprove={() => handleApproveClick(signal)}
                            onSkip={() => handleSkip(signal.id)}
                            isApproving={approving === signal.id}
                        />
                    ) : (signal.strategy?.toLowerCase().includes('turbocore') || (signal as any).type === 'REBALANCE') ? (
                        <TurboCoreSignalCard
                            key={signal.id}
                            signal={signal as any}
                            onExecute={() => handleApproveClick(signal)}
                            executingId={approving}
                            accountData={null}
                            isExecuted={executedIds.has(signal.id)}
                            shadowBalance={(settings?.shadowLedger as unknown as Record<string, any>)?.[activeStrategy]?.balance || (settings?.shadowLedger as unknown as Record<string, any>)?.['default']?.balance}
                        />
                    ) : (
                        <SignalCard
                            key={signal.id}
                            signal={signal}
                            onApprove={() => handleApproveClick(signal)}
                            onSkip={() => handleSkip(signal.id)}
                            isApproving={approving === signal.id}
                        />
                    )
                ))}

                {isConnected && signals.length === 0 && (
                    <div className="glass-card p-8 text-center">
                        <CheckCircle className="w-12 h-12 text-tm-green mx-auto mb-4" />
                        <h3 className="font-semibold mb-2">All caught up!</h3>
                        <p className="text-sm text-tm-muted">No pending signals</p>
                    </div>
                )}
            </div>

            {/* Confirmation Modal */}
            {confirmModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50">
                    <div className="glass-card p-6 max-w-md w-full">
                        <h2 className="text-xl font-bold mb-4">Confirm Trade</h2>

                        {((confirmModal.strategy || '').toLowerCase().includes('turbocore') || (confirmModal as any).type === 'REBALANCE') ? (
                            <div className="bg-tm-surface rounded-xl p-4 mb-4">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-xl bg-tm-purple/20 flex items-center justify-center">
                                        <TrendingUp className="w-5 h-5 text-tm-purple" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold">Atomic Rebalance</h3>
                                        <p className="text-sm text-tm-muted">{confirmModal.strategy || 'TurboCore'}</p>
                                    </div>
                                </div>
                                
                                <p className="text-xs text-tm-muted mb-2">Target Allocations:</p>
                                <div className="grid grid-cols-2 gap-2 mb-4">
                                    {((confirmModal as any).legs || []).map((leg: any, i: number) => (
                                        <div key={i} className="flex justify-between bg-black/30 p-2 rounded text-xs px-3 border border-white/5">
                                            <span className="font-bold">{leg.symbol}</span>
                                            <span className="text-purple-400 font-mono">{(leg.target_pct * 100).toFixed(0)}%</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="text-xs text-tm-muted bg-blue-500/10 border border-blue-500/20 p-2 rounded">
                                    This will intelligently size, route, and execute notional market orders to achieve these precise target allocations.
                                </div>
                            </div>
                        ) : (
                            <div className="bg-tm-surface rounded-xl p-4 mb-4">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-xl bg-tm-purple/20 flex items-center justify-center">
                                        <Calendar className="w-5 h-5 text-tm-purple" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold">{confirmModal.symbol}</h3>
                                        <p className="text-sm text-tm-muted">{confirmModal.strategy}</p>
                                    </div>
                                </div>

                                <div className="flex gap-4 mt-2 mb-4 text-xs text-tm-muted">
                                    <div>
                                        <span className="opacity-70">Generated:</span>{' '}
                                        <span className="font-medium text-white/90">{formatTime((confirmModal as any).createdAt || (confirmModal as any).created_at as string)}</span>
                                    </div>
                                    <div>
                                        <span className="opacity-70">Expires:</span>{' '}
                                        <span className="font-medium text-white/90">{formatTime((confirmModal as any).expiresAt || (confirmModal as any).expires_at as string)}</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                        <p className="text-tm-muted">Strike</p>
                                        <p className="font-mono font-semibold">${confirmModal.strike}</p>
                                    </div>
                                    <div>
                                        <p className="text-tm-muted">Cost</p>
                                        <p className="font-mono font-semibold">${confirmModal.cost}</p>
                                    </div>
                                    <div>
                                        <p className="text-tm-muted">Front Expiry</p>
                                        <p className="font-semibold">{confirmModal.frontExpiry}</p>
                                    </div>
                                    <div>
                                        <p className="text-tm-muted">Back Expiry</p>
                                        <p className="font-semibold">{confirmModal.backExpiry}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center gap-2 mb-6 text-sm">
                            <AlertTriangle className="w-4 h-4 text-yellow-400" />
                            <span className="text-tm-muted">
                                {settings?.tastytrade?.refreshToken 
                                    ? "This will submit a real trade to Tastytrade" 
                                    : "This will log a virtual trade to your Shadow Ledger"}
                            </span>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmModal(null)}
                                className="flex-1 py-3 rounded-xl border border-white/20 text-tm-muted hover:bg-tm-surface transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmApprove}
                                disabled={approving === confirmModal.id}
                                className="flex-1 py-3 rounded-xl bg-tm-green hover:bg-green-600 transition-colors font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {approving === confirmModal.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <CheckCircle className="w-4 h-4" />
                                )}
                                Execute Trade
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}

function SignalCard({
    signal,
    onApprove,
    onSkip,
    isApproving,
}: {
    signal: Signal;
    onApprove: () => void;
    onSkip: () => void;
    isApproving: boolean;
}) {
    const riskColors: { [key: string]: string } = {
        Low: "text-tm-green bg-tm-green/20",
        Medium: "text-yellow-400 bg-yellow-400/20",
        High: "text-tm-red bg-tm-red/20",
    };

    return (
        <div className="glass-card p-5">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-tm-purple/20 flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-tm-purple" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg">{signal.symbol}</h3>
                        <p className="text-sm text-tm-muted">{signal.strategy}</p>
                    </div>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${riskColors[signal.riskLevel || 'Medium'] || riskColors.Medium}`}>
                    {signal.riskLevel || 'Medium'}
                </span>
            </div>

            {/* Strike & Expiries */}
            <div className="grid grid-cols-3 gap-3 mb-4 text-sm">
                <div>
                    <p className="text-tm-muted">Strike</p>
                    <p className="font-mono font-semibold">${signal.strike}</p>
                </div>
                <div>
                    <p className="text-tm-muted">Front</p>
                    <p className="font-semibold">{signal.frontExpiry}</p>
                </div>
                <div>
                    <p className="text-tm-muted">Back</p>
                    <p className="font-semibold">{signal.backExpiry}</p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <p className="text-sm text-tm-muted">Cost</p>
                    <p className="font-mono font-bold text-xl">${signal.cost}</p>
                </div>
                <div className="text-right">
                    <p className="text-sm text-tm-muted">Potential Return</p>
                    <p className="font-mono font-bold text-xl text-tm-green">
                        +${signal.potentialReturn}
                        <span className="text-sm ml-1">({signal.returnPercent}%)</span>
                    </p>
                </div>
            </div>

            {/* Win Rate & Rationale */}
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                    <div className="relative w-12 h-12">
                        <svg className="w-12 h-12 transform -rotate-90">
                            <circle
                                className="text-tm-surface"
                                strokeWidth="3"
                                stroke="currentColor"
                                fill="transparent"
                                r="20"
                                cx="24"
                                cy="24"
                            />
                            <circle
                                className="text-tm-green"
                                strokeWidth="3"
                                strokeDasharray={`${(signal.winRate || 0) * 1.26} 126`}
                                strokeLinecap="round"
                                stroke="currentColor"
                                fill="transparent"
                                r="20"
                                cx="24"
                                cy="24"
                            />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
                            {signal.winRate}%
                        </span>
                    </div>
                    <div>
                        <p className="text-sm text-tm-muted">Win Rate</p>
                        <p className="font-semibold">Historical</p>
                    </div>
                </div>
            </div>

            {/* Rationale */}
            {signal.rationale && (
                <p className="text-sm text-tm-muted mb-4 italic">&quot;{signal.rationale}&quot;</p>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
                <button
                    onClick={onSkip}
                    disabled={isApproving}
                    className="flex-1 py-3 rounded-xl border border-white/20 text-tm-muted hover:bg-tm-surface transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    <XCircle className="w-4 h-4" />
                    Skip
                </button>
                <button
                    onClick={onApprove}
                    disabled={isApproving}
                    className="flex-1 py-3 rounded-xl bg-tm-purple hover:bg-purple-700 transition-colors font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {isApproving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <CheckCircle className="w-4 h-4" />
                    )}
                    {isApproving ? 'Executing...' : 'Approve'}
                </button>
            </div>
        </div>
    );
}
