"use client";

import { useCallback, useEffect, useState } from "react";
import { LotActions, lotLabel, type LotInfo } from "@/components/accounts/LotActions";

const input = "w-full bg-black/40 border border-white/15 rounded-md px-2.5 py-1.5 text-[12px] text-white focus:outline-none focus:border-emerald-400/60";

function money(n: number, digits = 0) {
    return `${n < 0 ? '-' : ''}$${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits })}`;
}

/**
 * QQQ calls held by a QQQ LEAPS account, one row per position (lot). Each is
 * checked on its own at 9:45 AM; members can correct a row to match their broker.
 */
export function LotsPanel({ accountId, onChanged }: { accountId: number; onChanged?: () => void }) {
    const [lots, setLots] = useState<LotInfo[]>([]);
    const [maxLots, setMaxLots] = useState(3);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);
    const [form, setForm] = useState({ strike: '', expiry: '', contracts: '1', price: '', entryDate: '' });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            const res = await fetch(`/api/accounts/${accountId}/lots`);
            if (res.ok) {
                const d = await res.json();
                setLots(d.lots || []);
                setMaxLots(d.maxLots || 3);
            }
        } finally {
            setLoading(false);
        }
    }, [accountId]);

    useEffect(() => { load(); }, [load]);

    const changed = () => { load(); onChanged?.(); };
    const open = lots.filter((l) => l.status === 'open');
    const recent = lots.filter((l) => l.status !== 'open').slice(0, 6);

    const add = async () => {
        setBusy(true);
        setError(null);
        try {
            const res = await fetch(`/api/accounts/${accountId}/lots`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    strike: Number(form.strike), expiry: form.expiry, contracts: Number(form.contracts),
                    price: Number(form.price), entryDate: form.entryDate || undefined,
                }),
            });
            const d = await res.json();
            if (!res.ok) { setError(d.error || 'Could not add the position.'); return; }
            setAdding(false);
            setForm({ strike: '', expiry: '', contracts: '1', price: '', entryDate: '' });
            changed();
        } catch {
            setError('Network error. Try again.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-tm-muted uppercase tracking-wider">QQQ Calls ({open.length} of {maxLots})</h2>
                {open.length < maxLots && (
                    <button onClick={() => setAdding((a) => !a)} className="text-[11px] font-bold text-tm-purple hover:text-white transition">
                        {adding ? 'Cancel' : 'Add a call I already hold'}
                    </button>
                )}
            </div>

            {adding && (
                <div className="glass-card p-4 mb-3 space-y-2">
                    <p className="text-[11px] text-tm-muted">
                        Add a QQQ call you already own so the 9:45 AM checks manage it too. Your virtual cash is reduced by the cost, like a purchase.
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                        <input className={input} type="number" step={1} placeholder="Strike" value={form.strike} onChange={(e) => setForm({ ...form, strike: e.target.value })} />
                        <input className={input} type="date" value={form.expiry} onChange={(e) => setForm({ ...form, expiry: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <input className={input} type="number" min={1} step={1} placeholder="Contracts" value={form.contracts} onChange={(e) => setForm({ ...form, contracts: e.target.value })} />
                        <input className={input} type="number" min="0.01" step="0.01" placeholder="Price paid" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                        <input className={input} type="date" value={form.entryDate} onChange={(e) => setForm({ ...form, entryDate: e.target.value })} title="Purchase date (optional)" />
                    </div>
                    {error && <p className="text-[11px] text-tm-red">{error}</p>}
                    <button onClick={add} disabled={busy} className="w-full py-2 rounded-lg bg-emerald-500/90 hover:bg-emerald-500 text-black text-xs font-bold transition disabled:opacity-50">
                        {busy ? 'Adding...' : 'Add position'}
                    </button>
                </div>
            )}

            {loading ? (
                <div className="glass-card p-4 text-xs text-tm-muted animate-pulse">Loading positions...</div>
            ) : open.length === 0 ? (
                <div className="glass-card p-4 text-xs text-tm-muted">No open QQQ calls. The next entry signal opens one.</div>
            ) : (
                <div className="space-y-2">
                    {open.map((l) => {
                        const mark = l.mark ?? null;
                        const pnl = mark != null ? (mark - l.entryPrice) * l.contracts * 100 : null;
                        const pct = mark != null && l.entryPrice > 0 ? ((mark - l.entryPrice) / l.entryPrice) * 100 : null;
                        return (
                            <div key={l.id} className="glass-card p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-[13px] font-semibold text-white">{lotLabel(l)}</p>
                                        <p className="text-[11px] text-tm-muted mt-0.5">
                                            Entered {l.entryDate} at ${l.entryPrice.toFixed(2)}
                                            {l.modelEntryPrice != null && Math.abs(l.modelEntryPrice - l.entryPrice) > 0.004 && ` (model $${l.modelEntryPrice.toFixed(2)})`}
                                            {l.source === 'manual' && ' · added by you'}
                                            {l.adjusted && ' · adjusted by you'}
                                            {l.stillHolding && ' · you are still holding after an exit signal'}
                                        </p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="font-mono text-sm">{mark != null ? `$${mark.toFixed(2)}` : '-'}</p>
                                        {pnl != null && pct != null && (
                                            <p className={`font-mono text-[11px] font-bold ${pnl >= 0 ? 'text-tm-green' : 'text-tm-red'}`}>
                                                {pnl >= 0 ? '+' : ''}{money(pnl)} ({pct >= 0 ? '+' : ''}{pct.toFixed(1)}%)
                                            </p>
                                        )}
                                    </div>
                                </div>
                                {l.canEditEntry && <LotActions lot={l} accountId={accountId} onChanged={changed} />}
                            </div>
                        );
                    })}
                </div>
            )}

            {recent.length > 0 && (
                <div className="mt-4">
                    <h3 className="text-[11px] font-bold text-tm-muted uppercase tracking-wider mb-2">Recently closed</h3>
                    <div className="space-y-2">
                        {recent.map((l) => (
                            <div key={l.id} className="glass-card p-3">
                                <p className="text-[12px] font-semibold text-white">{lotLabel(l)}</p>
                                <p className="text-[11px] text-tm-muted mt-0.5">
                                    {l.status === 'skipped'
                                        ? 'Marked as not bought'
                                        : `Closed ${l.exitDate || ''} at $${(l.exitPrice ?? 0).toFixed(2)}${l.exitReason ? `. ${l.exitReason}` : ''}`}
                                    {l.adjusted && ' · adjusted by you'}
                                </p>
                                {l.canEditExit && <LotActions lot={l} accountId={accountId} onChanged={changed} />}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
