'use client';

import { useState } from 'react';
import {
    Activity,
    Brain,
    CheckCircle,
    ChevronDown,
    ChevronUp,
    Crosshair,
    Loader2,
    TrendingUp,
    XCircle,
    Zap
} from 'lucide-react';
import { ExpirationBadge } from './ExpirationBadge';

export interface TurboBounceSignal {
    id: string;
    symbol: string;
    strategy: string; // 'turbobounce'
    type: string;
    pool: string;
    direction: string;
    scanner_rank: number;
    total_score: number;
    rsi_2: number;
    iv_rank: number;
    category: string;
    rationale: string;
    target_anchor_dte: number;
    target_hedge_dte: number;
    target_delta: number;
    status: string;
    legs?: any[];
    frontExpiry?: string;
    backExpiry?: string;
    strike?: number;
    createdAt?: string;
    created_at?: string;
    receivedAt?: number;
    expiresAt?: string;
    expires_at?: string;
}

interface TurboBounceSignalCardProps {
    signal: TurboBounceSignal;
    onApprove: () => void;
    onSkip: () => void;
    isApproving: boolean;
}

export function TurboBounceSignalCard({ signal, onApprove, onSkip, isApproving }: TurboBounceSignalCardProps) {
    const [showWhyAI, setShowWhyAI] = useState(false);

    // Determine color theme based on direction
    const isBullish = signal.direction?.toLowerCase() === 'bullish';
    const themeColor = isBullish ? 'text-tm-green' : 'text-tm-red';
    const themeBg = isBullish ? 'bg-tm-green/20' : 'bg-tm-red/20';
    const themeBorder = isBullish ? 'border-tm-green/30' : 'border-tm-red/30';

    return (
        <div className={`glass-card p-5 border-l-4 ${themeBorder}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${themeBg} flex items-center justify-center`}>
                        <Zap className={`w-5 h-5 ${themeColor}`} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-lg">{signal.symbol}</h3>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${themeBg} ${themeColor} font-medium tracking-wide uppercase`}>
                                {signal.direction}
                            </span>
                        </div>
                        <p className="text-sm text-tm-muted flex items-center gap-1">
                            <Activity className="w-3 h-3" />
                            {signal.type ? signal.type.replace(/_/g, ' ') : 'Strategy Signal'}
                        </p>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <ExpirationBadge
                        receivedAt={signal.receivedAt}
                        createdAt={signal.createdAt || signal.created_at}
                    />
                    <span className="text-xs bg-tm-surface px-2 py-1 rounded-full text-tm-muted border border-white/5 font-mono">
                        Rank #{signal.scanner_rank}
                    </span>
                </div>
            </div>

            {/* AI Metrics Grid */}
            <div className="grid grid-cols-3 gap-2 mb-4 p-3 bg-tm-surface rounded-xl text-xs border border-white/5 shadow-inner">
                <div className="text-center">
                    <p className="text-tm-muted mb-1 flex items-center justify-center gap-1">
                        <Brain className="w-3 h-3" /> ML Score
                    </p>
                    <p className="font-mono font-semibold text-lg text-tm-purple">
                        {signal.total_score?.toFixed(1) || 'N/A'}
                    </p>
                </div>
                <div className="text-center">
                    <p className="text-tm-muted mb-1 flex items-center justify-center gap-1">
                        <TrendingUp className="w-3 h-3" /> RSI(2)
                    </p>
                    <p className={`font-mono font-semibold text-lg ${signal.rsi_2 < 30 ? 'text-tm-green' : signal.rsi_2 > 70 ? 'text-tm-red' : 'text-yellow-400'}`}>
                        {signal.rsi_2?.toFixed(1) || 'N/A'}
                    </p>
                </div>
                <div className="text-center">
                    <p className="text-tm-muted mb-1 flex items-center justify-center gap-1">
                        <Activity className="w-3 h-3" /> IV Rank
                    </p>
                    <p className="font-mono font-semibold text-lg text-blue-400">
                        {signal.iv_rank?.toFixed(1) || 'N/A'}%
                    </p>
                </div>
            </div>

            {/* Trade Strategy Parameters */}
            {signal.legs && signal.legs.length > 0 ? (
                <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2 px-2">
                        <Crosshair className="w-4 h-4 text-tm-muted" />
                        <span className="text-sm font-medium">Optimal Legs Found:</span>
                    </div>
                    <div className="bg-black/20 rounded-xl p-3 border border-white/5 space-y-2">
                        {signal.legs.map((leg, i) => {
                            // OCC symbol format: AAPL  240119C00150000
                            // Extract parts for UI
                            const occ = leg.symbol.trim();
                            const isCall = occ.includes('C');
                            const typeStr = isCall ? 'CALL' : 'PUT';
                            // Get expiry string from OCC (YYMMDD) - it's 6 characters before the C/P
                            const typeIdx = isCall ? occ.indexOf('C') : occ.indexOf('P');
                            const expStr = typeIdx > 6 ? occ.substring(typeIdx - 6, typeIdx) : 'N/A';
                            // Format YYMMDD to MM/DD/YY
                            const formattedExp = expStr.length === 6 ? `${expStr.substring(2, 4)}/${expStr.substring(4, 6)}/20${expStr.substring(0, 2)}` : expStr;

                            // Get strike (last 8 characters, divided by 1000)
                            const strikeStr = occ.substring(typeIdx + 1);
                            const strikeVal = parseInt(strikeStr, 10) / 1000;

                            return (
                                <div key={i} className="flex items-center justify-between text-sm p-2 bg-white/5 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${leg.action === 'BUY' ? 'bg-tm-green/20 text-tm-green' : 'bg-tm-red/20 text-tm-red'}`}>
                                            {leg.action}
                                        </span>
                                        <span className="font-mono">{formattedExp}</span>
                                    </div>
                                    <div className="font-mono font-bold">
                                        ${strikeVal} {typeStr}
                                    </div>
                                </div>
                            );
                        })}
                        <div className="flex justify-between items-center pt-2 mt-2 border-t border-white/10 px-1 text-sm">
                            <span className="text-tm-muted">Est. Trade Cost:</span>
                            <span className="font-mono font-bold">${signal.cost ? signal.cost.toFixed(2) : 'N/A'}</span>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex items-center justify-between mb-4 px-2">
                    <div className="flex items-center gap-2">
                        <Crosshair className="w-4 h-4 text-tm-muted" />
                        <span className="text-sm text-tm-muted">Engine Targets:</span>
                    </div>
                    <div className="flex gap-3 text-sm font-mono">
                        <span className="bg-white/5 px-2 py-1 rounded">Δ {signal.target_delta}</span>
                        <span className="bg-white/5 px-2 py-1 rounded">{signal.target_anchor_dte} / {signal.target_hedge_dte} DTE</span>
                    </div>
                </div>
            )}

            {/* Why AI Picked This Modal */}
            <button
                onClick={() => setShowWhyAI(!showWhyAI)}
                className="w-full flex items-center justify-between p-3 mb-4 bg-tm-surface/50 rounded-xl hover:bg-tm-surface transition-colors border border-white/5"
            >
                <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-tm-purple" />
                    <span className="text-sm font-medium">Strategy Rationale</span>
                </div>
                {showWhyAI ? (
                    <ChevronUp className="w-4 h-4 text-tm-muted" />
                ) : (
                    <ChevronDown className="w-4 h-4 text-tm-muted" />
                )}
            </button>

            {showWhyAI && (
                <div className="mb-4 p-4 bg-black/20 rounded-xl border border-tm-purple/20 text-sm">
                    <p className="text-tm-muted italic leading-relaxed">
                        &quot;{signal.rationale}&quot;
                    </p>
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
                <button
                    onClick={onSkip}
                    disabled={isApproving}
                    className="flex-1 py-3 rounded-xl border border-white/10 text-tm-muted hover:bg-white/5 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    <XCircle className="w-4 h-4" />
                    Skip
                </button>
                <button
                    onClick={onApprove}
                    disabled={isApproving}
                    className={`flex-1 py-3 rounded-xl ${isBullish ? 'bg-tm-green hover:bg-green-600' : 'bg-tm-red hover:bg-red-600'} text-black transition-colors font-bold flex items-center justify-center gap-2 disabled:opacity-50`}
                >
                    {isApproving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <CheckCircle className="w-4 h-4" />
                    )}
                    {isApproving ? 'Evaluating...' : 'Approve Auto-Trade'}
                </button>
            </div>
        </div>
    );
}

// Type guard
export function isTurboBounceSignal(signal: { strategy?: string, pool?: string }): boolean {
    return signal.strategy?.toLowerCase() === 'turbobounce' || signal.pool === 'MULTI_TICKER';
}
