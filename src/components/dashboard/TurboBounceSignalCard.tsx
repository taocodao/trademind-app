'use client';

import { TrendingUp, TrendingDown, Target, Zap, AlertTriangle, ShieldCheck } from 'lucide-react';

export interface TurboBounceSignal {
    id: string;
    timestamp: string;
    symbol: string;
    type: 'DIAGONAL' | 'CREDIT_SPREAD' | 'NAKED_LONG' | 'NAKED';
    strategy_name: string;
    pool: string;
    direction: 'BULLISH' | 'BEARISH';
    scanner_rank: number;
    total_score: number;
    rsi_2: number;
    iv_rank: number;
    category: string;
    rationale: string;

    target_anchor_dte?: number;
    target_hedge_dte?: number;
    target_delta?: number;

    status: string;
}

interface TurboBounceSignalCardProps {
    signal: TurboBounceSignal;
    tastyLinked?: boolean;
    onApproveExecute?: (id: string) => void;
    onTrackOnly?: (id: string) => void;
    executing?: boolean;
}

export function TurboBounceSignalCard({
    signal,
    tastyLinked = false,
    onApproveExecute,
    onTrackOnly,
    executing = false,
}: TurboBounceSignalCardProps) {

    const isBullish = signal.direction === 'BULLISH';
    const typeBorderColor = isBullish ? 'border-l-tm-green' : 'border-l-tm-red';
    const typeBadgeBg = isBullish ? 'bg-tm-green/15 text-tm-green' : 'bg-tm-red/15 text-tm-red';

    const ScoreIcon = signal.total_score >= 80 ? Zap : Target;
    const scoreColor = signal.total_score >= 80 ? 'text-tm-green' : signal.total_score >= 60 ? 'text-amber-400' : 'text-tm-red';

    const renderStrategyIcon = () => {
        switch (signal.type) {
            case 'DIAGONAL': return <TrendingUp className="w-3 h-3" />;
            case 'CREDIT_SPREAD': return <ShieldCheck className="w-3 h-3" />;
            case 'NAKED':
            case 'NAKED_LONG': return <Zap className="w-3 h-3" />;
            default: return null;
        }
    };

    return (
        <div className={`glass-card border-l-4 ${typeBorderColor} p-4`}>
            {/* Header row */}
            <div className="flex items-start justify-between mb-3">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold tracking-wider font-mono">
                            {signal.symbol}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${typeBadgeBg} flex items-center gap-1`}>
                            {renderStrategyIcon()}
                            {signal.type.replace('_', ' ')}
                        </span>
                    </div>

                    <p className="text-tm-muted text-xs flex items-center gap-1">
                        Rank #{signal.scanner_rank} · {signal.category}
                        {signal.timestamp && (
                            <span className="opacity-75">
                                ({new Date(signal.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                            </span>
                        )}
                    </p>
                </div>
                <div className={`flex flex-col items-end`}>
                    <span className={`text-lg font-bold ${scoreColor} flex items-center gap-1`}>
                        <ScoreIcon className="w-4 h-4" />
                        {signal.total_score.toFixed(0)}
                    </span>
                    <span className="text-[9px] uppercase text-tm-muted tracking-wide mt-[-2px]">Score</span>
                </div>
            </div>

            {/* Rationale */}
            <p className="text-tm-text text-xs mb-3 italic bg-white/5 p-2 rounded-lg border border-white/5">
                "{signal.rationale}"
            </p>

            {/* Metrics grid */}
            <div className="grid grid-cols-3 gap-2 mb-4 text-sm">
                <div className="bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                    <p className="text-[10px] text-tm-muted uppercase tracking-wide">RSI-2</p>
                    <p className={`font-mono font-bold ${isBullish ? 'text-tm-green' : 'text-tm-red'}`}>
                        {signal.rsi_2.toFixed(1)}
                    </p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                    <p className="text-[10px] text-tm-muted uppercase tracking-wide">IV Rank</p>
                    <p className="font-mono font-bold text-amber-400">
                        {signal.iv_rank.toFixed(1)}%
                    </p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                    <p className="text-[10px] text-tm-muted uppercase tracking-wide">Target DTE</p>
                    <p className="font-mono font-bold text-tm-text">
                        {signal.target_anchor_dte || '-'}d
                    </p>
                </div>
            </div>

            {/* Action buttons or Status Badge */}
            <div className="mt-2">
                {signal.status.toUpperCase() === 'EXECUTED' ? (
                    <div className="flex items-center justify-center gap-2 bg-tm-green/20 text-tm-green py-2.5 rounded-xl font-bold text-sm">
                        <span>✓ Executed</span>
                    </div>
                ) : signal.status.toUpperCase() === 'TRACKED' ? (
                    <div className="flex items-center justify-center gap-2 bg-tm-purple/20 text-tm-purple py-2.5 rounded-xl font-bold text-sm">
                        <span>👁️ Tracking Only</span>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-2">
                        {tastyLinked ? (
                            <button
                                onClick={() => onApproveExecute && onApproveExecute(signal.id)}
                                disabled={executing}
                                className="btn-primary text-sm py-2.5 text-center disabled:opacity-50 rounded-xl"
                            >
                                {executing ? 'Executing…' : 'Execute Builder'}
                            </button>
                        ) : (
                            <div className="flex items-center justify-center gap-1.5 text-[11px] text-tm-muted rounded-xl border border-white/10 px-1 py-1 text-center leading-tight">
                                <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                                <span>Link Tastytrade<br />to execute</span>
                            </div>
                        )}
                        <button
                            onClick={() => onTrackOnly && onTrackOnly(signal.id)}
                            disabled={executing}
                            className="border border-white/20 hover:border-tm-purple/50 text-sm py-2.5 rounded-xl font-semibold transition-colors disabled:opacity-50"
                        >
                            Track Manual
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
