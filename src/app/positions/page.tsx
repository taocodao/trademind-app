"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import {
    ArrowLeft,
    TrendingUp,
    RefreshCw,
    Wallet,
    BarChart3
} from "lucide-react";
import Link from "next/link";
import { useStrategyContext } from "@/components/providers/StrategyContext";
import { StrategyTabs } from "@/components/ui/StrategyTabs";
import { getStrategy } from "@/lib/strategies";

interface EquityPosition {
    symbol: string;
    quantity: number;
    averageOpenPrice: number;
    currentPrice: number;
    marketValue: number;
    unrealizedPnl: number;
    unrealizedPnlPct: number;
    instrumentType: string;
}

interface AccountBalance {
    cashAvailable: number;
    buyingPower: number;
    netLiquidation: number;
}



export default function PositionsPage() {
    const { ready, authenticated } = usePrivy();
    const router = useRouter();
    const { activeStrategy, setActiveStrategy, enabledStrategies } = useStrategyContext();
    const [positions, setPositions] = useState<EquityPosition[]>([]);
    const [loading, setLoading] = useState(true);
    const [accountNum, setAccountNum] = useState<string | null>(null);
    const [balance, setBalance] = useState<AccountBalance | null>(null);

    const fetchAccountAndPositions = useCallback(async () => {
        try {
            // 1. Get account number
            const acctRes = await fetch('/api/tastytrade/account');
            if (!acctRes.ok) { setLoading(false); return; }
            const acctData = await acctRes.json();
            const acct = acctData.data?.items?.[0]?.account?.['account-number'];
            if (!acct) { setLoading(false); return; }
            setAccountNum(acct);

            // 2. Fetch balance
            const balRes = await fetch(`/api/tastytrade/balance?accountNumber=${acct}`);
            if (balRes.ok) {
                const bal = await balRes.json();
                setBalance({
                    cashAvailable: bal.cashAvailable ?? 0,
                    buyingPower: bal.buyingPower ?? 0,
                    netLiquidation: bal.netLiquidatingValue ?? 0,
                });
            }

            // 3. Fetch positions from Tastytrade
            const posRes = await fetch(`/api/tastytrade/positions?accountNumber=${acct}`);
            if (posRes.ok) {
                const posData = await posRes.json();
                const items = posData?.data?.items || [];

                // Not filtering by symbol here anymore so we can cache all positions
                const equityPositions: EquityPosition[] = items
                    .filter((p: any) => p['instrument-type'] === 'Equity')
                    .map((p: any) => {
                        const qty = Number(p.quantity) || 0;
                        const avgPrice = Number(p['average-open-price']) || 0;
                        const closePrice = Number(p['close-price']) || avgPrice;
                        const marketVal = qty * closePrice;
                        const costBasis = qty * avgPrice;
                        const pnl = marketVal - costBasis;
                        const pnlPct = costBasis > 0 ? (pnl / costBasis) * 100 : 0;

                        return {
                            symbol: p.symbol,
                            quantity: qty,
                            averageOpenPrice: avgPrice,
                            currentPrice: closePrice,
                            marketValue: marketVal,
                            unrealizedPnl: pnl,
                            unrealizedPnlPct: pnlPct,
                            instrumentType: p['instrument-type'],
                        };
                    });

                setPositions(equityPositions);
            }
        } catch (err) {
            console.error('Error fetching positions:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (ready && !authenticated) {
            router.push("/");
        }
    }, [ready, authenticated, router]);

    useEffect(() => {
        if (ready && authenticated) {
            fetchAccountAndPositions();
            const interval = setInterval(fetchAccountAndPositions, 15000);
            return () => clearInterval(interval);
        }
    }, [ready, authenticated, fetchAccountAndPositions]);

    if (!ready || !authenticated) {
        return (
            <main className="min-h-screen flex items-center justify-center">
                <div className="animate-pulse">
                    <div className="w-12 h-12 rounded-full bg-tm-purple/30" />
                </div>
            </main>
        );
    }

    const activeStrategyConfig = getStrategy(activeStrategy);
    const managedSymbols = activeStrategy === 'ALL'
        ? Object.keys(positions.reduce((acc, p) => ({ ...acc, [p.symbol]: 1 }), {})) // All keys
        : (activeStrategyConfig?.managedSymbols || []);

    const filteredPositions = positions.filter(p => activeStrategy === 'ALL' || managedSymbols.includes(p.symbol));

    const totalValue = filteredPositions.reduce((s, p) => s + p.marketValue, 0);
    const totalPnl = filteredPositions.reduce((s, p) => s + p.unrealizedPnl, 0);
    const totalCostBasis = filteredPositions.reduce((s, p) => s + p.quantity * p.averageOpenPrice, 0);
    const totalPnlPct = totalCostBasis > 0 ? (totalPnl / totalCostBasis) * 100 : 0;

    return (
        <main className="min-h-screen pb-24 max-w-lg mx-auto w-full border-x border-white/5 bg-tm-bg shadow-2xl relative">
            {/* Header */}
            <header className="px-6 pt-12 pb-2 flex items-center gap-4">
                <Link href="/dashboard" className="w-10 h-10 rounded-full bg-tm-surface flex items-center justify-center">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div className="flex-1">
                    <h1 className="text-xl font-bold">Positions</h1>
                    <p className="text-sm text-tm-muted">{filteredPositions.length} equity position{filteredPositions.length !== 1 ? 's' : ''}</p>
                </div>
                <button onClick={fetchAccountAndPositions} className="w-10 h-10 rounded-full bg-tm-surface flex items-center justify-center text-tm-muted hover:text-white transition">
                    <RefreshCw className="w-4 h-4" />
                </button>
            </header>

            <div className="px-6 mb-6">
                <StrategyTabs
                    strategies={enabledStrategies}
                    activeKey={activeStrategy}
                    onChange={setActiveStrategy}
                    showAll={true}
                />
            </div>

            {/* Account Summary */}
            {balance && (
                <div className="px-6 mb-6">
                    <div className="glass-card p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <Wallet className="w-5 h-5 text-tm-purple" />
                            <h3 className="font-bold">Account Overview</h3>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                                <p className="text-xs text-tm-muted">Net Liquidation</p>
                                <p className="text-lg font-bold font-mono text-tm-green">
                                    ${balance.netLiquidation.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-tm-muted">Buying Power</p>
                                <p className="text-lg font-bold font-mono text-tm-purple">
                                    ${balance.buyingPower.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-tm-muted">Cash Available</p>
                                <p className="text-lg font-bold font-mono">
                                    ${balance.cashAvailable.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Filtered Portfolio Summary */}
            {filteredPositions.length > 0 && (
                <div className="px-6 mb-6">
                    <div className="glass-card p-5 bg-gradient-to-br from-purple-900/20 to-indigo-900/20 border-purple-500/20">
                        <div className="flex items-center gap-2 mb-3">
                            <BarChart3 className={`w-5 h-5 ${activeStrategyConfig?.color ? activeStrategyConfig.color.split(' ')[0] : 'text-purple-400'}`} />
                            <h3 className="font-bold">{activeStrategy === 'ALL' ? 'All' : activeStrategyConfig?.label || 'TurboCore'} Portfolio</h3>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                                <p className="text-xs text-tm-muted">Total Value</p>
                                <p className="text-lg font-bold font-mono">
                                    ${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-tm-muted">Unrealized P&L</p>
                                <p className={`text-lg font-bold font-mono ${totalPnl >= 0 ? 'text-tm-green' : 'text-tm-red'}`}>
                                    {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-tm-muted">Return</p>
                                <p className={`text-lg font-bold font-mono ${totalPnlPct >= 0 ? 'text-tm-green' : 'text-tm-red'}`}>
                                    {totalPnlPct >= 0 ? '+' : ''}{totalPnlPct.toFixed(2)}%
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Equity Positions */}
            <div className="px-6 space-y-3">
                {loading ? (
                    [1, 2, 3].map(i => (
                        <div key={i} className="glass-card p-5 animate-pulse">
                            <div className="h-5 w-1/3 bg-tm-surface rounded mb-3" />
                            <div className="h-4 w-2/3 bg-tm-surface rounded" />
                        </div>
                    ))
                ) : filteredPositions.length === 0 ? (
                    <div className="glass-card p-8 text-center">
                        <TrendingUp className="w-12 h-12 text-tm-purple mx-auto mb-4" />
                        <h3 className="font-semibold mb-2">No {activeStrategyConfig?.shortLabel || 'TurboCore'} positions</h3>
                        <p className="text-sm text-tm-muted mb-4">Execute a signal to open equity positions</p>
                        <Link href="/dashboard" className="btn-primary inline-block">
                            Go to Dashboard
                        </Link>
                    </div>
                ) : (
                    filteredPositions.map((pos) => (
                        <EquityCard key={pos.symbol} position={pos} totalValue={totalValue} />
                    ))
                )}
            </div>
        </main>
    );
}

function EquityCard({
    position,
    totalValue
}: {
    position: EquityPosition;
    totalValue: number;
}) {
    const isProfit = position.unrealizedPnl >= 0;
    const allocationPct = totalValue > 0 ? (position.marketValue / totalValue) * 100 : 0;

    const symbolColors: Record<string, string> = {
        'QQQ': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        'QLD': 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
        'TQQQ': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
        'SGOV': 'bg-green-500/20 text-green-400 border-green-500/30',
    };
    const color = symbolColors[position.symbol] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';

    return (
        <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${color}`}>
                        <span className="font-bold text-sm">{position.symbol}</span>
                    </div>
                    <div>
                        <h3 className="font-bold text-lg">{position.symbol}</h3>
                        <p className="text-xs text-tm-muted">
                            {position.quantity} shares · Avg ${position.averageOpenPrice.toFixed(2)}
                        </p>
                    </div>
                </div>
                <div className="text-right">
                    <p className={`text-lg font-bold font-mono ${isProfit ? 'text-tm-green' : 'text-tm-red'}`}>
                        {isProfit ? '+' : ''}${position.unrealizedPnl.toFixed(2)}
                    </p>
                    <p className={`text-xs font-mono ${isProfit ? 'text-tm-green' : 'text-tm-red'}`}>
                        {isProfit ? '+' : ''}{position.unrealizedPnlPct.toFixed(2)}%
                    </p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 text-center bg-tm-surface/40 rounded-lg p-3">
                <div>
                    <p className="text-[10px] text-tm-muted mb-0.5">Market Value</p>
                    <p className="font-mono text-sm font-bold">${position.marketValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                </div>
                <div>
                    <p className="text-[10px] text-tm-muted mb-0.5">Current Price</p>
                    <p className="font-mono text-sm font-bold">${position.currentPrice.toFixed(2)}</p>
                </div>
                <div>
                    <p className="text-[10px] text-tm-muted mb-0.5">Allocation</p>
                    <p className="font-mono text-sm font-bold text-purple-400">{allocationPct.toFixed(1)}%</p>
                </div>
            </div>
        </div>
    );
}
