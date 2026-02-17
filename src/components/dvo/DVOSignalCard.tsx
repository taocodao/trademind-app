
"use client";

import {
    TrendingUp,
    TrendingDown,
    Calendar,
    Target,
    Activity,
    CheckCircle,
    XCircle,
    Loader2,
    Shield,
    Info,
    AlertTriangle,
    DollarSign
} from 'lucide-react';

interface DVOSignal {
    id: string;
    symbol: string;
    strategy_type: string;
    action: string;

    // Trade Details
    limit_price: number;
    strike: number;
    expiration: string;
    dte: number;

    // Fundamental Context
    current_price: number;
    fair_value: number;
    margin_of_safety: number; // 0.25 = 25%
    regime: string; // UNDERVALUED, FAIR, OVERVALUED, CRISIS

    // Metadata
    reasoning?: string;
    status: string;
    created_at?: string;
}

interface DVOSignalCardProps {
    signal: DVOSignal;
    onApprove: () => void;
    onSkip: () => void;
    isApproving: boolean;
}

export function DVOSignalCard({ signal, onApprove, onSkip, isApproving }: DVOSignalCardProps) {
    const isShortPut = signal.strategy_type === 'SHORT_PUT';

    // MoS Coloring
    const mosPct = signal.margin_of_safety * 100;
    const mosColor = mosPct > 20 ? 'text-tm-green' : mosPct > 10 ? 'text-yellow-400' : 'text-tm-red';

    return (
        <div className="glass-card p-5 relative overflow-hidden group hover:border-blue-500/50 transition-colors">
            {/* Background Gradient */}
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-transparent rounded-bl-full pointer-events-none`} />

            {/* Header */}
            <div className="flex items-center justify-between mb-4 relative">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-blue-500/20">
                        <DollarSign className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-xl">{signal.symbol}</h3>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                DVO
                            </span>
                        </div>
                        <p className="text-sm font-medium text-tm-muted">
                            {isShortPut ? 'Sell Put' : signal.strategy_type}
                        </p>
                    </div>
                </div>

                <div className="text-right">
                    <div className="flex items-center justify-end gap-1 text-sm text-tm-muted mb-1">
                        <Shield className="w-3 h-3" />
                        Margin of Safety
                    </div>
                    <div className={`text-2xl font-bold font-mono ${mosColor}`}>
                        {mosPct.toFixed(1)}%
                    </div>
                </div>
            </div>

            {/* Valuation Grid */}
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="p-3 bg-tm-surface rounded-xl border border-white/5">
                    <p className="text-xs text-tm-muted mb-1">Current Price</p>
                    <p className="font-mono text-lg font-bold">${signal.current_price.toFixed(2)}</p>
                </div>
                <div className="p-3 bg-tm-surface rounded-xl border border-white/5">
                    <p className="text-xs text-tm-muted mb-1">Fair Value</p>
                    <p className="font-mono text-lg font-bold text-blue-400">${signal.fair_value.toFixed(2)}</p>
                </div>
            </div>

            {/* Trade Details */}
            <div className="grid grid-cols-3 gap-2 mb-4 text-xs">
                <div className="bg-white/5 p-2 rounded-lg text-center">
                    <p className="text-tm-muted mb-1">Strike</p>
                    <p className="font-mono font-semibold">${signal.strike}</p>
                </div>
                <div className="bg-white/5 p-2 rounded-lg text-center">
                    <p className="text-tm-muted mb-1">Credit</p>
                    <p className="font-mono font-semibold text-tm-green">${signal.limit_price.toFixed(2)}</p>
                </div>
                <div className="bg-white/5 p-2 rounded-lg text-center">
                    <p className="text-tm-muted mb-1">Expiry</p>
                    <p className="font-semibold">{signal.expiration}</p>
                    <p className="text-[10px] text-tm-muted">{signal.dte}d</p>
                </div>
            </div>

            {/* Rationale */}
            {signal.reasoning && (
                <div className="mb-4 bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg flex gap-2">
                    <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-300 italic leading-relaxed">
                        "{signal.reasoning}"
                    </p>
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 mt-auto">
                <button
                    onClick={onSkip}
                    disabled={isApproving}
                    className="flex-1 py-3 rounded-xl border border-white/10 bg-white/5 text-tm-muted hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    <XCircle className="w-4 h-4" />
                    Skip
                </button>
                <button
                    onClick={onApprove}
                    disabled={isApproving}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:to-blue-400 text-white font-semibold transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none"
                >
                    {isApproving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <CheckCircle className="w-4 h-4" />
                    )}
                    {isApproving ? 'Executing...' : 'Approve Trade'}
                </button>
            </div>

            {/* Strategy Footer */}
            <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-tm-muted opacity-60">
                <AlertTriangle className="w-3 h-3" />
                <span>Deep Value Strat: Sell Put only if Price &lt; Value</span>
            </div>
        </div>
    );
}

export function isDVOSignal(signal: any): boolean {
    return signal?.strategy_type === 'SHORT_PUT' || signal?.strategy_type === 'LEAPS_CALL' || signal?.strategy === 'dvo';
}
