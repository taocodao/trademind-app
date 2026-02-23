'use client';

import { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Activity, TrendingUp, TrendingDown } from 'lucide-react';

interface TQQQStatus {
    regime: string;
    can_trade: boolean;
    vix: number;
    vix_direction: string;   // 'RISING' | 'FALLING' | 'STABLE'
    tqqq_price: number;
    position_multiplier: number;
    early_warning: boolean;
    message: string;
    timestamp: string | null;
}

interface TQQQCircuitBreakerBannerProps {
    apiEndpoint?: string;
    refreshInterval?: number;
}

export function TQQQStatusBanner({
    apiEndpoint = '/api/tqqq/status',
    refreshInterval = 60,
}: TQQQCircuitBreakerBannerProps) {
    const [status, setStatus] = useState<TQQQStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchStatus = useCallback(async () => {
        try {
            const res = await fetch(apiEndpoint);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setStatus(data);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch');
        } finally {
            setLoading(false);
        }
    }, [apiEndpoint]);

    useEffect(() => {
        fetchStatus();
        const id = setInterval(fetchStatus, refreshInterval * 1000);
        return () => clearInterval(id);
    }, [fetchStatus, refreshInterval]);

    // --- loading skeleton ---
    if (loading && !status) {
        return (
            <div className="glass-card px-4 py-3 flex items-center gap-3 animate-pulse">
                <Activity className="w-4 h-4 text-tm-muted animate-spin" />
                <span className="text-tm-muted text-sm">Loading TQQQ status…</span>
            </div>
        );
    }

    // --- error (no prior status) ---
    if (error && !status) {
        return (
            <div className="glass-card px-4 py-3 flex items-center gap-2 border border-tm-red/30">
                <XCircle className="w-4 h-4 text-tm-red" />
                <span className="text-tm-red text-sm">TQQQ status offline</span>
            </div>
        );
    }

    // --- placeholder while not connected ---
    if (!status) return null;

    const canTrade = status.can_trade;
    const earlyWarn = status.early_warning;

    const colorKey = !canTrade ? 'red' : earlyWarn ? 'yellow' : 'green';

    const colors = {
        green: { bg: 'bg-emerald-900/20', border: 'border-emerald-700/60', text: 'text-emerald-400', badge: 'bg-emerald-600' },
        yellow: { bg: 'bg-amber-900/20', border: 'border-amber-700/60', text: 'text-amber-400', badge: 'bg-amber-600' },
        red: { bg: 'bg-red-900/20', border: 'border-red-700/60', text: 'text-red-400', badge: 'bg-red-600' },
    }[colorKey];

    const StatusIcon = canTrade ? (earlyWarn ? AlertTriangle : CheckCircle) : XCircle;
    const VixIcon = status.vix_direction === 'FALLING' ? TrendingDown : TrendingUp;
    const vixColor = status.vix_direction === 'FALLING' ? 'text-tm-green' : 'text-tm-red';

    return (
        <div className={`${colors.bg} ${colors.border} border rounded-2xl px-4 py-3`}>
            <div className="flex items-center justify-between gap-3">
                {/* Left — strategy + status */}
                <div className="flex items-center gap-3 min-w-0">
                    <div className={`${colors.badge} rounded-full p-1.5 flex-shrink-0`}>
                        <StatusIcon className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className={`${colors.text} font-bold text-sm uppercase tracking-wide`}>
                                TQQQ Dual-Sided
                            </span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${canTrade
                                ? 'bg-emerald-600/30 text-emerald-400'
                                : 'bg-red-600/30 text-red-400'
                                }`}>
                                {canTrade ? 'TRADING ACTIVE' : 'HALTED'}
                            </span>
                        </div>
                        <p className={`text-xs ${colors.text} opacity-70 truncate`}>{status.message}</p>
                    </div>
                </div>

                {/* Right — compact metrics */}
                <div className="flex items-center gap-4 flex-shrink-0 text-center">
                    <div>
                        <p className="text-[10px] text-tm-muted uppercase tracking-wide">VIX</p>
                        <p className={`text-sm font-bold font-mono flex items-center gap-0.5 ${vixColor}`}>
                            <VixIcon className="w-3 h-3" />
                            {status.vix.toFixed(1)}
                        </p>
                    </div>
                    <div>
                        <p className="text-[10px] text-tm-muted uppercase tracking-wide">Regime</p>
                        <p className="text-sm font-bold text-tm-text">{status.regime}</p>
                    </div>
                    {status.tqqq_price > 0 && (
                        <div>
                            <p className="text-[10px] text-tm-muted uppercase tracking-wide">TQQQ</p>
                            <p className="text-sm font-bold font-mono text-tm-text">
                                ${status.tqqq_price.toFixed(2)}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Early warning footer */}
            {earlyWarn && canTrade && (
                <div className="mt-2 pt-2 border-t border-amber-700/30 flex items-center gap-2 text-amber-400 text-xs">
                    <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                    <span>VIX/VXV approaching 1.0 — monitor for regime shift</span>
                </div>
            )}
        </div>
    );
}
