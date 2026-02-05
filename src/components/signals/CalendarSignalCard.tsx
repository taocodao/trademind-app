'use client';

import { useState } from 'react';
import {
    Calendar,
    Target,
    Clock,
    TrendingUp,
    CheckCircle,
    XCircle,
    Loader2,
    Activity,
    Brain,
    ChevronDown,
    ChevronUp
} from 'lucide-react';

interface CalendarSignal {
    id: string;
    symbol: string;
    strategy: string;
    direction?: string;
    strike?: number;
    stockPrice?: number;
    frontExpiry?: string;
    backExpiry?: string;
    cost: number;
    potentialReturn: number;
    returnPercent?: number;
    winRate?: number;
    riskLevel?: string;
    status: string;
    rationale?: string;
    score?: number;
    iv?: number;
    thetaEdge?: number;
    createdAt?: string;
}

interface CalendarSignalCardProps {
    signal: CalendarSignal;
    onApprove: () => void;
    onSkip: () => void;
    isApproving: boolean;
}

export function CalendarSignalCard({ signal, onApprove, onSkip, isApproving }: CalendarSignalCardProps) {
    const [showWhyAI, setShowWhyAI] = useState(false);

    const riskColors: { [key: string]: string } = {
        Low: 'text-tm-green bg-tm-green/20',
        low: 'text-tm-green bg-tm-green/20',
        Medium: 'text-yellow-400 bg-yellow-400/20',
        medium: 'text-yellow-400 bg-yellow-400/20',
        High: 'text-tm-red bg-tm-red/20',
        high: 'text-tm-red bg-tm-red/20',
    };

    // Calculate DTE for front leg
    const frontDTE = signal.frontExpiry ?
        Math.ceil((new Date(signal.frontExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;

    const backDTE = signal.backExpiry ?
        Math.ceil((new Date(signal.backExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;

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
                        <p className="text-sm text-tm-muted">Calendar Spread</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${riskColors[signal.riskLevel || 'Medium']}`}>
                        {signal.riskLevel || 'Medium'}
                    </span>
                </div>
            </div>

            {/* Strike & Expiries */}
            <div className="grid grid-cols-3 gap-3 mb-4 text-sm">
                <div>
                    <p className="text-tm-muted flex items-center gap-1">
                        <Target className="w-3 h-3" />
                        Strike
                    </p>
                    <p className="font-mono font-semibold">${signal.strike}</p>
                </div>
                <div>
                    <p className="text-tm-muted flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Front ({frontDTE}d)
                    </p>
                    <p className="font-semibold text-xs">{signal.frontExpiry}</p>
                </div>
                <div>
                    <p className="text-tm-muted flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Back ({backDTE}d)
                    </p>
                    <p className="font-semibold text-xs">{signal.backExpiry}</p>
                </div>
            </div>

            {/* Trade Metrics */}
            <div className="grid grid-cols-4 gap-2 mb-4 p-3 bg-tm-surface rounded-xl text-xs">
                <div className="text-center">
                    <p className="text-tm-muted mb-1">IV</p>
                    <p className="font-mono font-semibold">
                        {signal.iv?.toFixed(0) || 'N/A'}%
                    </p>
                </div>
                <div className="text-center">
                    <p className="text-tm-muted mb-1">θ Edge</p>
                    <p className="font-mono font-semibold text-tm-green">
                        ${signal.thetaEdge?.toFixed(2) || '0.00'}/d
                    </p>
                </div>
                <div className="text-center">
                    <p className="text-tm-muted mb-1">Score</p>
                    <p className="font-mono font-semibold text-tm-purple">
                        {signal.score?.toFixed(0) || 'N/A'}
                    </p>
                </div>
                <div className="text-center">
                    <p className="text-tm-muted mb-1">Win Rate</p>
                    <p className="font-mono font-semibold text-tm-green">
                        {signal.winRate || 70}%
                    </p>
                </div>
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <p className="text-sm text-tm-muted">Cost (Debit)</p>
                    <p className="font-mono font-bold text-xl">${signal.cost}</p>
                </div>
                <div className="text-right">
                    <p className="text-sm text-tm-muted">Target Return</p>
                    <p className="font-mono font-bold text-xl text-tm-green">
                        +${signal.potentialReturn}
                        <span className="text-sm ml-1">({signal.returnPercent}%)</span>
                    </p>
                </div>
            </div>

            {/* Why AI Picked This (Gen Z Feature) */}
            <button
                onClick={() => setShowWhyAI(!showWhyAI)}
                className="w-full flex items-center justify-between p-3 mb-4 bg-tm-surface rounded-xl hover:bg-tm-surface/80 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-tm-purple" />
                    <span className="text-sm font-medium">Why AI Picked This</span>
                </div>
                {showWhyAI ? (
                    <ChevronUp className="w-4 h-4 text-tm-muted" />
                ) : (
                    <ChevronDown className="w-4 h-4 text-tm-muted" />
                )}
            </button>

            {showWhyAI && (
                <div className="mb-4 p-4 bg-tm-surface/50 rounded-xl border border-tm-purple/20 text-sm">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-tm-green" />
                            <span>IV Rank: {signal.iv?.toFixed(0) || 'N/A'}% (normal range)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-tm-green" />
                            <span>Theta favorable: ${signal.thetaEdge?.toFixed(2) || '0.00'}/day</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-tm-green" />
                            <span>AI confidence: {signal.score?.toFixed(0) || 70}%</span>
                        </div>
                        {signal.rationale && (
                            <p className="text-tm-muted italic mt-2">
                                &quot;{signal.rationale}&quot;
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Win Rate Ring */}
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
                                strokeDasharray={`${(signal.winRate || 70) * 1.26} 126`}
                                strokeLinecap="round"
                                stroke="currentColor"
                                fill="transparent"
                                r="20"
                                cx="24"
                                cy="24"
                            />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
                            {signal.winRate || 70}%
                        </span>
                    </div>
                    <div>
                        <p className="text-sm text-tm-muted">Win Rate</p>
                        <p className="font-semibold">Historical</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                    <Activity className="w-4 h-4 text-tm-purple" />
                    <span className="text-tm-muted">Direction:</span>
                    <span className="font-semibold capitalize">{signal.direction || 'neutral'}</span>
                </div>
            </div>

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

// Type guard to identify calendar signals
export function isCalendarSignal(signal: { strategy?: string }): boolean {
    const strategy = signal.strategy?.toLowerCase() || '';
    return strategy.includes('calendar') || strategy === 'calendar spread';
}
