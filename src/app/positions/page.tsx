"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import {
    ArrowLeft,
    RefreshCw,
    Wallet,
    Pencil,
    Trash2,
    PlusCircle,
    WifiOff
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
    isVirtual?: boolean;
    legAction?: string;      // SELL_TO_OPEN | BUY_TO_OPEN etc. (options only)
    signalId?: string;       // for grouping spread legs
}

interface SpreadGroup {
    signalId: string;
    legs: EquityPosition[];
    executedAt?: string;
    limitPrice: number;      // avg_price on the legs (credit/debit per spread)
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

    // Transfer modal state
    const [showTransferModal, setShowTransferModal] = useState<'deposit' | 'withdraw' | null>(null);
    const [transferAmount, setTransferAmount] = useState('');
    const [transferLoading, setTransferLoading] = useState(false);
    const [optionSpreads, setOptionSpreads] = useState<SpreadGroup[]>([]);

    const [showOnboarding, setShowOnboarding] = useState(false);
    const [onboardingAmount, setOnboardingAmount] = useState('');
    const [realizedPnl, setRealizedPnl] = useState<number | null>(null);

    const handleOnboardingSubmit = async () => {
        if (!onboardingAmount) return;
        const diff = parseFloat(onboardingAmount) - 25000;
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
                fetchVirtualPositions();
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
                fetchVirtualPositions();
            } else {
                alert('Transfer failed');
            }
        } catch (e) {
            console.error('Transfer error:', e);
        } finally {
            setTransferLoading(false);
        }
    };

    // ── Edit/Delete/Add position ──────────────────────────────────────────────
    // editPositionModal = null → closed
    // editPositionModal = existing EquityPosition → editing existing
    // editPositionModal = NEW_POSITION sentinel → adding new
    const NEW_POSITION: EquityPosition = { symbol: '', quantity: 0, averageOpenPrice: 0, currentPrice: 0, marketValue: 0, unrealizedPnl: 0, unrealizedPnlPct: 0, instrumentType: 'Equity', isVirtual: true };
    const [editPositionModal, setEditPositionModal] = useState<EquityPosition | null>(null);
    const [editQuantity, setEditQuantity]           = useState('');
    const [editAvgPrice, setEditAvgPrice]           = useState('');
    const [editLoading, setEditLoading]             = useState(false);
    const [editError, setEditError]                 = useState<string | null>(null);
    // add-position form
    const [addSymbol, setAddSymbol] = useState('');

    const openEditModal = (pos: EquityPosition) => {
        setEditPositionModal(pos);
        setEditQuantity(String(pos.quantity));
        setEditAvgPrice(String(pos.averageOpenPrice));
        setEditError(null);
    };

    const openAddModal = () => {
        setEditPositionModal(NEW_POSITION);
        setAddSymbol('');
        setEditQuantity('');
        setEditAvgPrice('');
        setEditError(null);
    };

    const handleSavePosition = async () => {
        if (!editPositionModal) return;
        const isNew = editPositionModal === NEW_POSITION || editPositionModal.symbol === '';
        const sym   = isNew ? addSymbol.trim().toUpperCase() : editPositionModal.symbol;
        if (!sym || !editQuantity || !editAvgPrice) { setEditError('All fields required'); return; }
        setEditLoading(true);
        setEditError(null);
        try {
            const res = await fetch('/api/shadow-positions', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    strategy: activeStrategy,
                    symbol: sym,
                    quantity: parseFloat(editQuantity),
                    avgPrice: parseFloat(editAvgPrice),
                }),
            });
            if (!res.ok) {
                const d = await res.json();
                throw new Error(d.error || 'Failed to save');
            }
            setEditPositionModal(null);
            fetchVirtualPositions();
        } catch (e: any) {
            setEditError(e.message);
        } finally {
            setEditLoading(false);
        }
    };

    const handleDeletePosition = async (sym: string) => {
        if (!confirm(`Remove ${sym} from your shadow ledger?`)) return;
        try {
            await fetch(`/api/shadow-positions?strategy=${activeStrategy}&symbol=${sym}`, { method: 'DELETE' });
            fetchVirtualPositions();
        } catch (e) { console.error('Delete failed', e); }
    };

    // Always fetch from virtual account — never Tastytrade
    const fetchVirtualPositions = useCallback(async () => {
        let virtualBalance = 25000;
        let isDefault = false;
        try {
            const vBalRes = await fetch(`/api/virtual-accounts?strategy=${activeStrategy}`);
            if (vBalRes.ok) {
                const vBalData = await vBalRes.json();
                virtualBalance = Number(vBalData.balance);
                isDefault = vBalData.isDefault;
            }
        } catch (e) { console.error('Virtual balance fetch error', e); }

        // Initial balance state: cash = full virtual balance, positions will adjust it below
        setBalance({
            cashAvailable: virtualBalance,
            buyingPower: virtualBalance,
            netLiquidation: virtualBalance,
        });

        const shadowRes = await fetch(`/api/shadow-positions?strategy=${activeStrategy}`);
        if (shadowRes.ok) {
            const shadowData = await shadowRes.json();
            const shadowEq: EquityPosition[] = (shadowData.positions || []).map((p: any) => ({
                symbol: p.symbol,
                quantity: Number(p.quantity),
                averageOpenPrice: Number(p.avg_price),
                currentPrice: Number(p.avg_price),
                marketValue: Number(p.quantity) * Number(p.avg_price),
                unrealizedPnl: 0,
                unrealizedPnlPct: 0,
                instrumentType: p.instrument_type || 'equity',
                legAction: p.leg_action || undefined,
                signalId: p.signal_id || undefined,
                isVirtual: true,
            }));

            // Separate equity vs options
            const equityRows = shadowEq.filter(p => p.instrumentType === 'equity');
            const optionRows = shadowEq.filter(p => p.instrumentType === 'options');

            // Fetch live quotes for equity only
            if (equityRows.length > 0) {
                try {
                    const symbols = equityRows.map(p => p.symbol).join(',');
                    const qRes = await fetch(`/api/quotes?symbols=${symbols}`);
                    if (qRes.ok) {
                        const livePrices = await qRes.json();
                        equityRows.forEach(p => {
                            const livePrice = livePrices[p.symbol] || p.averageOpenPrice;
                            p.currentPrice = livePrice;
                            p.marketValue = p.quantity * livePrice;
                            p.unrealizedPnl = (livePrice - p.averageOpenPrice) * p.quantity;
                            p.unrealizedPnlPct = p.averageOpenPrice > 0 ? ((livePrice - p.averageOpenPrice) / p.averageOpenPrice) * 100 : 0;
                        });
                    }
                } catch (qErr) {
                    console.warn("Failed to fetch live quotes for virtual positions", qErr);
                }
            }

            // Group options legs into spreads by signal_id
            const spreadMap: Record<string, SpreadGroup> = {};
            for (const leg of optionRows) {
                const key = leg.signalId || 'unsorted';
                if (!spreadMap[key]) {
                    spreadMap[key] = { signalId: key, legs: [], limitPrice: leg.averageOpenPrice };
                }
                spreadMap[key].legs.push(leg);
            }
            setOptionSpreads(Object.values(spreadMap));

            // Total value = virtual cash + equity positions market value
            const positionsValue = equityRows.reduce((acc, p) => acc + p.marketValue, 0);
            setBalance(prev => prev ? { ...prev, netLiquidation: prev.cashAvailable + positionsValue } : null);
            setPositions(equityRows);

            if (isDefault && shadowEq.length === 0) setShowOnboarding(true);
        }

        // Fetch Realized P&L from virtual transactions (FIFO)
        try {
            const pnlRes = await fetch(`/api/virtual-accounts/realized-pnl?strategy=${activeStrategy}`);
            if (pnlRes.ok) {
                const pnlData = await pnlRes.json();
                setRealizedPnl(pnlData.realizedPnl ?? null);
            }
        } catch (e) { console.warn('Failed to fetch realized P&L', e); }
    }, [activeStrategy]);

    const fetchAccountAndPositions = useCallback(async () => {
        try {
            setLoading(true);
            setPositions([]);
            await fetchVirtualPositions();
        } catch (err) {
            console.error('Error fetching positions:', err);
        } finally {
            setLoading(false);
        }
    }, [fetchVirtualPositions]);

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
    const equityPositions = positions.filter(p => p.instrumentType === 'equity');
    const totalValue = equityPositions.reduce((s, p) => s + p.marketValue, 0);
    const totalPnl   = equityPositions.reduce((s, p) => s + p.unrealizedPnl, 0);
    const totalCostBasis = equityPositions.reduce((s, p) => s + p.quantity * p.averageOpenPrice, 0);
    const totalPnlPct = totalCostBasis > 0 ? (totalPnl / totalCostBasis) * 100 : 0;

    return (
        <main className="min-h-screen pb-24 max-w-4xl mx-auto w-full border-x border-white/5 bg-tm-bg shadow-2xl relative">
            {/* Header */}
            <header className="px-6 pt-12 pb-2 flex items-center gap-4">
                <Link href="/dashboard" className="w-10 h-10 rounded-full bg-tm-surface flex items-center justify-center">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div className="flex-1">
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        Positions
                        <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                            <WifiOff className="w-2.5 h-2.5" /> VIRTUAL
                        </span>
                    </h1>
                    <p className="text-sm text-tm-muted">
                        {equityPositions.length} equity · {optionSpreads.length} spread{optionSpreads.length !== 1 ? 's' : ''}
                    </p>
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

            {/* Account Summary */}
            <div className="px-6 mb-6">
                <div className="glass-card p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Wallet className="w-5 h-5 text-tm-purple" />
                        <h3 className="font-bold border-b border-transparent">Account Overview</h3>
                        {/* Deposit / Withdraw — always visible for virtual account */}
                        <div className="ml-auto flex gap-2">
                            <button onClick={() => setShowTransferModal('deposit')} className="text-[10px] bg-green-500/20 text-green-400 px-3 py-1 rounded-full font-bold hover:bg-green-500/30 transition">
                                DEPOSIT
                            </button>
                            <button onClick={() => setShowTransferModal('withdraw')} className="text-[10px] bg-red-500/20 text-red-400 px-3 py-1 rounded-full font-bold hover:bg-red-500/30 transition">
                                WITHDRAW
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-center">
                        <div>
                            <p className="text-[10px] text-tm-muted uppercase tracking-wider font-semibold mb-1">Total Value</p>
                            <p className="text-lg font-bold font-mono text-white">
                                ${(balance?.netLiquidation || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </p>
                        </div>
                        <div>
                            <p className="text-[10px] text-tm-muted uppercase tracking-wider font-semibold mb-1">Cash</p>
                            <p className="text-lg font-bold font-mono text-emerald-400">
                                ${(balance?.cashAvailable || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </p>
                        </div>
                        <div>
                            <p className="text-[10px] text-tm-muted uppercase tracking-wider font-semibold mb-1">Positions Value</p>
                            <p className="text-lg font-bold font-mono text-purple-400">
                                ${((balance?.netLiquidation || 0) - (balance?.cashAvailable || 0)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </p>
                        </div>
                        <div>
                            <p className="text-[10px] text-tm-muted uppercase tracking-wider font-semibold mb-1">Realized P&L</p>
                            {realizedPnl !== null ? (
                                <p className={`text-lg font-bold font-mono ${realizedPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {realizedPnl >= 0 ? '+' : ''}${realizedPnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </p>
                            ) : (
                                <p className="text-lg font-bold font-mono text-tm-muted">--</p>
                            )}
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

            {/* Add / Edit Position Modal */}
            {editPositionModal !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
                    <div className="bg-[#111] border border-white/10 p-5 rounded-xl w-full max-w-sm">
                        {/* Title */}
                        <h3 className="text-lg font-bold mb-1">
                            {editPositionModal.symbol === '' ? 'Add Position' : `Edit ${editPositionModal.symbol}`}
                        </h3>
                        <p className="text-xs text-tm-muted mb-4">
                            {editPositionModal.symbol === ''
                                ? 'Manually record a position in your shadow ledger.'
                                : 'Update quantity or cost basis. Set qty to 0 to remove.'}
                        </p>

                        {/* Symbol (add only) */}
                        {editPositionModal.symbol === '' && (
                            <div className="mb-3">
                                <label className="text-[10px] text-tm-muted uppercase font-bold tracking-wider mb-1 block">Symbol</label>
                                <input
                                    type="text"
                                    value={addSymbol}
                                    onChange={(e) => setAddSymbol(e.target.value.toUpperCase())}
                                    placeholder="e.g. QQQ"
                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-tm-purple font-mono uppercase"
                                />
                            </div>
                        )}

                        {/* Quantity */}
                        <div className="mb-3">
                            <label className="text-[10px] text-tm-muted uppercase font-bold tracking-wider mb-1 block">Quantity (Shares)</label>
                            <input
                                type="number" min="0" step="1"
                                value={editQuantity}
                                onChange={(e) => setEditQuantity(e.target.value)}
                                placeholder="e.g. 23"
                                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-tm-purple font-mono"
                            />
                        </div>

                        {/* Avg Price */}
                        <div className="mb-4">
                            <label className="text-[10px] text-tm-muted uppercase font-bold tracking-wider mb-1 block">Avg Cost / Share ($)</label>
                            <input
                                type="number" min="0" step="0.01"
                                value={editAvgPrice}
                                onChange={(e) => setEditAvgPrice(e.target.value)}
                                placeholder="e.g. 575.82"
                                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-tm-purple font-mono"
                            />
                        </div>

                        {editError && <p className="text-red-400 text-xs mb-3">{editError}</p>}

                        <div className="flex gap-3">
                            <button
                                onClick={() => setEditPositionModal(null)}
                                className="flex-1 py-3 rounded-lg font-bold bg-white/5 hover:bg-white/10 transition"
                            >
                                Cancel
                            </button>
                            {editPositionModal.symbol !== '' && (
                                <button
                                    onClick={() => { setEditPositionModal(null); handleDeletePosition(editPositionModal.symbol); }}
                                    className="px-4 py-3 rounded-lg font-bold bg-red-600/20 text-red-400 hover:bg-red-600/40 transition"
                                    title="Remove position"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                            <button
                                onClick={handleSavePosition}
                                disabled={editLoading}
                                className="flex-1 py-3 rounded-lg font-bold bg-purple-600 hover:bg-purple-500 text-white transition flex items-center justify-center disabled:opacity-50"
                            >
                                {editLoading
                                    ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    : editPositionModal.symbol === '' ? 'Add' : 'Save'
                                }
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Equity Positions Table */}
            <div className="px-6">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-bold text-tm-muted uppercase tracking-wider">Equity Holdings</h2>
                    <button
                        onClick={openAddModal}
                        className="flex items-center gap-1.5 text-xs text-tm-purple hover:text-white transition font-bold"
                    >
                        <PlusCircle className="w-3.5 h-3.5" /> Add Position
                    </button>
                </div>
                <div className="glass-card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[500px]">
                            <thead>
                                <tr className="border-b border-white/5 bg-white/[0.02]">
                                    <th className="px-4 py-3 text-[10px] uppercase font-bold text-tm-muted">Symbol</th>
                                    <th className="px-4 py-3 text-[10px] uppercase font-bold text-tm-muted text-right">Price</th>
                                    <th className="px-4 py-3 text-[10px] uppercase font-bold text-tm-muted text-right">Cost/sh</th>
                                    <th className="px-4 py-3 text-[10px] uppercase font-bold text-tm-muted text-right">Market Value</th>
                                    <th className="px-4 py-3 text-[10px] uppercase font-bold text-tm-muted text-right">Unrealized G/L</th>
                                    <th className="px-4 py-3 text-[10px] uppercase font-bold text-tm-muted text-center w-16"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && equityPositions.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-8 text-center text-tm-muted text-xs animate-pulse">Loading positions...</td>
                                    </tr>
                                ) : equityPositions.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-8 text-center text-tm-muted text-xs">No active equity positions.</td>
                                    </tr>
                                ) : (
                                    equityPositions.map((pos) => {
                                        const isProfit = pos.unrealizedPnl >= 0;
                                        const symbolColors: Record<string, string> = {
                                            'QQQ': 'text-blue-400',
                                            'QLD': 'text-indigo-400',
                                            'TQQQ': 'text-purple-400',
                                            'SGOV': 'text-emerald-400',
                                        };
                                        const color = symbolColors[pos.symbol] || 'text-white';

                                        return (
                                            <tr key={pos.symbol} className="border-b border-white/5 hover:bg-white/[0.02] transition last:border-0">
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`font-bold font-mono ${color}`}>{pos.symbol}</span>
                                                        <span className="text-[10px] text-tm-muted font-mono bg-white/5 px-1.5 py-0.5 rounded">
                                                            x{pos.quantity}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono text-sm">
                                                    ${pos.currentPrice.toFixed(2)}
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono text-sm text-tm-muted">
                                                    ${pos.averageOpenPrice.toFixed(2)}
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono text-sm">
                                                    ${pos.marketValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <p className={`font-mono text-sm font-bold ${isProfit ? 'text-tm-green' : 'text-tm-red'}`}>
                                                        {isProfit ? '+' : ''}${pos.unrealizedPnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                    </p>
                                                    <p className={`font-mono text-[10px] ${isProfit ? 'text-tm-green/70' : 'text-tm-red/70'}`}>
                                                        {isProfit ? '+' : ''}{pos.unrealizedPnlPct.toFixed(2)}%
                                                    </p>
                                                </td>
                                                {/* Edit / Delete actions */}
                                                <td className="px-2 py-3 text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <button
                                                            onClick={() => openEditModal(pos)}
                                                            className="p-1.5 rounded hover:bg-white/10 text-tm-muted hover:text-tm-purple transition"
                                                            title="Edit position"
                                                        >
                                                            <Pencil className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeletePosition(pos.symbol)}
                                                            className="p-1.5 rounded hover:bg-white/10 text-tm-muted hover:text-red-400 transition"
                                                            title="Remove position"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Options Spread Positions */}
            {optionSpreads.length > 0 && (
                <div className="px-6 mt-8 space-y-3">
                    <h2 className="text-sm font-bold text-tm-muted uppercase tracking-wider mb-2 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        Options Spreads · {activeStrategyConfig?.label || activeStrategy}
                    </h2>
                    {optionSpreads.map((spread) => (
                        <SpreadPositionCard key={spread.signalId} spread={spread} />
                    ))}
                </div>
            )}
        </main>
    );
}

function parseOccSymbol(occ: string) {
    const clean = (occ || '').trim();
    if (clean.length < 15) return { underlying: clean, expiry: '', type: '', strike: 0, raw: clean };
    const underlying = clean.slice(0, 6).trim();
    const datePart   = clean.slice(6, 12);          // YYMMDD
    const typeChar   = clean[12];
    const strikePart = clean.slice(13);
    const type   = typeChar === 'C' ? 'Call' : 'Put';
    const strike = parseInt(strikePart || '0') / 1000;
    let expiry = `20${datePart}`;
    try {
        const d = new Date(`20${datePart.slice(0,2)}-${datePart.slice(2,4)}-${datePart.slice(4,6)}T12:00:00Z`);
        expiry = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
    } catch { /* keep raw */ }
    return { underlying, expiry, type, strike, raw: clean };
}

function inferSpreadLabel(legs: EquityPosition[]): { label: string; color: string } {
    const actions = legs.map(l => (l.legAction || '').toUpperCase());
    const hasSell  = actions.some(a => a.includes('SELL'));
    const hasBuy   = actions.some(a => a.includes('BUY'));
    // Single SELL = CSP or naked call
    if (hasSell && !hasBuy) return { label: 'Cash-Secured Put', color: 'emerald' };
    // Both = spread (CCS or PCS)
    if (hasSell && hasBuy) {
        // Check if calls or puts
        const parsed = legs.map(l => parseOccSymbol(l.symbol));
        const isCall = parsed.some(p => p.type === 'Call');
        return isCall
            ? { label: 'Bear Call Spread', color: 'orange' }
            : { label: 'Bull Put Spread',  color: 'blue'   };
    }
    // All BUY = ZEBRA or long spread
    if (hasBuy && !hasSell) return { label: 'Long Spread', color: 'purple' };
    return { label: 'Options Spread', color: 'amber' };
}

const LEG_ACTION_LABEL: Record<string, { short: string; color: string }> = {
    SELL_TO_OPEN:  { short: 'STO', color: 'bg-red-500/20 text-red-400 border-red-500/30'    },
    BUY_TO_OPEN:   { short: 'BTO', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    SELL_TO_CLOSE: { short: 'STC', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
    BUY_TO_CLOSE:  { short: 'BTC', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
};

function SpreadPositionCard({ spread }: { spread: SpreadGroup }) {
    const { label, color } = inferSpreadLabel(spread.legs);
    const colorMap: Record<string, string> = {
        emerald: 'border-emerald-500/20 from-emerald-500/5',
        orange:  'border-orange-500/20  from-orange-500/5',
        blue:    'border-blue-500/20    from-blue-500/5',
        purple:  'border-purple-500/20  from-purple-500/5',
        amber:   'border-amber-500/20   from-amber-500/5',
    };
    const accentMap: Record<string, string> = {
        emerald: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        orange:  'bg-orange-500/20  text-orange-400  border-orange-500/30',
        blue:    'bg-blue-500/20    text-blue-400    border-blue-500/30',
        purple:  'bg-purple-500/20  text-purple-400  border-purple-500/30',
        amber:   'bg-amber-500/20   text-amber-400   border-amber-500/30',
    };
    const cardCls  = colorMap[color] || colorMap.amber;
    const accentCls = accentMap[color] || accentMap.amber;

    // Derive spread header info from first leg
    const firstLeg = spread.legs[0];
    const parsed0  = firstLeg ? parseOccSymbol(firstLeg.symbol) : null;
    const contracts = firstLeg?.quantity ?? 1;
    const creditOrDebit = spread.limitPrice > 0 ? `$${spread.limitPrice.toFixed(2)}/contract` : null;

    return (
        <div className={`glass-card p-5 border bg-gradient-to-br to-transparent ${cardCls}`}>
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center border text-sm font-bold ${accentCls}`}>
                        {spread.legs.length}L
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-base">{parsed0?.underlying || '—'} · {label}</h3>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${accentCls}`}>
                                {spread.legs.length} LEG{spread.legs.length !== 1 ? 'S' : ''}
                            </span>
                        </div>
                        <p className="text-xs text-tm-muted">
                            {contracts} contract{contracts !== 1 ? 's' : ''}
                            {creditOrDebit ? ` · ${creditOrDebit}` : ''}
                            {parsed0?.expiry ? ` · Exp ${parsed0.expiry}` : ''}
                        </p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-[10px] text-tm-muted uppercase font-semibold tracking-wider">Max P/L</p>
                    <p className="font-mono text-sm font-bold text-tm-muted">—</p>
                </div>
            </div>

            {/* Legs */}
            <div className="space-y-2">
                {spread.legs.map((leg, i) => {
                    const p   = parseOccSymbol(leg.symbol);
                    const act = (leg.legAction || '').toUpperCase();
                    const badge = LEG_ACTION_LABEL[act] || { short: act.slice(0,3), color: 'bg-white/10 text-white border-white/20' };
                    return (
                        <div key={leg.symbol || i}
                            className="flex items-center justify-between bg-black/40 rounded-lg px-3 py-2.5 border border-white/5">
                            <div className="flex items-center gap-2.5">
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${badge.color}`}>
                                    {badge.short}
                                </span>
                                <div>
                                    <p className="font-mono text-sm font-semibold">
                                        {p.underlying} ${p.strike} {p.type}
                                    </p>
                                    <p className="text-[10px] text-tm-muted font-mono">
                                        {leg.symbol.trim()} · {p.expiry}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-mono text-sm font-bold">×{leg.quantity}</p>
                                {leg.averageOpenPrice > 0 && (
                                    <p className="text-[10px] text-tm-muted font-mono">${leg.averageOpenPrice.toFixed(2)}</p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
