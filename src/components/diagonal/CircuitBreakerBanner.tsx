"use client";

import { useEffect, useState, useCallback } from "react";
import { AlertTriangle, CheckCircle, XCircle, Activity, TrendingUp, TrendingDown } from "lucide-react";

interface CircuitBreakerStatus {
    regime: string;
    can_trade: boolean;
    vix: number;
    vxv: number;
    diff: number;
    ratio: number;
    early_warning: boolean;
    position_multiplier: number;
    message: string;
    timestamp: string | null;
}

interface CircuitBreakerBannerProps {
    apiEndpoint?: string;
    refreshInterval?: number; // in seconds
    compact?: boolean;
}

export function CircuitBreakerBanner({
    apiEndpoint = `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://34.235.119.67:8002'}/diagonal/status`,
    refreshInterval = 60,
    compact = false
}: CircuitBreakerBannerProps) {
    const [status, setStatus] = useState<CircuitBreakerStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchStatus = useCallback(async () => {
        try {
            const response = await fetch(apiEndpoint);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const data = await response.json();
            setStatus(data);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to fetch");
            // Keep previous status on error
        } finally {
            setLoading(false);
        }
    }, [apiEndpoint]);

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, refreshInterval * 1000);
        return () => clearInterval(interval);
    }, [fetchStatus, refreshInterval]);

    if (loading && !status) {
        return (
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 animate-pulse">
                <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-gray-500 animate-spin" />
                    <span className="text-gray-400 text-sm">Loading market status...</span>
                </div>
            </div>
        );
    }

    if (error && !status) {
        return (
            <div className="bg-red-900/20 border border-red-800 rounded-lg p-3">
                <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-400" />
                    <span className="text-red-400 text-sm">Circuit breaker offline: {error}</span>
                </div>
            </div>
        );
    }

    if (!status) return null;

    // Determine color and status
    const getStatusColor = () => {
        if (!status.can_trade) return "red";
        if (status.early_warning) return "yellow";
        return "green";
    };

    const color = getStatusColor();

    const colorClasses = {
        green: {
            bg: "bg-emerald-900/20",
            border: "border-emerald-700",
            text: "text-emerald-400",
            icon: "text-emerald-400",
            badge: "bg-emerald-600"
        },
        yellow: {
            bg: "bg-amber-900/20",
            border: "border-amber-700",
            text: "text-amber-400",
            icon: "text-amber-400",
            badge: "bg-amber-600"
        },
        red: {
            bg: "bg-red-900/20",
            border: "border-red-700",
            text: "text-red-400",
            icon: "text-red-400",
            badge: "bg-red-600"
        }
    };

    const colors = colorClasses[color];

    const StatusIcon = color === "green" ? CheckCircle : color === "yellow" ? AlertTriangle : XCircle;
    const TrendIcon = status.diff < 0 ? TrendingDown : TrendingUp;

    if (compact) {
        return (
            <div className={`${colors.bg} ${colors.border} border rounded-lg px-3 py-2 inline-flex items-center gap-3`}>
                <StatusIcon className={`w-4 h-4 ${colors.icon}`} />
                <span className={`${colors.text} text-sm font-medium uppercase`}>
                    {status.regime}
                </span>
                <span className="text-gray-400 text-xs">
                    VIX {status.vix}
                </span>
            </div>
        );
    }

    return (
        <div className={`${colors.bg} ${colors.border} border rounded-lg p-4`}>
            <div className="flex items-center justify-between flex-wrap gap-4">
                {/* Status Badge */}
                <div className="flex items-center gap-3">
                    <div className={`${colors.badge} rounded-full p-2`}>
                        <StatusIcon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className={`${colors.text} font-bold uppercase text-lg`}>
                                {status.regime}
                            </span>
                            {status.can_trade ? (
                                <span className="text-xs bg-emerald-600/30 text-emerald-400 px-2 py-0.5 rounded">
                                    TRADING ACTIVE
                                </span>
                            ) : (
                                <span className="text-xs bg-red-600/30 text-red-400 px-2 py-0.5 rounded">
                                    TRADING HALTED
                                </span>
                            )}
                        </div>
                        <p className={`text-sm ${colors.text} opacity-80`}>
                            {status.message}
                        </p>
                    </div>
                </div>

                {/* Metrics */}
                <div className="flex items-center gap-6">
                    {/* VIX */}
                    <div className="text-center">
                        <div className="text-gray-400 text-xs uppercase tracking-wide">VIX</div>
                        <div className="text-white font-bold text-xl">{status.vix}</div>
                    </div>

                    {/* VXV */}
                    <div className="text-center">
                        <div className="text-gray-400 text-xs uppercase tracking-wide">VXV</div>
                        <div className="text-white font-bold text-xl">{status.vxv}</div>
                    </div>

                    {/* Ratio */}
                    <div className="text-center">
                        <div className="text-gray-400 text-xs uppercase tracking-wide">Ratio</div>
                        <div className={`font-bold text-xl flex items-center gap-1 ${colors.text}`}>
                            <TrendIcon className="w-4 h-4" />
                            {status.ratio.toFixed(3)}
                        </div>
                    </div>

                    {/* Position Size */}
                    <div className="text-center">
                        <div className="text-gray-400 text-xs uppercase tracking-wide">Size</div>
                        <div className="text-white font-bold text-xl">
                            {Math.round(status.position_multiplier * 100)}%
                        </div>
                    </div>
                </div>
            </div>

            {/* Early Warning Banner */}
            {status.early_warning && status.can_trade && (
                <div className="mt-3 pt-3 border-t border-amber-700/50">
                    <div className="flex items-center gap-2 text-amber-400 text-sm">
                        <AlertTriangle className="w-4 h-4" />
                        <span>
                            <strong>Early Warning:</strong> VIX/VXV ratio approaching 1.0 — monitor closely for regime shift
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
