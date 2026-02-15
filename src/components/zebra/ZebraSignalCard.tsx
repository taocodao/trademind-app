'use client';

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
    AlertTriangle
} from 'lucide-react';

interface ZebraSignal {
    id: string;
    symbol: string;
    direction: "LONG" | "SHORT";
    expiry: string;
    dte: number;

    // Pricing
    net_debit: number;
    max_loss: number;
    breakeven: number;

    // Greeks
    net_delta: number;
    net_theta: number;
    net_extrinsic: number;

    // Scores
    construction_score: number;
    directional_confidence: number;
    capital_efficiency: number;

    // Metadata
    rationale?: string;
    strategy: string;
    status: string;
    created_at?: string;
}

interface ZebraSignalCardProps {
    signal: ZebraSignal;
    onApprove: () => void;
    onSkip: () => void;
    isApproving: boolean;
}

export function ZebraSignalCard({ signal, onApprove, onSkip, isApproving }: ZebraSignalCardProps) {
    const isLong = signal.direction === 'LONG';
    const DirectionIcon = isLong ? TrendingUp : TrendingDown;
    const directionColor = isLong ? 'text-tm-green' : 'text-tm-red';

    // Extrinsic Status
    const extStatus = Math.abs(signal.net_extrinsic) < 0.10 ? 'text-tm-green' :
        Math.abs(signal.net_extrinsic) < 0.30 ? 'text-yellow-400' : 'text-tm-red';

    return (
        <div className="glass-card p-5 relative overflow-hidden group hover:border-tm-purple/50 transition-colors">
            {/* Background Gradient */}
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-${isLong ? 'green' : 'red'}-500/10 to-transparent rounded-bl-full pointer-events-none`} />

            {/* Header */}
            <div className="flex items-center justify-between mb-4 relative">
                <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isLong ? 'bg-tm-green/20' : 'bg-tm-red/20'}`}>
                        <DirectionIcon className={`w-6 h-6 ${directionColor}`} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-xl">{signal.symbol}</h3>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-tm-purple/20 text-tm-purple border border-tm-purple/30">
                                ZEBRA
                            </span>
                        </div>
                        <p className={`text-sm font-medium ${directionColor}`}>
                            {isLong ? 'Bullish' : 'Bearish'} {signal.direction}
                        </p>
                    </div>
                </div>

                <div className="text-right">
                    <div className="flex items-center justify-end gap-1 text-sm text-tm-muted mb-1">
                        <Activity className="w-3 h-3" />
                        Score
                    </div>
                    <div className="text-2xl font-bold font-mono">
                        {signal.construction_score.toFixed(0)}
                        <span className="text-sm text-tm-muted font-normal">/100</span>
                    </div>
                </div>
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="p-3 bg-tm-surface rounded-xl border border-white/5">
                    <p className="text-xs text-tm-muted mb-1 flex items-center gap-1">
                        <Target className="w-3 h-3" /> Net Debit (Max Risk)
                    </p>
                    <p className="font-mono text-lg font-bold">
                        ${signal.net_debit.toFixed(2)}
                    </p>
                </div>
                <div className="p-3 bg-tm-surface rounded-xl border border-white/5">
                    <p className="text-xs text-tm-muted mb-1 flex items-center gap-1">
                        <Shield className="w-3 h-3" /> Breakeven
                    </p>
                    <p className="font-mono text-lg font-bold text-tm-blue">
                        ${signal.breakeven.toFixed(2)}
                    </p>
                </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-3 gap-2 mb-4 text-xs">
                <div className="bg-white/5 p-2 rounded-lg text-center">
                    <p className="text-tm-muted mb-1">Expiry</p>
                    <p className="font-semibold">{signal.expiry}</p>
                    <p className="text-[10px] text-tm-muted">{signal.dte} days</p>
                </div>
                <div className="bg-white/5 p-2 rounded-lg text-center">
                    <p className="text-tm-muted mb-1">Net Delta</p>
                    <p className={`font-mono font-semibold ${Math.abs(signal.net_delta) > 0.8 ? 'text-tm-green' : 'text-yellow-400'}`}>
                        {signal.net_delta.toFixed(2)}
                    </p>
                </div>
                <div className="bg-white/5 p-2 rounded-lg text-center">
                    <p className="text-tm-muted mb-1">Extrinsic</p>
                    <p className={`font-mono font-semibold ${extStatus}`}>
                        ${signal.net_extrinsic.toFixed(2)}
                    </p>
                </div>
            </div>

            {/* Rationale */}
            {signal.rationale && (
                <div className="mb-4 bg-tm-blue/10 border border-tm-blue/20 p-3 rounded-lg flex gap-2">
                    <Info className="w-4 h-4 text-tm-blue flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-tm-blue/80 italic leading-relaxed">
                        "{signal.rationale}"
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
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-tm-purple to-purple-600 hover:to-purple-500 text-white font-semibold transition-all shadow-lg shadow-purple-900/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none"
                >
                    {isApproving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <CheckCircle className="w-4 h-4" />
                    )}
                    {isApproving ? 'Executing...' : 'Execute Trade'}
                </button>
            </div>

            {/* Warning Footer */}
            <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-tm-muted opacity-60">
                <AlertTriangle className="w-3 h-3" />
                <span>Zero Extrinsic Back Ratio Spread (2 Longs, 1 Short)</span>
            </div>
        </div>
    );
}
