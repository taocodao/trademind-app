'use client';

import { TrendingUp, TrendingDown, Minus, Clock, AlertTriangle } from 'lucide-react';
import { useSettings } from '@/components/providers/SettingsProvider';

export interface TQQQSignal {
    id: string;
    type: 'PUT_CREDIT' | 'BEAR_CALL';
    strikes: string;              // e.g. "Sell $72C / Buy $77C"
    symbol: string;               // "TQQQ"
    expiry: string;               // "Mar 7"
    credit: number;               // e.g. 0.85
    maxLoss: number;              // e.g. 4.15
    confidence: number;           // 0–100
    regime: string;               // "HIGH_VOL"
    vixDirection: 'RISING' | 'FALLING' | 'STABLE';
    vixLevel: number;
    risk_level?: 'Low' | 'Medium' | 'High';
    createdAt: string;
    status?: string; // 'PENDING' | 'EXECUTED' | 'TRACKED' | 'EXPIRED'
    executed_at?: string;
    fill_price?: number;
}

interface SignalCardProps {
    signal: TQQQSignal;
    tastyLinked: boolean;
    onApproveExecute: (id: string, quantity: number) => void;
    onTrackOnly: (id: string) => void;
    executing?: boolean;
    recentOrders?: any[];
}

export function SignalCard({
    signal,
    tastyLinked,
    onApproveExecute,
    onTrackOnly,
    executing = false,
    recentOrders = [],
}: SignalCardProps) {
    const { settings } = useSettings();

    // Position sizing calculation
    const riskPct = settings.riskLevel === 'LOW' ? 0.05 : settings.riskLevel === 'HIGH' ? 0.10 : 0.075;
    const maxRisk = settings.investmentPrincipal * riskPct;
    const maxLossPerContract = (signal.maxLoss || 5.0) * 100;
    // Cap at 10 contracts, floor at 1
    const quantity = Math.min(Math.max(1, Math.floor(maxRisk / maxLossPerContract)), 10);

    const totalCredit = (signal.credit || 0) * quantity * 100;
    const totalMaxLoss = (signal.maxLoss || 0) * quantity * 100;

    const isBullish = signal.type === 'PUT_CREDIT';
    const VixIcon = signal.vixDirection === 'FALLING'
        ? TrendingDown
        : signal.vixDirection === 'RISING'
            ? TrendingUp
            : Minus;

    const vixColor = signal.vixDirection === 'FALLING'
        ? 'text-tm-green'
        : signal.vixDirection === 'RISING'
            ? 'text-tm-red'
            : 'text-tm-muted';

    const typeLabel = isBullish ? '🟢 PUT CREDIT' : '🐻 BEAR CALL';
    const typeBorderColor = isBullish ? 'border-l-tm-green' : 'border-l-tm-red';
    const typeBadgeBg = isBullish ? 'bg-tm-green/15 text-tm-green' : 'bg-tm-red/15 text-tm-red';

    const confidenceColor = signal.confidence >= 80 ? 'text-tm-green' : signal.confidence >= 60 ? 'text-amber-400' : 'text-tm-red';

    // Extract execution price from recent orders if status is EXECUTED
    let displayFillPrice = signal.fill_price;
    if (signal.status === 'EXECUTED' && !displayFillPrice && recentOrders.length > 0) {
        // Find an order placed around the same time for this symbol
        const sigTimeStr = signal.executed_at || signal.createdAt;
        if (sigTimeStr) {
            const sigTime = new Date(sigTimeStr).getTime();

            // Orders are sorted newest first usually. Find first one within ~10 minutes of execution time
            // that matches TQQQ.
            const matchedOrder = recentOrders.find(o => {
                const oTimeStr = o['received-at'] || o['updated-at'];
                if (!oTimeStr) return false;

                const oTime = new Date(oTimeStr).getTime();
                const timeDiff = Math.abs(oTime - sigTime);

                // Must be within 10 mins (600000ms), have same underlying, and be FILLED
                return timeDiff < 600000 &&
                    o['underlying-symbol'] === signal.symbol &&
                    o.status === 'Filled';
            });

            if (matchedOrder) {
                const price = matchedOrder['average-price'] || matchedOrder.price;
                if (price) {
                    displayFillPrice = parseFloat(price);
                }
            }
        }
    }

    return (
        <div className={`glass-card border-l-4 ${typeBorderColor} p-4`}>
            {/* Header row */}
            <div className="flex items-start justify-between mb-3">
                <div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${typeBadgeBg}`}>
                        {typeLabel}
                    </span>
                    {signal.risk_level && (
                        <span className="ml-2 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border border-white/20 text-tm-muted">
                            {signal.risk_level} Risk
                        </span>
                    )}
                    <p className="text-tm-muted text-xs mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {signal.symbol} · {signal.expiry}
                        {signal.createdAt && (
                            <span className="opacity-75">
                                ({new Date(signal.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                            </span>
                        )}
                    </p>
                </div>
                <span className="text-xs bg-tm-purple/20 text-tm-purple px-2 py-0.5 rounded-full font-semibold">
                    {signal.regime}
                </span>
            </div>

            {/* Strikes */}
            <p className="font-mono font-semibold text-tm-text mb-3 text-sm">
                {signal.strikes}
            </p>

            {/* Metrics grid */}
            <div className="grid grid-cols-3 gap-2 mb-3 text-sm">
                <div className="bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                    <p className="text-[10px] text-tm-muted uppercase tracking-wide">Quantity</p>
                    <p className="font-mono font-bold">{quantity}x</p>
                </div>
                <div className="bg-tm-green/10 rounded-lg px-3 py-2">
                    <p className="text-[10px] text-tm-muted uppercase tracking-wide">Total Credit</p>
                    <p className="font-mono font-bold text-tm-green">
                        ${totalCredit.toFixed(2)}
                    </p>
                </div>
                <div className="bg-tm-red/10 rounded-lg px-3 py-2">
                    <p className="text-[10px] text-tm-muted uppercase tracking-wide">Max Loss</p>
                    <p className="font-mono font-bold text-tm-red">
                        ${totalMaxLoss.toFixed(2)}
                    </p>
                </div>
            </div>

            {/* Confidence + VIX */}
            <div className="flex items-center justify-between text-xs mb-4">
                <span className={`font-semibold ${confidenceColor}`}>
                    {signal.confidence}% confidence
                </span>
                <span className={`flex items-center gap-1 ${vixColor}`}>
                    <VixIcon className="w-3 h-3" />
                    VIX {(signal.vixLevel ?? 0).toFixed(1)}
                </span>
            </div>

            {/* Action buttons or Status Badge */}
            <div className="mt-2">
                {signal.status === 'EXECUTED' ? (
                    <div className="flex items-center justify-center gap-2 bg-tm-green/20 text-tm-green py-2.5 rounded-xl font-bold text-sm">
                        <span>✓ Executed</span>
                        {displayFillPrice && (
                            <span className="bg-tm-green/20 px-2 py-0.5 rounded">@ ${displayFillPrice.toFixed(2)}</span>
                        )}
                    </div>
                ) : signal.status === 'TRACKED' ? (
                    <div className="flex items-center justify-center gap-2 bg-tm-purple/20 text-tm-purple py-2.5 rounded-xl font-bold text-sm">
                        <span>👁️ Tracking Only</span>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-2">
                        {tastyLinked ? (
                            <button
                                onClick={() => onApproveExecute(signal.id, quantity)}
                                disabled={executing}
                                className="btn-primary text-sm py-2.5 text-center disabled:opacity-50 rounded-xl"
                            >
                                {executing ? 'Executing…' : 'Approve & Execute'}
                            </button>
                        ) : (
                            <div className="flex items-center justify-center gap-1.5 text-[11px] text-tm-muted rounded-xl border border-white/10 px-1 py-1 text-center leading-tight">
                                <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                                <span>Link Tastytrade<br />to execute</span>
                            </div>
                        )}
                        <button
                            onClick={() => onTrackOnly(signal.id)}
                            disabled={executing}
                            className="border border-white/20 hover:border-tm-purple/50 text-sm py-2.5 rounded-xl font-semibold transition-colors disabled:opacity-50"
                        >
                            Track Only
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
