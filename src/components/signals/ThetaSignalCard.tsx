'use client';

import { useState } from 'react';
import {
    TrendingDown,
    Calendar,
    Target,
    Clock,
    Percent,
    CheckCircle,
    XCircle,
    Loader2,
    Activity,
    Shield
} from 'lucide-react';
import { ExpirationBadge } from './ExpirationBadge';

interface ThetaSignal {
    id: string;
    symbol: string;
    strategy: string;
    strike: number;
    expiration: string;
    dte: number;

    // Pricing
    entry_price: number;
    ask?: number;
    mid?: number;

    // Greeks
    delta: number;
    theta: number;
    vega?: number;
    iv: number;

    // Risk metrics
    confidence: number;
    probability_otm: number;
    capital_required?: number;

    // Position sizing
    contracts: number;
    total_premium?: number;

    // UI
    status: string;
    risk_level?: string;
    createdAt?: string;
    receivedAt?: number;
}

interface ThetaSignalCardProps {
    signal: ThetaSignal;
    onApprove: () => void;
    onSkip: () => void;
    isApproving: boolean;
}

export function ThetaSignalCard({ signal, onApprove, onSkip, isApproving }: ThetaSignalCardProps) {
    const riskColors: { [key: string]: string } = {
        low: 'text-tm-green bg-tm-green/20',
        Low: 'text-tm-green bg-tm-green/20',
        medium: 'text-yellow-400 bg-yellow-400/20',
        Medium: 'text-yellow-400 bg-yellow-400/20',
        high: 'text-tm-red bg-tm-red/20',
        High: 'text-tm-red bg-tm-red/20',
    };

    // Calculate total premium if not provided
    const totalPremium = signal.total_premium || (signal.entry_price * signal.contracts * 100);

    // Calculate capital required (strike * contracts * 100)
    const capitalRequired = signal.capital_required || (signal.strike * signal.contracts * 100);

    return (
        <div className="glass-card p-5">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-tm-purple/20 flex items-center justify-center">
                        <TrendingDown className="w-5 h-5 text-tm-purple" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg">{signal.symbol}</h3>
                        <p className="text-sm text-tm-muted">Cash-Secured Put</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <ExpirationBadge
                        receivedAt={signal.receivedAt}
                        createdAt={signal.createdAt}
                        onExpired={onSkip}
                    />
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${riskColors[signal.risk_level || 'medium']}`}>
                        {signal.risk_level || 'Medium'}
                    </span>
                </div>
            </div>

            {/* Option Details */}
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
                        <Calendar className="w-3 h-3" />
                        Expiry
                    </p>
                    <p className="font-semibold">{signal.expiration}</p>
                </div>
                <div>
                    <p className="text-tm-muted flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        DTE
                    </p>
                    <p className="font-semibold">{signal.dte} days</p>
                </div>
            </div>

            {/* Greeks & Metrics */}
            <div className="grid grid-cols-4 gap-2 mb-4 p-3 bg-tm-surface rounded-xl text-xs">
                <div className="text-center">
                    <p className="text-tm-muted mb-1">Delta</p>
                    <p className="font-mono font-semibold text-yellow-400">
                        {(signal.delta * 100).toFixed(0)}%
                    </p>
                </div>
                <div className="text-center">
                    <p className="text-tm-muted mb-1">Theta</p>
                    <p className="font-mono font-semibold text-tm-green">
                        +${signal.theta?.toFixed(2) || '0.00'}
                    </p>
                </div>
                <div className="text-center">
                    <p className="text-tm-muted mb-1">IV</p>
                    <p className="font-mono font-semibold">
                        {(signal.iv * 100).toFixed(0)}%
                    </p>
                </div>
                <div className="text-center">
                    <p className="text-tm-muted mb-1">P(OTM)</p>
                    <p className="font-mono font-semibold text-tm-green">
                        {(signal.probability_otm * 100).toFixed(0)}%
                    </p>
                </div>
            </div>

            {/* Pricing & Position */}
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <p className="text-sm text-tm-muted">Premium (per contract)</p>
                    <p className="font-mono font-bold text-xl text-tm-green">
                        ${signal.entry_price?.toFixed(2)}
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-sm text-tm-muted">Contracts</p>
                    <p className="font-mono font-bold text-xl">
                        {signal.contracts}
                    </p>
                </div>
            </div>

            {/* Total Premium & Capital */}
            <div className="grid grid-cols-2 gap-4 mb-5 p-3 bg-tm-surface rounded-xl">
                <div>
                    <p className="text-xs text-tm-muted">Total Premium</p>
                    <p className="font-mono font-semibold text-tm-green">
                        ${totalPremium.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-xs text-tm-muted">Cash Required</p>
                    <p className="font-mono font-semibold">
                        ${capitalRequired.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                    </p>
                </div>
            </div>

            {/* Confidence & Probability Ring */}
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
                                strokeDasharray={`${(signal.probability_otm * 100) * 1.26} 126`}
                                strokeLinecap="round"
                                stroke="currentColor"
                                fill="transparent"
                                r="20"
                                cx="24"
                                cy="24"
                            />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
                            {(signal.probability_otm * 100).toFixed(0)}%
                        </span>
                    </div>
                    <div>
                        <p className="text-sm text-tm-muted">Prob. OTM</p>
                        <p className="font-semibold">Win Rate</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                    <Shield className="w-4 h-4 text-tm-purple" />
                    <span className="text-tm-muted">Confidence:</span>
                    <span className="font-semibold">{signal.confidence?.toFixed(0) || 'N/A'}%</span>
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

// Type guard to identify theta signals
export function isThetaSignal(signal: { strategy?: string; signal_type?: string }): boolean {
    return signal.strategy === 'theta' ||
        signal.signal_type === 'entry' ||
        signal.signal_type === 'exit';
}
