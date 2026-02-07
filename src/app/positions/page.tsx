"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import {
    ArrowLeft,
    Clock,
    AlertTriangle,
    TrendingUp,
    XCircle,
    RefreshCw,
    Settings,
    Wallet
} from "lucide-react";
import Link from "next/link";
import { ShareButton } from "@/components/share/ShareButton";
import { CapitalOptimizer } from "@/components/positions/CapitalOptimizer";
import { TrailingStopConfig } from "@/components/positions/TrailingStopConfig";

interface Position {
    id: string;
    symbol: string;
    strategy: string;
    strike: number;
    front_expiry: string;
    back_expiry?: string;
    quantity: number;
    entry_debit: number;
    current_value?: number;
    unrealized_pnl?: number;
    direction?: string;
    status: string;
    created_at: string;
}

interface AccountBalance {
    cashAvailable: number;
    buyingPower: number;
    netLiquidation: number;
}

// Helper to format strategy name for display
function formatStrategy(strategy: string): string {
    const lower = strategy?.toLowerCase() || '';
    if (lower.includes('theta') || lower === 'cash-secured put') {
        return 'Theta Sprint';
    }
    if (lower.includes('calendar')) {
        return 'Calendar Spread';
    }
    return strategy || 'Unknown';
}

// Helper to calculate expiry time remaining
function getExpiryTime(expiryDate: string): string {
    const expiry = new Date(expiryDate);
    const now = new Date();
    const diffMs = expiry.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (diffDays < 0) return 'Expired';
    if (diffDays === 0) return `${diffHours}h`;
    return `${diffDays}d ${diffHours}h`;
}

export default function PositionsPage() {
    const { ready, authenticated } = usePrivy();
    const router = useRouter();
    const [positions, setPositions] = useState<Position[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [balance, setBalance] = useState<AccountBalance | null>(null);

    // Fetch account balance from Tastytrade
    const fetchBalance = useCallback(async () => {
        try {
            const response = await fetch('/api/tastytrade/account');
            if (response.ok) {
                const data = await response.json();
                const account = data.data?.items?.[0];
                if (account) {
                    setBalance({
                        cashAvailable: parseFloat(account['cash-available'] || '0'),
                        buyingPower: parseFloat(account['buying-power'] || '0'),
                        netLiquidation: parseFloat(account['net-liquidating-value'] || '0')
                    });
                }
            }
        } catch (err) {
            console.error('Error fetching balance:', err);
        }
    }, []);

    const fetchPositions = useCallback(async () => {
        try {
            const response = await fetch('/api/positions?status=open');
            if (!response.ok) {
                throw new Error('Failed to fetch positions');
            }
            const data = await response.json();
            setPositions(data.positions || []);
            setError(null);
        } catch (err) {
            console.error('Error fetching positions:', err);
            setError(err instanceof Error ? err.message : 'Failed to load positions');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (ready && !authenticated) {
            router.push("/");
        }
    }, [ready, authenticated, router]);

    // Fetch positions on mount and refresh every 5 seconds
    useEffect(() => {
        if (ready && authenticated) {
            fetchPositions();
            fetchBalance();
            const interval = setInterval(fetchPositions, 5000);
            const balanceInterval = setInterval(fetchBalance, 30000); // Balance every 30s
            return () => {
                clearInterval(interval);
                clearInterval(balanceInterval);
            };
        }
    }, [ready, authenticated, fetchPositions, fetchBalance]);

    const handleClose = async (id: string) => {
        // TODO: Call API to close position
        setPositions(positions.filter(p => p.id !== id));
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

    const totalPnL = positions.reduce((sum, p) => sum + (p.unrealized_pnl || 0), 0);

    return (
        <main className="min-h-screen pb-6">
            {/* Header */}
            <header className="px-6 pt-12 pb-6 flex items-center gap-4">
                <Link href="/dashboard" className="w-10 h-10 rounded-full bg-tm-surface flex items-center justify-center">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div className="flex-1">
                    <h1 className="text-xl font-bold">Active Positions</h1>
                    <p className="text-sm text-tm-muted">{positions.length} open</p>
                </div>
                <div className="text-right">
                    <p className="text-sm text-tm-muted">Total P&L</p>
                    <p className={`font-mono font-bold ${totalPnL >= 0 ? 'profit-glow' : 'loss-glow'}`}>
                        {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
                    </p>
                </div>
            </header>

            {/* Live Indicator */}
            <div className="px-6 mb-4">
                <div className="flex items-center gap-2 text-sm text-tm-muted">
                    <span className="w-2 h-2 rounded-full bg-tm-green animate-pulse" />
                    Live - Updates every 5s
                </div>
            </div>

            {/* Account Balance Header */}
            {balance && (
                <div className="px-6 mb-6">
                    <div className="glass-card p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <Wallet className="w-5 h-5 text-tm-purple" />
                            <h3 className="font-bold">Account Overview</h3>
                            <Link
                                href="/settings"
                                className="ml-auto p-2 rounded-full hover:bg-tm-surface/50 transition-colors"
                            >
                                <Settings className="w-4 h-4 text-tm-muted" />
                            </Link>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                                <p className="text-xs text-tm-muted">Cash Available</p>
                                <p className="text-lg font-bold font-mono">
                                    ${balance.cashAvailable.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-tm-muted">Buying Power</p>
                                <p className="text-lg font-bold font-mono text-tm-purple">
                                    ${balance.buyingPower.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-tm-muted">Net Liquidation</p>
                                <p className="text-lg font-bold font-mono text-tm-green">
                                    ${balance.netLiquidation.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Capital Optimizer */}
            <div className="px-6">
                <CapitalOptimizer balance={balance} positions={positions} />
            </div>

            {/* Positions List */}
            <div className="px-6 space-y-4">
                {positions.map((position) => (
                    <PositionCard
                        key={position.id}
                        position={position}
                        onClose={() => handleClose(position.id)}
                    />
                ))}

                {positions.length === 0 && (
                    <div className="glass-card p-8 text-center">
                        <TrendingUp className="w-12 h-12 text-tm-purple mx-auto mb-4" />
                        <h3 className="font-semibold mb-2">No open positions</h3>
                        <p className="text-sm text-tm-muted mb-4">Check signals for new opportunities</p>
                        <Link href="/signals" className="btn-primary inline-block">
                            View Signals
                        </Link>
                    </div>
                )}
            </div>
        </main>
    );
}

function PositionCard({
    position,
    onClose,
}: {
    position: Position;
    onClose: () => void;
}) {
    const pnl = position.unrealized_pnl || 0;
    const isProfit = pnl >= 0;
    const [showConfirm, setShowConfirm] = useState(false);

    // Calculate entry price (entry_debit is negative for puts = credit received)
    const entryPrice = Math.abs(position.entry_debit || 0);
    const currentPrice = position.current_value || entryPrice;
    const pnlPercent = entryPrice > 0 ? ((pnl / (entryPrice * 100 * position.quantity)) * 100) : 0;

    return (
        <div className="glass-card p-5">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isProfit ? "bg-tm-green/20" : "bg-tm-red/20"
                        }`}>
                        <span className="font-bold text-lg">{position.symbol.slice(0, 2)}</span>
                    </div>
                    <div>
                        <h3 className="font-bold text-lg">{position.symbol}</h3>
                        <p className="text-sm text-tm-muted">{formatStrategy(position.strategy)}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* Share button for profitable positions */}
                    {isProfit && (
                        <ShareButton
                            data={{
                                type: 'trade',
                                title: `${position.symbol} Win`,
                                amount: pnl,
                                symbol: position.symbol,
                                returnPercent: pnlPercent
                            }}
                            size="sm"
                        />
                    )}
                    <div className="flex items-center gap-2 bg-tm-surface px-3 py-1.5 rounded-full">
                        <span className="w-2 h-2 rounded-full bg-tm-green animate-pulse" />
                        <span className="text-xs font-medium">LIVE</span>
                    </div>
                </div>
            </div>

            {/* Large P&L Display */}
            <div className="text-center py-4 mb-4">
                <p className="text-sm text-tm-muted mb-1">Unrealized P&L</p>
                <p className={`text-4xl font-mono font-bold ${isProfit ? 'profit-glow' : 'loss-glow'}`}>
                    {isProfit ? '+' : ''}${pnl.toFixed(2)}
                </p>
                <p className={`text-lg ${isProfit ? 'text-tm-green' : 'text-tm-red'}`}>
                    {isProfit ? '+' : ''}{pnlPercent.toFixed(1)}%
                </p>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-4 mb-4 pb-4 border-b border-white/10">
                <div>
                    <p className="text-xs text-tm-muted">Entry</p>
                    <p className="font-mono font-semibold">${entryPrice.toFixed(2)}</p>
                </div>
                <div className="text-center">
                    <p className="text-xs text-tm-muted">Current</p>
                    <p className={`font-mono font-semibold ${isProfit ? 'text-tm-green' : 'text-tm-red'}`}>
                        ${currentPrice.toFixed(2)}
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-xs text-tm-muted">Expiry</p>
                    <p className="font-semibold flex items-center justify-end gap-1">
                        <Clock className="w-3 h-3" />
                        {getExpiryTime(position.front_expiry)}
                    </p>
                </div>
            </div>

            {/* Strike and Quantity Info */}
            <div className="flex items-center justify-between mb-4 text-sm">
                <span className="text-tm-muted">
                    Strike: <span className="text-white font-mono">${position.strike}</span>
                </span>
                <span className="text-tm-muted">
                    Qty: <span className="text-white font-mono">{position.quantity}</span>
                </span>
            </div>

            {/* Close Button */}
            {!showConfirm ? (
                <button
                    onClick={() => setShowConfirm(true)}
                    className="w-full py-3 rounded-xl border border-tm-red/50 text-tm-red hover:bg-tm-red/10 transition-colors font-semibold flex items-center justify-center gap-2"
                >
                    <XCircle className="w-4 h-4" />
                    Close Position
                </button>
            ) : (
                <div className="flex gap-3">
                    <button
                        onClick={() => setShowConfirm(false)}
                        className="flex-1 py-3 rounded-xl border border-white/20 text-tm-muted"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 rounded-xl bg-tm-red hover:bg-red-700 transition-colors font-semibold"
                    >
                        Confirm Close
                    </button>
                </div>
            )}
        </div>
    );
}
