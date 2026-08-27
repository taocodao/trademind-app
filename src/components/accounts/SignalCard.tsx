"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, CheckCircle2, ChevronDown, Undo2, Zap } from "lucide-react";
import { parseOptionContract } from "@/lib/universal-order";

export interface SignalOrder {
    activityId: number;
    type: 'buy' | 'sell';
    symbol: string | null;
    quantity: number;
    price: number | null;
    instrumentType: string;
    note: string | null;
}

export interface SignalRow {
    signalId: string;
    accountStatus: string;
    receivedAt: string;
    publishedAt: string | null;
    confirmedAt: string | null;
    fills: { activityId: number; sysPrice: number; userPrice: number }[] | null;
    fillNote: string | null;
    orders: SignalOrder[];
    strategy: string | null;
    symbol: string | null;
    action: string | null;
    summary: string | null;
    regime: string | null;
}

const BROKER_PREF_KEY = 'tm_broker_pref';

function guideTypeFor(orders: SignalOrder[]): string {
    const opts = orders.filter((o) => o.instrumentType === 'option');
    if (opts.length === 0) return 'etf';
    const hasBuy = opts.some((o) => o.type === 'buy');
    const hasSell = opts.some((o) => o.type === 'sell');
    if (hasBuy && hasSell) return 'roll';
    if (hasSell) return 'pmcc';
    return 'leaps';
}

function describeOrder(o: SignalOrder): { action: string; contract: string } {
    const isOption = o.instrumentType === 'option';
    const parsed = o.symbol ? parseOptionContract(o.symbol) : null;
    const contract = parsed
        ? `${parsed.underlying} $${parsed.strike} ${parsed.right === 'call' ? 'Call' : 'Put'} exp ${parsed.expiry}`
        : (o.symbol || '').toUpperCase();
    // The ledger only stores buy/sell; the instruction note carries open/close
    // wording when it was an option order.
    let action = o.type === 'buy' ? (isOption ? 'Buy to Open' : 'Buy') : (isOption ? 'Sell to Open' : 'Sell');
    if (o.note) {
        const m = /(Buy to Open|Sell to Open|Buy to Close|Sell to Close)/i.exec(o.note);
        if (m) action = m[1].replace(/\b\w/g, (c) => c.toUpperCase());
    }
    return { action, contract };
}

function formatPrice(p: number | null): string {
    return p == null ? 'market' : `$${p.toFixed(2)}`;
}

/**
 * One signal card: timestamped, order blocks, help-guide link, and the fill
 * confirmation flow (report broker prices so the virtual account re-prices
 * to the member's actual fill).
 */
export function SignalCard({
    signal,
    accountId,
    highlighted,
    onChanged,
}: {
    signal: SignalRow;
    accountId: number;
    highlighted?: boolean;
    onChanged?: () => void;
}) {
    const [open, setOpen] = useState(false);
    const [prices, setPrices] = useState<Record<number, string>>({});
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const when = signal.publishedAt || signal.receivedAt;
    const dateStr = when ? new Date(when).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';
    const confirmed = !!signal.confirmedAt;
    const executable = signal.accountStatus === 'executed' && signal.orders.length > 0;
    const fillByActivity = new Map((signal.fills || []).map((f) => [f.activityId, f]));
    const guideType = guideTypeFor(signal.orders);
    const broker = typeof window !== 'undefined' ? (localStorage.getItem(BROKER_PREF_KEY) || '') : '';
    const guideHref = `/help/enter-orders?type=${guideType}${broker ? `&broker=${encodeURIComponent(broker)}` : ''}`;

    const confirm = async () => {
        setError(null);
        const fills = signal.orders
            .map((o) => ({ activityId: o.activityId, price: Number(prices[o.activityId] ?? o.price) }))
            .filter((f) => isFinite(f.price) && f.price > 0);
        if (fills.length === 0) { setError('Enter at least one fill price.'); return; }
        // Deviation guard: confirm once more when far from the model price.
        for (const f of fills) {
            const o = signal.orders.find((x) => x.activityId === f.activityId);
            if (o?.price && Math.abs(f.price - o.price) / o.price > 0.2) {
                const ok = window.confirm(`$${f.price.toFixed(2)} is more than 20% from the model price of $${o.price.toFixed(2)}. Use your fill anyway?`);
                if (!ok) return;
            }
        }
        setBusy(true);
        try {
            const res = await fetch(`/api/accounts/${accountId}/signals/${encodeURIComponent(signal.signalId)}/fill`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fills, note: note || undefined }),
            });
            const d = await res.json();
            if (!res.ok) { setError(d.error || 'Could not record the fill.'); return; }
            setOpen(false);
            onChanged?.();
        } catch {
            setError('Network error. Try again.');
        } finally {
            setBusy(false);
        }
    };

    const undo = async () => {
        if (!window.confirm('Undo this fill report? Your orders return to the model prices.')) return;
        setBusy(true);
        try {
            await fetch(`/api/accounts/${accountId}/signals/${encodeURIComponent(signal.signalId)}/fill`, { method: 'DELETE' });
            onChanged?.();
        } finally {
            setBusy(false);
        }
    };

    return (
        <div
            id={`signal-${signal.signalId}`}
            className={`glass-card p-4 transition-shadow ${highlighted ? 'ring-2 ring-tm-purple' : ''}`}
        >
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0">
                    <Zap className="w-4 h-4 text-tm-purple shrink-0" />
                    <span className="font-bold text-sm text-white truncate">{signal.summary || signal.action || 'Signal'}</span>
                    {signal.regime && <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-white/5 text-tm-muted border border-white/10 shrink-0">{signal.regime}</span>}
                </div>
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border capitalize shrink-0 ml-2 ${
                    confirmed
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : executable
                            ? 'bg-amber-500/10 text-amber-300 border-amber-500/25'
                            : 'bg-white/5 text-tm-muted border-white/10'
                }`}>
                    {confirmed ? 'Fill reported' : executable ? 'Awaiting your fill' : signal.accountStatus}
                </span>
            </div>
            <p className="text-[10px] text-tm-muted mb-3">{dateStr}</p>

            {/* Order blocks */}
            {signal.orders.length > 0 && (
                <div className="space-y-2 mb-3">
                    {signal.orders.map((o) => {
                        const d = describeOrder(o);
                        const fill = fillByActivity.get(o.activityId);
                        const mult = o.instrumentType === 'option' ? 100 : 1;
                        return (
                            <div key={o.activityId} className="rounded-lg bg-white/[0.04] border border-white/10 px-3 py-2.5">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="text-[13px] font-semibold text-white leading-snug">
                                            {d.action} {o.quantity} {d.contract}
                                        </p>
                                        <p className="text-[11px] text-tm-muted mt-0.5">
                                            Limit {formatPrice(fill?.sysPrice ?? o.price)}
                                            {' · '}${(o.quantity * (fill?.sysPrice ?? o.price ?? 0) * mult).toLocaleString('en-US', { maximumFractionDigits: 0 })} est.
                                            {o.instrumentType === 'option' ? ' per contract' : ''}
                                        </p>
                                        {fill && (
                                            <p className="text-[11px] text-emerald-400 mt-0.5">
                                                Your fill ${fill.userPrice.toFixed(2)} ({fill.userPrice >= fill.sysPrice ? '+' : ''}{(fill.userPrice - fill.sysPrice).toFixed(2)} vs model)
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Help + confirm actions */}
            <div className="flex items-center gap-2 flex-wrap">
                {executable && (
                    <Link
                        href={guideHref}
                        className="inline-flex items-center gap-1.5 text-[11px] font-bold text-tm-purple hover:text-white transition border border-tm-purple/30 hover:border-white/40 rounded-lg px-2.5 py-1.5"
                    >
                        <BookOpen className="w-3.5 h-3.5" /> How to enter this order
                    </Link>
                )}
                {executable && !confirmed && (
                    <button
                        onClick={() => setOpen((o) => !o)}
                        className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-300 hover:text-white transition border border-emerald-500/30 hover:border-white/40 rounded-lg px-2.5 py-1.5"
                    >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Report your fill
                        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
                    </button>
                )}
                {confirmed && (
                    <button
                        onClick={undo}
                        disabled={busy}
                        className="inline-flex items-center gap-1 text-[10px] font-semibold text-tm-muted hover:text-white transition"
                    >
                        <Undo2 className="w-3 h-3" /> Undo fill report
                    </button>
                )}
            </div>

            {/* Inline fill form */}
            {open && !confirmed && (
                <div className="mt-3 rounded-lg border border-emerald-500/25 bg-emerald-500/[0.05] p-3">
                    <p className="text-[11px] text-tm-muted mb-2">
                        Enter the price your broker actually filled. Your virtual account re-prices to your fill.
                    </p>
                    <div className="space-y-2">
                        {signal.orders.map((o) => {
                            const d = describeOrder(o);
                            return (
                                <div key={o.activityId} className="flex items-center gap-2">
                                    <span className="text-[11px] text-white/80 flex-1 min-w-0 truncate">{d.action} {d.contract}</span>
                                    <div className="relative w-24 shrink-0">
                                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-tm-muted">$</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0.01"
                                            defaultValue={o.price?.toFixed(2) ?? ''}
                                            onChange={(e) => setPrices((p) => ({ ...p, [o.activityId]: e.target.value }))}
                                            className="w-full bg-black/40 border border-white/15 rounded-md pl-5 pr-2 py-1.5 text-[12px] text-white focus:outline-none focus:border-emerald-400/60"
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <input
                        type="text"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Note (optional, e.g. filled mid-day)"
                        className="mt-2 w-full bg-black/40 border border-white/15 rounded-md px-2.5 py-1.5 text-[12px] text-white focus:outline-none focus:border-emerald-400/60"
                    />
                    {error && <p className="mt-2 text-[11px] text-tm-red">{error}</p>}
                    <button
                        onClick={confirm}
                        disabled={busy}
                        className="mt-3 w-full py-2 rounded-lg bg-emerald-500/90 hover:bg-emerald-500 text-black text-xs font-bold transition disabled:opacity-50"
                    >
                        {busy ? 'Recording...' : 'Confirm my fill'}
                    </button>
                </div>
            )}
        </div>
    );
}
