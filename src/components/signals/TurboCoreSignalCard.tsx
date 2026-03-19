import React, { useState, useEffect } from 'react';
import { Shield, Zap, TrendingUp, AlertTriangle, ChevronDown, CheckCircle, Brain, Target, Activity, DollarSign } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface TurboCoreSignal {
    id: number;
    symbol: string;
    action: string;
    strategy?: string;
    direction: string;
    confidence: number;
    capital_required: number;
    cost: number;
    legs: any[];
    rationale?: string;
    regime?: string;
    ema_signal?: number;
    sma200_gate?: boolean;
    timestamp: string;
    createdAt?: string;
    userExecution?: {
        status: string;
        orderId: string | null;
        executedAt: string | null;
    };
}

interface PreviewOrder {
    symbol: string;
    action: 'Buy' | 'Sell';
    quantity: number;
    exactShares: number;
    diffValue: number;
    targetPct: number;
    targetValue: number;
    currentShares: number;
    currentValue: number;
    currentPrice: number;
}

interface Props {
    signal: TurboCoreSignal;
    onExecute: (signal: TurboCoreSignal) => void;
    executingId: string | null;
    accountData: any;
    principalSetting?: number;
    isExecuted?: boolean;        // NEW: locks button after execution
    shadowBalance?: number;       // NEW: used when not linked to Tastytrade
}

export function TurboCoreSignalCard({ signal, onExecute, executingId, accountData, principalSetting, isExecuted, shadowBalance }: Props) {
    const { t } = useTranslation();
    const isExecuting = executingId === String(signal.id);
    const [expanded, setExpanded] = useState(false);
    const isLinked = !!accountData?.accountNumber;

    // Capital basis: use live net liq if linked, shadow balance if virtual, fallback to principalSetting
    const capitalBasis = isLinked
        ? (accountData?.netLiquidatingValue || principalSetting || 5000)
        : (shadowBalance || principalSetting || 5000);

    // Parse Payload Defaults
    const regime = signal.regime || "SIDEWAYS";
    const confidence = signal.confidence || 0;
    const isCrisis = regime.includes("BEAR");

    const [previewOrders, setPreviewOrders] = useState<PreviewOrder[]>([]);
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);

    // Fetch preview orders from API (live data from Tastytrade)
    useEffect(() => {
        if (!isLinked) return;
        setIsPreviewLoading(true);
        const timeout = setTimeout(async () => {
            try {
                const res = await fetch(`/api/signals/${signal.id}/preview`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        signalDetails: { ...signal, capital_required: capitalBasis },
                        accountNumber: accountData?.accountNumber
                    })
                });
                if (res.ok) {
                    const data = await res.json();
                    setPreviewOrders(data.orders || []);
                }
            } catch (e) {
                console.error("Failed to fetch preview orders", e);
            } finally {
                setIsPreviewLoading(false);
            }
        }, 600);
        return () => clearTimeout(timeout);
    }, [isLinked, signal, accountData?.accountNumber, capitalBasis]);

    // Extract multi-ticker target weights
    const allocations = signal.legs || [];
    const getTarget = (sym: string) => {
        const leg = allocations.find(l => l.symbol === sym);
        return leg ? (leg.target_pct * 100).toFixed(0) : "0";
    };

    const getRegimeColor = (r: string) => {
        if (r === "BULL") return "text-green-400 bg-green-400/10 border-green-400/20";
        if (r === "SIDEWAYS") return "text-yellow-400 bg-yellow-400/10 border-yellow-400/20";
        return "text-red-400 bg-red-400/10 border-red-400/20";
    };

    // Compute local whole-share display using capitalBasis (real account or shadow balance)
    const getLocalOrderDisplay = () => {
        const orders: Array<{ symbol: string; targetPct: number; dollarAmount: number; approxShares: string }> = [];
        for (const leg of allocations) {
            if (leg.symbol === 'SGOV') continue;
            const pct = leg.target_pct;
            const dollarAmount = capitalBasis * pct;
            if (dollarAmount < 5) continue;
            // Approximate share prices for display (market-close reference)
            const refPrice = leg.symbol === 'QQQ' ? 490 : leg.symbol === 'QLD' ? 68 : 55;
            orders.push({
                symbol: leg.symbol,
                targetPct: pct,
                dollarAmount,
                approxShares: `≈${(dollarAmount / refPrice).toFixed(1)}`,
            });
        }
        return orders;
    };

    // Format signal creation timestamp with date (e.g. "Mar 18, 3:00 PM")
    const signalTimestamp = signal.createdAt || (signal as any).created_at;
    const formattedTimestamp = signalTimestamp
        ? new Date(signalTimestamp).toLocaleString([], {
            month: 'short', day: 'numeric',
            hour: 'numeric', minute: '2-digit'
        })
        : null;

    return (
        <div className="bg-black/40 border border-[#333] rounded-xl overflow-hidden hover:border-[#444] transition-all group">
            <div className="p-4">

                {/* Header: Strategy & ML Regime Core */}
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center border border-purple-500/20">
                            <Brain className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-lg text-white tracking-tight">
                                    {signal.strategy?.toUpperCase() === 'TQQQ_TURBOCORE_PRO' ? 'TurboCore Pro' : 'TQQQ TurboCore'}
                                </h3>
                                <div className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getRegimeColor(regime)}`}>
                                    {regime}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm mt-0.5">
                                <span className={confidence >= 0.65 ? 'text-green-400' : 'text-yellow-400'}>
                                    Target Rebalance
                                </span>
                                {formattedTimestamp && (
                                    <span className="text-xs text-white/30 border-l border-white/10 pl-2">
                                        {formattedTimestamp}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ML Score Right Side */}
                    <div className="text-right">
                        <div className="text-2xl font-bold bg-gradient-to-br from-purple-400 to-indigo-500 bg-clip-text text-transparent">
                            {(confidence * 100).toFixed(1)}%
                        </div>
                        <div className="text-xs text-white/40 font-medium">ML Score</div>
                    </div>
                </div>

                {/* Body: Multi-Asset Grid */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                    <div className="bg-[#111] p-3 rounded-lg border border-white/5 text-center">
                        <div className="text-[10px] text-white/50 mb-1">QQQ</div>
                        <div className="font-mono text-sm font-bold text-white/90">{getTarget('QQQ')}%</div>
                        <div className="font-mono text-[10px] text-white/40 mt-1">${(capitalBasis * (Number(getTarget('QQQ')) / 100)).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                    </div>
                    <div className="bg-[#111] p-3 rounded-lg border border-white/5 text-center">
                        <div className="text-[10px] text-white/50 mb-1">QLD (2x)</div>
                        <div className="font-mono text-sm font-bold text-blue-400">{getTarget('QLD')}%</div>
                        <div className="font-mono text-[10px] text-white/40 mt-1">${(capitalBasis * (Number(getTarget('QLD')) / 100)).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                    </div>
                    <div className="bg-[#111] p-3 rounded-lg border border-white/5 text-center">
                        <div className="text-[10px] text-white/50 mb-1">TQQQ (3x)</div>
                        <div className="font-mono text-sm font-bold text-purple-400">{getTarget('TQQQ')}%</div>
                        <div className="font-mono text-[10px] text-white/40 mt-1">${(capitalBasis * (Number(getTarget('TQQQ')) / 100)).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                    </div>
                    <div className="bg-[#111] p-3 rounded-lg border border-white/5 text-center">
                        <div className="text-[10px] text-white/50 mb-1">SGOV</div>
                        <div className="font-mono text-sm font-bold text-green-400">{getTarget('SGOV')}%</div>
                        <div className="font-mono text-[10px] text-white/40 mt-1">${(capitalBasis * (Number(getTarget('SGOV')) / 100)).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                    </div>
                </div>

                {/* Capital basis label (replaces slider) */}
                <div className="mb-4 flex items-center justify-between px-2 py-2 bg-black/30 rounded-lg border border-white/5 text-xs">
                    <span className="text-white/50 flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5 text-purple-400" />
                        {isLinked ? 'Account Net Liq' : 'Shadow Balance'}
                    </span>
                    <span className="font-mono font-bold text-purple-400">
                        ${capitalBasis.toLocaleString()}
                    </span>
                </div>

                {/* Order Details */}
                <div className="mb-4 bg-purple-900/10 p-3 rounded-lg border border-purple-500/20 relative overflow-hidden">
                    <div className="text-xs text-purple-400 font-semibold mb-2 flex justify-between items-center">
                        <span className="flex items-center gap-1">
                            <DollarSign className="w-3.5 h-3.5" />
                            {isLinked ? 'Live Order Preview (Notional)' : 'Order Details (Estimated)'}
                        </span>
                        {isPreviewLoading && <div className="w-3 h-3 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin" />}
                    </div>

                    {isLinked ? (
                        previewOrders.length === 0 && !isPreviewLoading ? (
                            <div className="text-xs text-white/40 italic text-center py-2">No rebalance needed</div>
                        ) : (
                            <div className={`space-y-1.5 transition-opacity ${isPreviewLoading ? 'opacity-50' : 'opacity-100'}`}>
                                {previewOrders.map((o, i) => (
                                    <div key={i} className="flex justify-between items-center text-xs font-mono bg-black/40 p-2 rounded border border-white/5">
                                        <div className="flex items-center gap-2">
                                            <span className={`font-bold px-1.5 py-0.5 rounded ${o.action === 'Buy' ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'}`}>
                                                {o.action.toUpperCase()}
                                            </span>
                                            <span className="text-white/90 font-bold">{o.symbol}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-white/70">${o.diffValue?.toFixed(0)}</span>
                                            <span className="text-white/30 ml-1">(≈{o.exactShares?.toFixed(2)} sh)</span>
                                        </div>
                                    </div>
                                ))}
                                <div className="text-[10px] text-purple-400/60 text-center pt-1">
                                    ⚡ Notional Market orders · fractional shares enabled
                                </div>
                            </div>
                        )
                    ) : (
                        (() => {
                            const localOrders = getLocalOrderDisplay();
                            return localOrders.length === 0 ? (
                                <div className="text-xs text-white/40 italic text-center py-2">Set your shadow balance in Settings to see orders</div>
                            ) : (
                                <div className="space-y-1.5">
                                    {localOrders.map((o, i) => (
                                        <div key={i} className="flex justify-between items-center text-xs font-mono bg-black/40 p-2 rounded border border-white/5">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold px-1.5 py-0.5 rounded text-green-400 bg-green-400/10">BUY</span>
                                                <span className="text-white/90 font-bold">{o.symbol}</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-white/70">${o.dollarAmount.toFixed(0)}</span>
                                                <span className="text-white/30 ml-1">({o.approxShares} sh)</span>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="text-[10px] text-yellow-400/60 text-center pt-1">
                                        💡 Connect Tastytrade for exact live pricing &amp; auto-execution
                                    </div>
                                </div>
                            );
                        })()
                    )}
                </div>

                {/* Footer Controls & Execution */}
                <div className="flex gap-2">
                    {isExecuted ? (
                        // Locked executed state
                        <div className="flex-1 py-3 px-4 rounded-lg font-bold flex items-center justify-center gap-2 bg-green-500/10 border border-green-500/30 text-green-400 cursor-default">
                            <CheckCircle className="w-4 h-4" />
                            <span>Executed</span>
                        </div>
                    ) : (
                        <button
                            onClick={() => onExecute({ ...signal, capital_required: capitalBasis })}
                            disabled={isExecuting}
                            className={`
                                flex-1 py-3 px-4 rounded-lg font-bold flex flex-col items-center justify-center transition-all
                                ${isCrisis
                                    ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30 cursor-pointer'
                                    : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg'
                                }
                                ${isExecuting ? 'opacity-70 cursor-wait' : ''}
                            `}
                        >
                            {isExecuting ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : isCrisis ? (
                                <>
                                    <span className="flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> RISK OFF</span>
                                    <span className="text-[10px] font-normal opacity-70">Bear regime — 100% cash</span>
                                </>
                            ) : isLinked ? (
                                <>
                                    <span className="flex items-center gap-1"><Zap className="w-4 h-4" /> EXECUTE NOTIONAL SYNC</span>
                                    <span className="text-[10px] font-normal opacity-70">Dollar-based · fractional shares</span>
                                </>
                            ) : (
                                <>
                                    <span className="flex items-center gap-1"><Shield className="w-4 h-4" /> EXECUTE VIRTUALLY</span>
                                    <span className="text-[10px] font-normal opacity-70">Integer shares · market quotes</span>
                                </>
                            )}
                        </button>
                    )}

                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="w-12 flex items-center justify-center rounded-lg bg-[#222] border border-white/10 hover:bg-[#333] transition-colors"
                    >
                        <ChevronDown className={`w-5 h-5 text-white/60 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                    </button>
                </div>

                {expanded && (
                    <div className="mt-4 pt-4 border-t border-white/5 animate-in slide-in-from-top-2 text-sm text-white/70 space-y-2">
                        <div className="flex justify-between items-center p-2 bg-black/30 rounded border border-white/5">
                            <span className="flex items-center gap-2"><Activity className="w-4 h-4 text-orange-400" /> 5/30 EMA</span>
                            <span className="font-mono">{signal.ema_signal === 1 ? 'GOLDEN CROSS' : 'DEATH CROSS'}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-black/30 rounded border border-white/5">
                            <span className="flex items-center gap-2"><Target className="w-4 h-4 text-blue-400" /> QQQ &gt; SMA200</span>
                            <span className="font-mono">{signal.sma200_gate ? 'YES' : 'NO'}</span>
                        </div>
                        {signal.rationale && (
                            <p className="p-2 text-xs italic opacity-70">&quot;{signal.rationale}&quot;</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
