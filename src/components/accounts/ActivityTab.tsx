"use client";

import { useEffect, useState, useCallback } from "react";
import { PlusCircle, Pencil, Trash2, RefreshCw, ArrowUpRight, ArrowDownRight, ArrowDownToLine, ArrowUpFromLine, ExternalLink } from "lucide-react";
import { BrokerEntryModal } from "./BrokerEntryModal";
import type { BrokerOrder } from "@/lib/brokers";

type ActivityType = 'buy' | 'sell' | 'deposit' | 'withdraw';

interface Activity {
    id: number;
    account_id: number;
    type: ActivityType;
    symbol: string | null;
    quantity: number | null;
    price: number | null;
    amount: number;
    signal_id: string | null;
    source: 'signal' | 'manual';
    note: string | null;
    created_at: string;
}

const TYPE_META: Record<ActivityType, { label: string; color: string; Icon: any }> = {
    buy:      { label: 'Buy',      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', Icon: ArrowUpRight },
    sell:     { label: 'Sell',     color: 'text-red-400 bg-red-500/10 border-red-500/20', Icon: ArrowDownRight },
    deposit:  { label: 'Deposit',  color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', Icon: ArrowDownToLine },
    withdraw: { label: 'Withdraw', color: 'text-orange-400 bg-orange-500/10 border-orange-500/20', Icon: ArrowUpFromLine },
};

export function ActivityTab({ accountId, broker, onChanged }: { accountId: number; broker?: string; onChanged?: () => void }) {
    const [activities, setActivities] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);

    // add/edit modal
    const [modal, setModal] = useState<null | { mode: 'add' } | { mode: 'edit'; activity: Activity }>(null);
    const [brokerOrder, setBrokerOrder] = useState<BrokerOrder | null>(null);
    const [type, setType] = useState<ActivityType>('buy');
    const [symbol, setSymbol] = useState('');
    const [quantity, setQuantity] = useState('');
    const [price, setPrice] = useState('');
    const [note, setNote] = useState('');
    const [error, setError] = useState<string | null>(null);

    const fetchActivities = useCallback(async () => {
        try {
            const res = await fetch(`/api/accounts/${accountId}/activities?limit=200`);
            if (res.ok) {
                const d = await res.json();
                setActivities(d.activities || []);
            }
        } catch (e) {
            console.error('[ActivityTab] fetch failed', e);
        } finally {
            setLoading(false);
        }
    }, [accountId]);

    useEffect(() => { fetchActivities(); }, [fetchActivities]);

    const openAdd = () => {
        setModal({ mode: 'add' });
        setType('buy'); setSymbol(''); setQuantity(''); setPrice(''); setNote(''); setError(null);
    };
    const openEdit = (a: Activity) => {
        setModal({ mode: 'edit', activity: a });
        setType(a.type);
        setSymbol(a.symbol || '');
        setQuantity(a.quantity != null ? String(a.quantity) : '');
        setPrice(a.price != null ? String(a.price) : '');
        setNote(a.note || '');
        setError(null);
    };

    const isTrade = type === 'buy' || type === 'sell';

    const handleSubmit = async () => {
        setError(null);
        const qty = parseFloat(quantity);
        const px = parseFloat(price);
        if (isTrade) {
            if (!symbol.trim()) { setError('Symbol required'); return; }
            if (!isFinite(qty) || qty <= 0) { setError('Quantity must be positive'); return; }
            if (!isFinite(px) || px < 0) { setError('Price must be non-negative'); return; }
        } else {
            if (!isFinite(qty) || qty <= 0) { setError('Amount must be positive'); return; }
        }
        setBusy(true);
        try {
            if (modal?.mode === 'add') {
                const res = await fetch(`/api/accounts/${accountId}/activities`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type,
                        symbol: isTrade ? symbol.trim().toUpperCase() : undefined,
                        quantity: qty,
                        price: isTrade ? px : undefined,
                        note: note || undefined,
                    }),
                });
                if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
            } else if (modal?.mode === 'edit') {
                const res = await fetch(`/api/accounts/${accountId}/activities/${modal.activity.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type,
                        symbol: isTrade ? symbol.trim().toUpperCase() : null,
                        quantity: qty,
                        price: isTrade ? px : null,
                        note: note || null,
                    }),
                });
                if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
            }
            setModal(null);
            await fetchActivities();
            onChanged?.();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    };

    const handleDelete = async (a: Activity) => {
        const label = isTradeLabel(a);
        if (!confirm(`Delete this ${label}? The account cash and position will be adjusted to reverse it.`)) return;
        setBusy(true);
        try {
            await fetch(`/api/accounts/${accountId}/activities/${a.id}`, { method: 'DELETE' });
            await fetchActivities();
            onChanged?.();
        } finally {
            setBusy(false);
        }
    };

    const isTradeLabel = (a: Activity) => (a.type === 'buy' || a.type === 'sell' ? `${a.type} of ${a.symbol}` : a.type);

    return (
        <div>
            <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-tm-muted uppercase tracking-wider">Activity</h2>
                <div className="flex items-center gap-2">
                    <button onClick={fetchActivities} className="p-1.5 rounded hover:bg-white/10 text-tm-muted hover:text-white transition" title="Refresh">
                        <RefreshCw className="w-4 h-4" />
                    </button>
                    <button onClick={openAdd} className="flex items-center gap-1.5 text-xs text-tm-purple hover:text-white transition font-bold">
                        <PlusCircle className="w-3.5 h-3.5" /> Add Activity
                    </button>
                </div>
            </div>

            <div className="glass-card overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-tm-muted text-xs animate-pulse">Loading activity...</div>
                ) : activities.length === 0 ? (
                    <div className="p-8 text-center text-tm-muted text-xs">No activity yet. Signal executions and manual entries will appear here.</div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {activities.map((a) => {
                            const meta = TYPE_META[a.type];
                            const isTradeRow = a.type === 'buy' || a.type === 'sell';
                            return (
                                <div key={a.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition">
                                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center border ${meta.color}`}>
                                        <meta.Icon className="w-4 h-4" />
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-sm">{meta.label}</span>
                                            {isTradeRow && <span className="font-mono text-sm text-white">{a.symbol}</span>}
                                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${a.source === 'signal' ? 'bg-tm-purple/10 text-tm-purple border-tm-purple/20' : 'bg-white/5 text-tm-muted border-white/10'}`}>
                                                {a.source === 'signal' ? 'SIGNAL' : 'MANUAL'}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-tm-muted font-mono truncate">
                                            {isTradeRow
                                                ? `${a.quantity} @ $${(a.price ?? 0).toFixed(2)}`
                                                : `$${a.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
                                            {a.note ? ` · ${a.note}` : ''}
                                        </p>
                                    </div>
                                    <div className="text-right mr-2">
                                        <p className={`font-mono text-sm font-bold ${a.type === 'buy' || a.type === 'withdraw' ? 'text-tm-red' : 'text-tm-green'}`}>
                                            {a.type === 'buy' || a.type === 'withdraw' ? '-' : '+'}${a.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                        </p>
                                        <p className="text-[10px] text-tm-muted">{new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {isTradeRow && a.symbol && a.quantity != null && (
                                            <button
                                                onClick={() => setBrokerOrder({ symbol: a.symbol!, action: a.type as 'buy' | 'sell', quantity: a.quantity!, price: a.price })}
                                                className="p-1.5 rounded hover:bg-white/10 text-tm-muted hover:text-tm-purple transition"
                                                title="Enter at Broker"
                                            >
                                                <ExternalLink className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                        <button onClick={() => openEdit(a)} className="p-1.5 rounded hover:bg-white/10 text-tm-muted hover:text-tm-purple transition" title="Edit">
                                            <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={() => handleDelete(a)} className="p-1.5 rounded hover:bg-white/10 text-tm-muted hover:text-red-400 transition" title="Delete">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Add / Edit modal */}
            {modal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
                    <div className="bg-[#111] border border-white/10 p-5 rounded-xl w-full max-w-sm">
                        <h3 className="text-lg font-bold mb-1">{modal.mode === 'add' ? 'Add Activity' : 'Edit Activity'}</h3>
                        <p className="text-xs text-tm-muted mb-4">
                            {modal.mode === 'add'
                                ? 'Record a trade or cash movement to match your real account.'
                                : 'Adjust this entry. Cash and position will be recalculated.'}
                        </p>

                        {/* Type */}
                        <label className="text-[10px] text-tm-muted uppercase font-bold tracking-wider mb-1 block">Type</label>
                        <div className="grid grid-cols-4 gap-2 mb-4">
                            {(['buy', 'sell', 'deposit', 'withdraw'] as ActivityType[]).map((t) => (
                                <button
                                    key={t}
                                    onClick={() => setType(t)}
                                    className={`py-2 rounded-lg text-[11px] font-bold border capitalize transition ${type === t ? 'bg-tm-purple/20 border-tm-purple text-white' : 'bg-white/5 border-white/10 text-tm-muted hover:text-white'}`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>

                        {isTrade && (
                            <>
                                <label className="text-[10px] text-tm-muted uppercase font-bold tracking-wider mb-1 block">Symbol</label>
                                <input
                                    type="text" value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                                    placeholder="e.g. QQQ"
                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-white font-mono uppercase focus:outline-none focus:border-tm-purple mb-3"
                                />
                            </>
                        )}

                        <label className="text-[10px] text-tm-muted uppercase font-bold tracking-wider mb-1 block">
                            {isTrade ? 'Quantity (shares)' : 'Amount ($)'}
                        </label>
                        <input
                            type="number" min="0" step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)}
                            placeholder={isTrade ? 'e.g. 10' : 'e.g. 5000'}
                            className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-white font-mono focus:outline-none focus:border-tm-purple mb-3"
                        />

                        {isTrade && (
                            <>
                                <label className="text-[10px] text-tm-muted uppercase font-bold tracking-wider mb-1 block">Price / share ($)</label>
                                <input
                                    type="number" min="0" step="any" value={price} onChange={(e) => setPrice(e.target.value)}
                                    placeholder="e.g. 575.82"
                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-white font-mono focus:outline-none focus:border-tm-purple mb-3"
                                />
                            </>
                        )}

                        <label className="text-[10px] text-tm-muted uppercase font-bold tracking-wider mb-1 block">Note (optional)</label>
                        <input
                            type="text" value={note} onChange={(e) => setNote(e.target.value)}
                            placeholder="e.g. filled at a different price"
                            className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-tm-purple mb-4"
                        />

                        {error && <p className="text-red-400 text-xs mb-3">{error}</p>}

                        <div className="flex gap-3">
                            <button onClick={() => setModal(null)} className="flex-1 py-3 rounded-lg font-bold bg-white/5 hover:bg-white/10 transition">Cancel</button>
                            <button
                                onClick={handleSubmit} disabled={busy}
                                className="flex-1 py-3 rounded-lg font-bold bg-tm-purple hover:bg-tm-purple/90 text-white transition disabled:opacity-50 flex items-center justify-center"
                            >
                                {busy ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (modal.mode === 'add' ? 'Add' : 'Save')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Enter-at-Broker guided modal */}
            {brokerOrder && (
                <BrokerEntryModal order={brokerOrder} accountBroker={broker} onClose={() => setBrokerOrder(null)} />
            )}
        </div>
    );
}
