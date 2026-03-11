import React, { useState } from 'react';
import { Shield, Zap, TrendingUp, AlertTriangle, ChevronDown, CheckCircle, Brain, Target, Activity } from 'lucide-react';
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
    // Defaults to the user's Settings, then Net Liq, or 5000 if not linked
    const defaultCapital = principalSetting || (accountData?.netLiquidatingValue ? Math.floor(accountData.netLiquidatingValue) : 5000);
    const [investmentCapital, setInvestmentCapital] = useState<number>(defaultCapital);


    // Parse Payload Defaults
    const regime = signal.regime || "SIDEWAYS";
    const confidence = signal.confidence || 0;
    const isCrisis = regime.includes("BEAR");

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
                    <div className="text-[10px] text-white/50 mb-1">SGOV (Cash)</div>
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

            {/* Footer Controls & Execution */}
            <div className="flex gap-2">
                <button
                    onClick={() => onExecute({ ...signal, capital_required: investmentCapital })}
                    disabled={isExecuting || isCrisis}
                    className={`
                            flex-1 py-3 px-4 rounded-lg font-bold flex flex-col items-center justify-center transition-all
                            ${isCrisis
                            ? 'bg-red-500/10 text-red-500 cursor-not-allowed border border-red-500/20'
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
                            <span className="text-[10px] font-normal opacity-70">SMA200 Exited</span>
                        </>
                    ) : isLinked ? (
                        <>
                            <span className="flex items-center gap-1"><Zap className="w-4 h-4" /> EXECUTE LIVE SYNC</span>
                            <span className="text-[10px] font-normal opacity-70">Auto-routes to Tastytrade</span>
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
                        <p className="p-2 text-xs italic opacity-70">"{signal.rationale}"</p>
                    )}
                </div>
            )}
        </div>
    );
}
