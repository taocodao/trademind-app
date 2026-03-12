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
}

interface PreviewOrder {
    symbol: string;
    action: 'Buy' | 'Sell';
    quantity: number;       // Whole shares
    exactShares: number;    // Fractional shares
    diffValue: number;      // Dollar amount
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
}

export function TurboCoreSignalCard({ signal, onExecute, executingId, accountData, principalSetting }: Props) {
    const { t } = useTranslation();
    const isExecuting = executingId === String(signal.id);
    const [expanded, setExpanded] = useState(false);
    const isLinked = !!accountData?.accountNumber;

    // Capital Allocation Calculator State
    const defaultCapital = principalSetting || (accountData?.netLiquidatingValue ? Math.floor(accountData.netLiquidatingValue) : 5000);
    const [investmentCapital, setInvestmentCapital] = useState<number>(defaultCapital);

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
                        signalDetails: { ...signal, capital_required: investmentCapital },
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
    }, [investmentCapital, isLinked, signal, accountData?.accountNumber]);

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

    // Compute local whole-share display for non-connected users (no live data)
    const getLocalOrderDisplay = () => {
        const orders: Array<{ symbol: string; targetPct: number; dollarAmount: number; approxShares: string }> = [];
        for (const leg of allocations) {
            if (leg.symbol === 'SGOV') continue;
            const pct = leg.target_pct;
            const dollarAmount = investmentCapital * pct;
            if (dollarAmount < 5) continue;
            orders.push({
                symbol: leg.symbol,
                targetPct: pct,
                dollarAmount,
                approxShares: `≈${dollarAmount > 0 ? (dollarAmount / (leg.symbol === 'QQQ' ? 490 : leg.symbol === 'QLD' ? 68 : 55)).toFixed(1) : '0'}`,
            });
        }
        return orders;
    };

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
                                    TQQQ TurboCore
                                </h3>
                                <div className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getRegimeColor(regime)}`}>
                                    {regime}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm mt-0.5">
                                <span className={confidence >= 0.65 ? 'text-green-400' : 'text-yellow-400'}>
                                    Target Rebalance
                                </span>
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
                        <div className="font-mono text-[10px] text-white/40 mt-1">${(investmentCapital * (Number(getTarget('QQQ')) / 100)).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                    </div>
                    <div className="bg-[#111] p-3 rounded-lg border border-white/5 text-center">
                        <div className="text-[10px] text-white/50 mb-1">QLD (2x)</div>
                        <div className="font-mono text-sm font-bold text-blue-400">{getTarget('QLD')}%</div>
                        <div className="font-mono text-[10px] text-white/40 mt-1">${(investmentCapital * (Number(getTarget('QLD')) / 100)).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                    </div>
                    <div className="bg-[#111] p-3 rounded-lg border border-white/5 text-center">
                        <div className="text-[10px] text-white/50 mb-1">TQQQ (3x)</div>
                        <div className="font-mono text-sm font-bold text-purple-400">{getTarget('TQQQ')}%</div>
                        <div className="font-mono text-[10px] text-white/40 mt-1">${(investmentCapital * (Number(getTarget('TQQQ')) / 100)).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                    </div>
                    <div className="bg-[#111] p-3 rounded-lg border border-white/5 text-center">
                        <div className="text-[10px] text-white/50 mb-1">SGOV</div>
                        <div className="font-mono text-sm font-bold text-green-400">{getTarget('SGOV')}%</div>
                        <div className="font-mono text-[10px] text-white/40 mt-1">${(investmentCapital * (Number(getTarget('SGOV')) / 100)).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                    </div>
                </div>

                {/* Capital Allocation Calculator */}
                <div className="mb-4 bg-black/50 p-3 rounded-lg border border-white/5">
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-xs text-white/70 font-semibold flex items-center gap-1">
                            <Target className="w-3.5 h-3.5 text-purple-400" />
                            Target Investment Capital
                        </label>
                        <span className="text-xs font-mono text-purple-400 font-bold">${investmentCapital.toLocaleString()}</span>
                    </div>
                    <input
                        type="range"
                        min={1000}
                        max={100000}
                        step={500}
                        value={investmentCapital}
                        onChange={(e) => setInvestmentCapital(Number(e.target.value))}
                        className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500 mb-2"
                    />
                    <div className="flex justify-between text-[10px] text-white/30 font-mono">
                        <span>$1k</span>
                        <span>$50k</span>
                        <span>$100k</span>
                    </div>
                </div>

                {/* Order Details - ALWAYS SHOWN (for both connected and non-connected users) */}
                <div className="mb-4 bg-purple-900/10 p-3 rounded-lg border border-purple-500/20 relative overflow-hidden">
                    <div className="text-xs text-purple-400 font-semibold mb-2 flex justify-between items-center">
                        <span className="flex items-center gap-1">
                            <DollarSign className="w-3.5 h-3.5" />
                            {isLinked ? 'Live Order Preview (Notional)' : 'Order Details (Estimated)'}
                        </span>
                        {isPreviewLoading && <div className="w-3 h-3 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin" />}
                    </div>

                    {isLinked ? (
                        // Connected users: show live preview from API
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
                        // Non-connected users: show estimated whole-share orders
                        (() => {
                            const localOrders = getLocalOrderDisplay();
                            return localOrders.length === 0 ? (
                                <div className="text-xs text-white/40 italic text-center py-2">Adjust capital slider to see orders</div>
                            ) : (
                                <div className="space-y-1.5">
                                    {localOrders.map((o, i) => (
                                        <div key={i} className="flex justify-between items-center text-xs font-mono bg-black/40 p-2 rounded border border-white/5">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold px-1.5 py-0.5 rounded text-green-400 bg-green-400/10">
                                                    BUY
                                                </span>
                                                <span className="text-white/90 font-bold">{o.symbol}</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-white/70">${o.dollarAmount.toFixed(0)}</span>
                                                <span className="text-white/30 ml-1">({o.approxShares} sh)</span>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="text-[10px] text-yellow-400/60 text-center pt-1">
                                        💡 Connect Tastytrade for exact live pricing & auto-execution
                                    </div>
                                </div>
                            );
                        })()
                    )}
                </div>

                {/* Footer Controls & Execution */}
                <div className="flex gap-2">
                    <button
                        onClick={() => onExecute({ ...signal, capital_required: investmentCapital })}
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
                                <span className="flex items-center gap-1"><Shield className="w-4 h-4" /> CALCULATE SHADOW SYNC</span>
                                <span className="text-[10px] font-normal opacity-70">Manual execution guide</span>
                            </>
                        )}
                    </button>

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
