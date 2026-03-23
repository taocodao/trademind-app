import React, { useState, useEffect } from 'react';
import { Shield, Zap, TrendingUp, AlertTriangle, ChevronDown, CheckCircle, Brain, Target, Activity, DollarSign, Clipboard, ClipboardCheck, BookOpen } from 'lucide-react';
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
    const [livePrices, setLivePrices] = useState<Record<string, number>>({});
    
    // Extract multi-ticker target weights
    const allocations = signal.legs || [];

    // Fetch live prices for local order display
    useEffect(() => {
        const fetchPrices = async () => {
            try {
                const symbolsParam = allocations.filter(l => l.symbol !== 'SGOV').map(l => l.symbol).join(',');
                if (!symbolsParam) return;
                const res = await fetch(`/api/quotes?symbols=${symbolsParam}`);
                if (res.ok) {
                    const data = await res.json();
                    setLivePrices(data);
                }
            } catch (e) {
                console.error("Failed to fetch live prices", e);
            }
        };
        fetchPrices();
    }, [allocations]);

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

    const getTarget = (sym: string) => {
        const leg = allocations.find(l => l.symbol === sym);
        return leg ? (leg.target_pct * 100).toFixed(0) : "0";
    };

    const getRegimeColor = (r: string) => {
        if (r === "BULL") return "text-green-400 bg-green-400/10 border-green-400/20";
        if (r === "SIDEWAYS") return "text-yellow-400 bg-yellow-400/10 border-yellow-400/20";
        return "text-red-400 bg-red-400/10 border-red-400/20";
    };

    // Compute manual order instructions for users without TastyTrade connected
    const getManualOrderInstructions = () => {
        const orders: Array<{
            symbol: string;
            label: string;
            action: string;
            dollarAmount: number;
            approxShares: string;
            approxPrice: string;
            orderType: string;
            isOption: boolean;
            optionNote?: string;
        }> = [];

        for (const leg of allocations) {
            const pct = leg.target_pct;
            const dollarAmount = capitalBasis * pct;
            if (dollarAmount < 5) continue;

            if (leg.symbol === 'SGOV') continue; // cash sleeve — no order needed

            if (leg.symbol === 'QQQ_LEAPS') {
                const qqqPrice = livePrices['QQQ'] || 490;
                const targetStrike = Math.round(qqqPrice * 0.65 / 5) * 5; // ~0.70 delta ITM ≈ 35% ITM
                const approxContracts = Math.floor(dollarAmount / (qqqPrice * 0.35 * 100));
                orders.push({
                    symbol: 'QQQ',
                    label: 'QQQ LEAPS Call',
                    action: 'BUY TO OPEN',
                    dollarAmount,
                    approxShares: `≈${approxContracts} contract${approxContracts !== 1 ? 's' : ''}`,
                    approxPrice: `~$${(qqqPrice * 0.35).toFixed(0)}/contract`,
                    orderType: 'Limit (ask)',
                    isOption: true,
                    optionNote: `Strike ≈ $${targetStrike} | ~12 months out | 0.70 delta ITM call`,
                });
                continue;
            }

            const refPrice = livePrices[leg.symbol] || (leg.symbol === 'QLD' ? 68 : leg.symbol === 'TQQQ' ? 55 : 100);
            const approxShares = (dollarAmount / refPrice).toFixed(1);
            orders.push({
                symbol: leg.symbol,
                label: leg.symbol === 'QLD' ? 'QLD (2x)' : leg.symbol,
                action: 'BUY',
                dollarAmount,
                approxShares: `≈${approxShares} sh`,
                approxPrice: refPrice > 0 ? `~$${refPrice.toFixed(2)}/sh` : '—',
                orderType: 'Market',
                isOption: false,
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
                <div className={`grid ${allocations.length > 4 ? 'grid-cols-5' : 'grid-cols-4'} gap-2 mb-4`}>
                    {['QQQ', 'QLD', 'TQQQ', 'QQQ_LEAPS', 'SGOV'].map((sym) => {
                        const legObj = allocations.find(l => l.symbol === sym);
                        // Only render legs that are actually part of the target OR if it's the core set
                        if (!legObj && !['QQQ', 'QLD'].includes(sym)) return null;
                        
                        // For TurboCore standard, don't render LEAPS if 0. For Pro, render what we have.
                        if (sym === 'QQQ_LEAPS' && !legObj) return null;
                        if (sym === 'TQQQ' && signal.strategy?.toUpperCase().includes('PRO') && !legObj) return null;

                        let colorClass = 'text-white/90';
                        if (sym === 'QLD') colorClass = 'text-blue-400';
                        if (sym === 'TQQQ') colorClass = 'text-purple-400';
                        if (sym === 'SGOV') colorClass = 'text-green-400';
                        if (sym === 'QQQ_LEAPS') colorClass = 'text-amber-400';

                        let label = sym;
                        if (sym === 'QLD') label = 'QLD (2x)';
                        if (sym === 'TQQQ') label = 'TQQQ (3x)';
                        if (sym === 'QQQ_LEAPS') label = 'LEAPS';

                        const targetStr = getTarget(sym);
                        const dollarAmount = capitalBasis * (Number(targetStr) / 100);

                        return (
                            <div key={sym} className="bg-[#111] p-3 rounded-lg border border-white/5 text-center">
                                <div className="text-[10px] text-white/50 mb-1">{label}</div>
                                <div className={`font-mono text-sm font-bold ${colorClass}`}>{targetStr}%</div>
                                <div className="font-mono text-[10px] text-white/40 mt-1">${dollarAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                            </div>
                        );
                    })}
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
                        <ManualOrderPanel orders={getManualOrderInstructions()} />
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
// --- Manual Order Panel -----------------------------------------------------
// Shown when user is NOT linked to Tastytrade.
function ManualOrderPanel({ orders }: {
    orders: Array<{
        symbol: string;
        label: string;
        action: string;
        dollarAmount: number;
        approxShares: string;
        approxPrice: string;
        orderType: string;
        isOption: boolean;
        optionNote?: string;
    }>;
}) {
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
    const copyRow = (o: typeof orders[0], i: number) => {
        const text = o.isOption
            ? `${o.action} ${o.approxShares} of QQQ LEAPS (${o.optionNote}) @ ${o.approxPrice} � ${o.orderType}`
            : `${o.action} ${o.approxShares} of ${o.label} @ ${o.approxPrice} � ${o.orderType} � $${o.dollarAmount.toFixed(0)} notional`;
        navigator.clipboard.writeText(text).then(() => {
            setCopiedIndex(i);
            setTimeout(() => setCopiedIndex(null), 2000);
        });
    };
    if (orders.length === 0) {
        return <div className="text-xs text-white/40 italic text-center py-2">Set your shadow balance in Settings to see orders</div>;
    }
    return (
        <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-[10px] text-amber-400/80 font-semibold mb-1">
                <BookOpen className="w-3 h-3" />
                MANUAL ORDER INSTRUCTIONS � enter these in your broker
            </div>
            {orders.map((o, i) => (
                <div key={i}>
                    <div className="flex items-center justify-between text-xs font-mono bg-black/40 px-2 py-2 rounded border border-white/5">
                        <div className="flex items-center gap-2 min-w-0">
                            <span className={`shrink-0 font-bold px-1.5 py-0.5 rounded text-[10px] ${o.action.includes('BUY') ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'}`}>{o.action}</span>
                            <div className="min-w-0">
                                <span className={`font-bold ${o.isOption ? 'text-amber-300' : 'text-white/90'}`}>{o.label}</span>
                                <span className="text-white/30 text-[10px] ml-1">� {o.orderType}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <div className="text-right">
                                <div className="text-white/80">${o.dollarAmount.toFixed(0)}</div>
                                <div className="text-white/30 text-[10px]">{o.approxShares}</div>
                            </div>
                            <button onClick={() => copyRow(o, i)} className="w-7 h-7 flex items-center justify-center rounded bg-white/5 hover:bg-white/10 transition-colors" title="Copy order instructions">
                                {copiedIndex === i ? <ClipboardCheck className="w-3.5 h-3.5 text-green-400" /> : <Clipboard className="w-3.5 h-3.5 text-white/30" />}
                            </button>
                        </div>
                    </div>
                    {o.isOption && o.optionNote && (
                        <div className="text-[10px] text-amber-400/60 pl-2 pt-0.5 leading-tight">? {o.optionNote} � approx {o.approxPrice}</div>
                    )}
                </div>
            ))}
            <div className="text-[10px] text-yellow-400/50 text-center pt-1">?? Connect Tastytrade for live pricing &amp; one-click execution</div>
        </div>
    );
}
