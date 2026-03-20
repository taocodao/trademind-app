"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import {
    ArrowLeft,
    TrendingUp,
    RefreshCw,
    Wallet,
    BarChart3,
    Edit2,
    Wifi,
    WifiOff
} from "lucide-react";
import Link from "next/link";
import { useStrategyContext } from "@/components/providers/StrategyContext";
import { StrategyTabs } from "@/components/ui/StrategyTabs";
import { getStrategy } from "@/lib/strategies";
import { useSettings } from "@/components/providers/SettingsProvider";

interface EquityPosition {
    symbol: string;
    quantity: number;
    averageOpenPrice: number;
    currentPrice: number;
    marketValue: number;
    unrealizedPnl: number;
    unrealizedPnlPct: number;
    instrumentType: string;
    isVirtual?: boolean;
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
    const [balance, setBalance] = useState<AccountBalance | null>(null);
    const [isLive, setIsLive] = useState(false);
    const { settings } = useSettings();
    
    // Transfer modal state
    const [showTransferModal, setShowTransferModal] = useState<'deposit' | 'withdraw' | null>(null);
    const [transferAmount, setTransferAmount] = useState('');
    const [transferLoading, setTransferLoading] = useState(false);

    const [showOnboarding, setShowOnboarding] = useState(false);
    const [onboardingAmount, setOnboardingAmount] = useState('');

    const handleOnboardingSubmit = async () => {
        if (!onboardingAmount) return;
        const diff = parseFloat(onboardingAmount) - 100000;
        const action = diff > 0 ? 'deposit' : 'withdraw';
        const absoluteAmount = Math.abs(diff);

        if (absoluteAmount === 0) {
           setShowOnboarding(false);
           return;
        }

        try {
            const res = await fetch('/api/virtual-accounts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ strategy: activeStrategy, action, amount: absoluteAmount })
            });
            if (res.ok) {
                setShowOnboarding(false);
                fetchAccountAndPositions();
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleTransfer = async () => {
        if (!showTransferModal || !transferAmount) return;
        setTransferLoading(true);
        try {
            const res = await fetch('/api/virtual-accounts', {
                method: 'POST',
                body: JSON.stringify({
                    strategy: activeStrategy,
                    action: showTransferModal,
                    amount: parseFloat(transferAmount)
                }),
                headers: { 'Content-Type': 'application/json' }
            });
            if (res.ok) {
                setShowTransferModal(null);
                setTransferAmount('');
                fetchAccountAndPositions();
            } else {
                alert('Transfer failed');
            }
        } catch (e) {
            console.error('Transfer error:', e);
        } finally {
            setTransferLoading(false);
        }
    };

    // Edit Position modal state
    const [editPositionModal, setEditPositionModal] = useState<EquityPosition | null>(null);
    const [editQuantity, setEditQuantity] = useState('');
    const [editLoading, setEditLoading] = useState(false);

    const handleEditPosition = async () => {
        if (!editPositionModal || !editQuantity) return;
        setEditLoading(true);

        try {
            const newQty = parseInt(editQuantity, 10);
            if (isNaN(newQty) || newQty < 0) throw new Error("Invalid quantity");

            const currentQty = editPositionModal.quantity;
            const diff = newQty - currentQty;
            
            if (diff === 0) {
                setEditPositionModal(null);
                setEditQuantity('');
                return;
            }

            const action = diff > 0 ? 'buy' : 'sell';
            const absDiff = Math.abs(diff);
            
            // Dummy signal ID for manual adjustments to bypass idempotency logic but still track it
            const manualSignalId = `manual_adj_${Date.now()}`;

            const res = await fetch('/api/virtual-accounts/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    signalId: manualSignalId,
                    strategy: activeStrategy,
                    orders: [{
                        symbol: editPositionModal.symbol,
                        quantity: absDiff,
                        price: editPositionModal.currentPrice, // Using the loaded price as a proxy
                        action: action
                    }]
                })
            });

            if (res.ok) {
                setEditPositionModal(null);
                setEditQuantity('');
                fetchAccountAndPositions();
            } else {
                const errData = await res.json();
                alert(`Edit failed: ${errData.error || errData.message}`);
            }
        } catch (e) {
            console.error('Position Edit Error:', e);
            alert('Failed to edit position.');
        } finally {
            setEditLoading(false);
        }
    };

    const fetchAccountAndPositions = useCallback(async () => {
        try {
            setLoading(true);
            setPositions([]);

            const hasTastytrade = !!(settings?.tastytrade?.refreshToken);

            if (hasTastytrade) {
                // ── LIVE PATH: Fetch from Tastytrade ────────────────────────
                setIsLive(true);
                // account number lives in accounts[0]['account-number'] as returned by Tastytrade OAuth
                const accountNumber = (settings?.tastytrade?.accounts?.[0] as any)?.['account-number']
                    || (settings?.tastytrade?.accounts?.[0] as any)?.account_number
                    || '';
                
                try {
                    // Fetch real positions
                    const posRes = await fetch(`/api/tastytrade/positions?accountNumber=${accountNumber}`);
                    if (posRes.ok) {
                        const posData = await posRes.json();
                        const items = posData?.data?.items || [];
                        const livePositions: EquityPosition[] = items
                            .filter((p: any) => p.quantity !== 0)
                            .map((p: any) => {
                                const qty = Number(p.quantity);
                                const avgPrice = Number(p['average-open-price'] || p.average_open_price || 0);
                                const closePrice = Number(p['close-price'] || p.close_price || avgPrice);
                                const marketVal = qty * closePrice;
                                const unrealizedPnl = (closePrice - avgPrice) * qty;
                                const costBasis = avgPrice * qty;
                                const unrealizedPct = costBasis > 0 ? (unrealizedPnl / costBasis) * 100 : 0;
                                return {
                                    symbol: p.symbol,
                                    quantity: qty,
                                    averageOpenPrice: avgPrice,
                                    currentPrice: closePrice,
                                    marketValue: marketVal,
                                    unrealizedPnl,
                                    unrealizedPnlPct: unrealizedPct,
                                    instrumentType: p['instrument-type'] || 'Equity',
                                    isVirtual: false,
                                };
                            });
                        setPositions(livePositions);
                        
                        // Set balance from positions data (TT doesn't have separate balance endpoint yet)
                        const totalMarketValue = livePositions.reduce((s, p) => s + p.marketValue, 0);
                        setBalance({
                            cashAvailable: 0, // Will update below if balance endpoint is added
                            buyingPower: 0,
                            netLiquidation: totalMarketValue,
                        });
                        
                        // Also try to get cash balance
                        try {
                            const balRes = await fetch(`/api/tastytrade/balances?accountNumber=${accountNumber}`);
                            if (balRes.ok) {
                                const balData = await balRes.json();
                                const bd = balData?.data || {};
                                const cash = Number(bd['cash-balance'] || bd.cash_balance || 0);
                                const net = Number(bd['net-liquidating-value'] || bd.net_liquidating_value || totalMarketValue);
                                const buying = Number(bd['derivative-buying-power'] || bd.buying_power || cash);
                                setBalance({ cashAvailable: cash, buyingPower: buying, netLiquidation: net });
                            }
                        } catch (_) { /* balance endpoint optional */ }
                    } else {
                        throw new Error('TT positions fetch failed');
                    }
                } catch (ttErr) {
                    console.warn('Live TT data failed, falling back to virtual:', ttErr);
                    setIsLive(false);
                    await fetchVirtualPositions();
                }
            } else {
                // ── VIRTUAL PATH ─────────────────────────────────────────────
                setIsLive(false);
                await fetchVirtualPositions();
            }
        } catch (err) {
            console.error('Error fetching positions:', err);
        } finally {
            setLoading(false);
        }
    }, [activeStrategy, settings?.tastytrade?.refreshToken]);

    const fetchVirtualPositions = useCallback(async () => {
        let virtualBalance = 100000;
        let isDefault = false;
        try {
            const vBalRes = await fetch(`/api/virtual-accounts?strategy=${activeStrategy}`);
            if (vBalRes.ok) {
                const vBalData = await vBalRes.json();
                virtualBalance = Number(vBalData.balance);
                isDefault = vBalData.isDefault;
            }
        } catch (e) { console.error('Virtual balance fetch error', e); }

        setBalance({
            cashAvailable: virtualBalance,
            buyingPower: virtualBalance,
            netLiquidation: virtualBalance,
        });

        const shadowRes = await fetch(`/api/shadow-positions?strategy=${activeStrategy}`);
        if (shadowRes.ok) {
            const shadowData = await shadowRes.json();
            const shadowEq: EquityPosition[] = (shadowData.positions || []).map((p: any) => {
                const qty = Number(p.quantity);
                const avgPrice = Number(p.avg_price);
                const marketVal = qty * avgPrice;
                return {
                    symbol: p.symbol,
                    quantity: qty,
                    averageOpenPrice: avgPrice,
                    currentPrice: avgPrice,
                    marketValue: marketVal,
                    unrealizedPnl: 0,
                    unrealizedPnlPct: 0,
                    instrumentType: 'Equity',
                    isVirtual: true,
                };
            });

            const positionsValue = shadowEq.reduce((acc, p) => acc + p.marketValue, 0);
            setBalance(prev => prev ? { ...prev, netLiquidation: prev.cashAvailable + positionsValue } : null);
            setPositions(shadowEq);

            if (isDefault && shadowEq.length === 0) setShowOnboarding(true);
        }
    }, [activeStrategy]);

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

    // Positions are already isolated per strategy natively in the database.
    const filteredPositions = positions;

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
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        Positions
                        {isLive ? (
                            <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                <Wifi className="w-2.5 h-2.5" /> LIVE
                            </span>
                        ) : (
                            <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                <WifiOff className="w-2.5 h-2.5" /> VIRTUAL
                            </span>
                        )}
                    </h1>
                    <p className="text-sm text-tm-muted">{filteredPositions.length} equity position{filteredPositions.length !== 1 ? 's' : ''}</p>
                </div>
                <button onClick={fetchAccountAndPositions} className="w-10 h-10 rounded-full bg-tm-surface flex items-center justify-center text-tm-muted hover:text-white transition">
                    <RefreshCw className="w-4 h-4" />
                </button>
            </header>


            {/* Strategy tabs */}
            <div className="px-6 mb-6">
                <StrategyTabs
                    strategies={enabledStrategies}
                    activeKey={activeStrategy}
                    onChange={setActiveStrategy}
                    showAll={false}
                />
            </div>

            {/* Account Summary — always visible */}
            <div className="px-6 mb-6">
                <div className="glass-card p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Wallet className="w-5 h-5 text-tm-purple" />
                        <h3 className="font-bold">Account Overview</h3>
                        {!isLive && (
                            <div className="ml-auto flex gap-2">
                                <button onClick={() => setShowTransferModal('deposit')} className="text-[10px] bg-green-500/20 text-green-400 px-3 py-1 rounded-full font-bold hover:bg-green-500/30 transition">
                                    DEPOSIT
                                </button>
                                <button onClick={() => setShowTransferModal('withdraw')} className="text-[10px] bg-red-500/20 text-red-400 px-3 py-1 rounded-full font-bold hover:bg-red-500/30 transition">
                                    WITHDRAW
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                            <p className="text-xs text-tm-muted">Total Value</p>
                            <p className="text-lg font-bold font-mono text-tm-green">
                                ${(balance?.netLiquidation || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-tm-muted">Positions Value</p>
                            <p className="text-lg font-bold font-mono text-tm-purple">
                                ${((balance?.netLiquidation || 0) - (balance?.cashAvailable || 0)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-tm-muted">Cash Balance</p>
                            <p className="text-lg font-bold font-mono">
                                ${(balance?.cashAvailable || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Transfer Modal */}
            {showTransferModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
                    <div className="bg-[#111] border border-white/10 p-5 rounded-xl w-full max-w-sm">
                        <h3 className="text-lg font-bold mb-4 capitalize">{showTransferModal} Virtual Cash</h3>
                        <p className="text-xs text-tm-muted mb-4">
                            {showTransferModal === 'deposit' ? 'Add' : 'Remove'} virtual funds for the {activeStrategyConfig?.label || activeStrategy} ledger.
                        </p>
                        <input
                            type="number"
                            min="1"
                            step="1"
                            value={transferAmount}
                            onChange={(e) => setTransferAmount(e.target.value)}
                            placeholder="Amount ($)"
                            className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-tm-purple mb-4 font-mono"
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowTransferModal(null)}
                                className="flex-1 py-3 rounded-lg font-bold bg-white/5 hover:bg-white/10 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleTransfer}
                                disabled={transferLoading || !transferAmount || parseFloat(transferAmount) <= 0}
                                className={`flex-1 py-3 rounded-lg font-bold transition flex items-center justify-center
                                    ${showTransferModal === 'deposit' 
                                        ? 'bg-green-600 hover:bg-green-500 text-white' 
                                        : 'bg-red-600 hover:bg-red-500 text-white'
                                    } disabled:opacity-50`}
                            >
                                {transferLoading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    'Confirm'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Onboarding Modal */}
            {showOnboarding && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
                    <div className="bg-[#111] border border-white/10 p-6 rounded-2xl w-full max-w-sm">
                        <div className="w-12 h-12 rounded-full bg-tm-purple/20 flex items-center justify-center mb-4 mx-auto">
                            <Wallet className="w-6 h-6 text-tm-purple" />
                        </div>
                        <h3 className="text-lg font-bold text-center mb-2">Set Your Starting Capital</h3>
                        <p className="text-xs text-tm-muted text-center mb-6 leading-relaxed">
                            Enter the amount you're starting with. This initializes your virtual portfolio 
                            to mirror real position sizing from TurboCore signals.
                        </p>
                        <input
                            type="number"
                            min="1000"
                            step="1000"
                            value={onboardingAmount}
                            onChange={(e) => setOnboardingAmount(e.target.value)}
                            placeholder="e.g. 25000"
                            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-lg font-mono focus:outline-none focus:border-tm-purple mb-4"
                            autoFocus
                        />
                        <button
                            onClick={handleOnboardingSubmit}
                            disabled={!onboardingAmount || parseFloat(onboardingAmount) < 1000}
                            className="w-full py-3 rounded-xl font-bold bg-tm-purple hover:bg-tm-purple/90 text-white transition disabled:opacity-50"
                        >
                            Start Tracking
                        </button>
                    </div>
                </div>
            )}

            {/* Edit Position Modal */}
            {editPositionModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
                    <div className="bg-[#111] border border-white/10 p-5 rounded-xl w-full max-w-sm">
                        <h3 className="text-lg font-bold mb-4">Edit {editPositionModal.symbol}</h3>
                        <p className="text-xs text-tm-muted mb-4">
                            Adjust virtual position quantity. Cash balance will automatically update using the last price (${editPositionModal.currentPrice.toFixed(2)}). Set to 0 to close.
                        </p>
                        <div className="mb-4">
                            <label className="text-[10px] text-tm-muted uppercase font-bold tracking-wider mb-1 block">New Target Quantity (Shares)</label>
                            <input
                                type="number"
                                min="0"
                                step="1"
                                value={editQuantity}
                                onChange={(e) => setEditQuantity(e.target.value)}
                                placeholder={`Current: ${editPositionModal.quantity}`}
                                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-tm-purple font-mono"
                            />
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setEditPositionModal(null); setEditQuantity(''); }}
                                className="flex-1 py-3 rounded-lg font-bold bg-white/5 hover:bg-white/10 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleEditPosition}
                                disabled={editLoading || editQuantity === ''}
                                className="flex-1 py-3 rounded-lg font-bold bg-purple-600 hover:bg-purple-500 text-white transition flex items-center justify-center disabled:opacity-50"
                            >
                                {editLoading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    'Update'
                                )}
                            </button>
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
                    filteredPositions.map((pos) => (
                        <div key={pos.symbol} className="glass-card p-4 hover:bg-white/5 transition relative">
                            {pos.isVirtual && (
                                <div className="absolute -top-2 -right-2 rotate-12 text-[9px] bg-blue-500 text-white font-bold px-1.5 py-0.5 rounded opacity-80 backdrop-blur-md">
                                    VIRTUAL
                                </div>
                            )}
                            <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-3"></div>
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
                        <div key={pos.symbol} className="relative group">
                            <EquityCard position={pos} totalValue={totalValue} />
                            <button
                                onClick={() => {
                                    setEditPositionModal(pos);
                                    setEditQuantity(pos.quantity.toString());
                                }}
                                className="absolute top-4 right-4 p-2 bg-black/50 border border-white/10 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/10 hover:text-tm-purple backdrop-blur-md z-10"
                                title="Edit target quantity"
                            >
                                <Edit2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))
                )}
            </div>

            {/* Account Details Footer */}
            <div className="px-6 mt-6">
                <div className="glass-card p-5 text-sm text-tm-muted text-center border border-white/5">
                    <p>Virtual portfolio initialized with <span className="text-white font-bold font-mono">${balance?.cashAvailable?.toLocaleString()}</span></p>
                    <p className="mt-1 text-xs opacity-60">Use Deposit/Withdraw above to adjust virtual cash.</p>
                </div>
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
