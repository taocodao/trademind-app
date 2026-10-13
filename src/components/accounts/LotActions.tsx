"use client";

import { useState } from "react";

export interface LotInfo {
    id: number;
    symbol: string;
    underlying: string;
    strike: number;
    expiry: string;
    contracts: number;
    status: 'open' | 'closed' | 'expired' | 'skipped';
    source: 'signal' | 'manual';
    entryDate: string;
    entryPrice: number;
    modelEntryPrice: number | null;
    exitDate: string | null;
    exitPrice: number | null;
    modelExitPrice: number | null;
    exitReason: string | null;
    stillHolding: boolean;
    adjusted: boolean;
    memberNote: string | null;
    mark?: number | null;
    markAsOf?: string | null;
    canEditEntry?: boolean;
    canEditExit?: boolean;
    role?: 'entry' | 'exit';
}

type Mode = null | 'partial' | 'different' | 'price' | 'sold';

const input = "w-full bg-black/40 border border-white/15 rounded-md px-2.5 py-1.5 text-[12px] text-white focus:outline-none focus:border-emerald-400/60";
const chip = "text-[11px] font-semibold text-tm-muted hover:text-white border border-white/10 hover:border-white/30 rounded-lg px-2.5 py-1.5 transition";

export function lotLabel(l: Pick<LotInfo, 'underlying' | 'strike' | 'expiry' | 'contracts'>): string {
    return `${l.contracts} ${l.underlying} $${l.strike} Call exp ${l.expiry}`;
}

/**
 * Adjustment actions for one QQQ call position: lets a member make their
 * virtual account match what really happened at their broker. Only this
 * account changes; the public track record always uses the model.
 */
export function LotActions({
    lot,
    accountId,
    onChanged,
}: {
    lot: LotInfo;
    accountId: number;
    onChanged?: () => void;
}) {
    const [mode, setMode] = useState<Mode>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [contracts, setContracts] = useState('');
    const [price, setPrice] = useState('');
    const [strike, setStrike] = useState(String(lot.strike));
    const [expiry, setExpiry] = useState(lot.expiry);

    const send = async (body: Record<string, unknown>) => {
        setBusy(true);
        setError(null);
        try {
            const res = await fetch(`/api/accounts/${accountId}/lots/${lot.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const d = await res.json();
            if (!res.ok) { setError(d.error || 'Could not save the change.'); return; }
            setMode(null);
            onChanged?.();
        } catch {
            setError('Network error. Try again.');
        } finally {
            setBusy(false);
        }
    };

    // On a signal card, show actions only for the part of the story this card is about.
    if ((lot.role === 'entry' && lot.status !== 'open' && lot.status !== 'skipped') || (lot.role === 'exit' && lot.status !== 'closed')) return null;
    const canEntry = lot.status === 'open' && lot.canEditEntry;
    const canExit = lot.status === 'closed' && lot.canEditExit;
    if (!canEntry && !canExit) {
        return (
            <p className="text-[10px] text-tm-muted mt-2">
                {lot.status === 'skipped' ? 'Marked as not bought.' : 'Changes are locked for this position.'}
            </p>
        );
    }

    return (
        <div className="mt-2">
            <div className="flex flex-wrap gap-1.5">
                {canEntry && (
                    <>
                        <button className={chip} onClick={() => setMode(mode === 'price' ? null : 'price')}>Price I paid</button>
                        {lot.contracts > 1 && (
                            <button className={chip} onClick={() => setMode(mode === 'partial' ? null : 'partial')}>I bought fewer</button>
                        )}
                        <button className={chip} onClick={() => setMode(mode === 'different' ? null : 'different')}>Different contract</button>
                        <button
                            className={chip}
                            disabled={busy}
                            onClick={() => {
                                if (window.confirm('Remove this position and give the cash back? Use this when you did not place the order.')) send({ action: 'skip' });
                            }}
                        >
                            I did not buy it
                        </button>
                    </>
                )}
                {canExit && (
                    <>
                        <button className={chip} onClick={() => setMode(mode === 'sold' ? null : 'sold')}>Price I sold at</button>
                        <button
                            className={chip}
                            disabled={busy}
                            onClick={() => {
                                if (window.confirm('Keep this position open? The exit is removed and the next 9:45 AM check reviews it again.')) send({ action: 'still_holding' });
                            }}
                        >
                            I am still holding
                        </button>
                    </>
                )}
            </div>

            {mode && (
                <div className="mt-2 rounded-lg border border-white/10 bg-white/[0.03] p-3 space-y-2">
                    {mode === 'partial' && (
                        <>
                            <p className="text-[11px] text-tm-muted">How many contracts did you actually buy? The unused cash returns to your virtual account.</p>
                            <input className={input} type="number" min={1} max={lot.contracts - 1} step={1} placeholder={`1 to ${lot.contracts - 1}`} value={contracts} onChange={(e) => setContracts(e.target.value)} />
                            <input className={input} type="number" min="0.01" step="0.01" placeholder="Price per contract (optional)" value={price} onChange={(e) => setPrice(e.target.value)} />
                        </>
                    )}
                    {mode === 'price' && (
                        <>
                            <p className="text-[11px] text-tm-muted">The price per contract your broker filled (the model price was ${(lot.modelEntryPrice ?? lot.entryPrice).toFixed(2)}).</p>
                            <input className={input} type="number" min="0.01" step="0.01" placeholder="Fill price" value={price} onChange={(e) => setPrice(e.target.value)} />
                        </>
                    )}
                    {mode === 'sold' && (
                        <>
                            <p className="text-[11px] text-tm-muted">The price per contract you sold at (the model price was ${(lot.modelExitPrice ?? lot.exitPrice ?? 0).toFixed(2)}).</p>
                            <input className={input} type="number" min="0.01" step="0.01" placeholder="Sale price" value={price} onChange={(e) => setPrice(e.target.value)} />
                        </>
                    )}
                    {mode === 'different' && (
                        <>
                            <p className="text-[11px] text-tm-muted">Enter the QQQ call you bought instead. The 9:45 AM exit checks then follow this contract.</p>
                            <div className="grid grid-cols-2 gap-2">
                                <input className={input} type="number" step={1} placeholder="Strike" value={strike} onChange={(e) => setStrike(e.target.value)} />
                                <input className={input} type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <input className={input} type="number" min="0.01" step="0.01" placeholder="Price paid" value={price} onChange={(e) => setPrice(e.target.value)} />
                                <input className={input} type="number" min={1} max={lot.contracts} step={1} placeholder={`Contracts (up to ${lot.contracts})`} value={contracts} onChange={(e) => setContracts(e.target.value)} />
                            </div>
                        </>
                    )}
                    {error && <p className="text-[11px] text-tm-red">{error}</p>}
                    <button
                        disabled={busy}
                        onClick={() => {
                            if (mode === 'partial') send({ action: 'partial', contracts: Number(contracts), price: price || undefined });
                            else if (mode === 'price') send({ action: 'reprice', price: Number(price) });
                            else if (mode === 'sold') send({ action: 'sold_at', price: Number(price) });
                            else send({ action: 'different_contract', strike: Number(strike), expiry, price: Number(price), contracts: contracts || undefined });
                        }}
                        className="w-full py-2 rounded-lg bg-emerald-500/90 hover:bg-emerald-500 text-black text-xs font-bold transition disabled:opacity-50"
                    >
                        {busy ? 'Saving...' : 'Save change'}
                    </button>
                </div>
            )}
            {!mode && error && <p className="mt-1 text-[11px] text-tm-red">{error}</p>}
        </div>
    );
}
