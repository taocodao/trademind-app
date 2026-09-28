"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, Pencil, Trash2 } from "lucide-react";
import { BROKERS } from "@/components/help/orderEntryData";

export interface AccountSettings {
    id: number;
    name: string;
    risk_level: RiskLevel;
    broker?: string | null;
}

const BROKER_PREF_KEY = 'tm_broker_pref';
type RiskLevel = 'conservative' | 'moderate' | 'aggressive';

/**
 * Account settings tab: rename, broker preference
 * (used to preselect order-entry help), and delete. Membership/billing banner
 * is rendered above this by the console page.
 */
export function AccountTab({ account, onChanged }: { account: AccountSettings; onChanged: () => void }) {
    const router = useRouter();
    const [name, setName] = useState(account.name);
    const [broker, setBroker] = useState('');
    const [busy, setBusy] = useState(false);
    const [saved, setSaved] = useState<string | null>(null);

    useEffect(() => {
        setName(account.name);
        // Server value roams across devices; localStorage covers same-device fast path.
        const local = typeof window !== 'undefined' ? (localStorage.getItem(BROKER_PREF_KEY) || '') : '';
        setBroker(account.broker || local);
    }, [account.id, account.name, account.broker]);

    const [cashAmount, setCashAmount] = useState('');
    const [cashError, setCashError] = useState<string | null>(null);

    const doCash = async (action: 'deposit' | 'withdraw') => {
        const amount = parseFloat(cashAmount);
        if (!isFinite(amount) || amount <= 0) { setCashError('Enter an amount greater than zero'); return; }
        if (action === 'withdraw' && !window.confirm(`Withdraw $${amount.toFixed(2)} from this account's virtual cash?`)) return;
        setBusy(true); setCashError(null);
        try {
            const res = await fetch(`/api/accounts/${account.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cashAction: action, cashAmount: amount }),
            });
            const data = await res.json();
            if (!res.ok) { setCashError(data.error || 'Unable to update cash'); return; }
            setCashAmount('');
            flash(action === 'deposit' ? `Deposited $${amount.toFixed(2)}` : `Withdrew $${amount.toFixed(2)}`);
            onChanged();
        } finally { setBusy(false); }
    };

    const flash = (msg: string) => {
        setSaved(msg);
        setTimeout(() => setSaved(null), 2500);
    };

    const patch = async (body: Record<string, unknown>, flashMsg: string) => {
        setBusy(true);
        try {
            const res = await fetch(`/api/accounts/${account.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (res.ok) { flash(flashMsg); onChanged(); }
        } finally {
            setBusy(false);
        }
    };

    const remove = async () => {
        if (!window.confirm(`Delete "${account.name}"? Its positions and activity history will be removed.`)) return;
        setBusy(true);
        try {
            const res = await fetch(`/api/accounts/${account.id}`, { method: 'DELETE' });
            if (res.ok) router.push('/accounts');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Deposit / withdraw virtual cash */}
            <div className="glass-card p-5">
                <label className="text-xs font-bold uppercase tracking-wider text-tm-muted">Deposit / withdraw cash</label>
                <p className="text-[11px] text-tm-muted mt-1 mb-3">Changes the virtual cash balance of this account only. No real money moves.</p>
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-tm-muted text-sm">$</span>
                        <input
                            value={cashAmount}
                            onChange={(e) => setCashAmount(e.target.value)}
                            inputMode="decimal"
                            placeholder="1000.00"
                            className="w-full bg-black/40 border border-white/15 rounded-lg pl-7 pr-3 py-2 text-sm text-white focus:outline-none focus:border-tm-purple/60"
                        />
                    </div>
                    <button
                        onClick={() => doCash('deposit')}
                        disabled={busy}
                        className="px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 text-xs font-bold transition disabled:opacity-40"
                    >Deposit</button>
                    <button
                        onClick={() => doCash('withdraw')}
                        disabled={busy}
                        className="px-4 py-2 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 text-xs font-bold transition disabled:opacity-40"
                    >Withdraw</button>
                </div>
                {cashError && <p className="text-[11px] text-tm-red mt-2">{cashError}</p>}
            </div>

            {/* Rename */}
            <div className="glass-card p-5">
                <label className="text-xs font-bold uppercase tracking-wider text-tm-muted">Account name</label>
                <div className="flex gap-2 mt-2">
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        maxLength={60}
                        className="flex-1 bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-tm-purple/60"
                    />
                    <button
                        onClick={() => patch({ name }, 'Name saved')}
                        disabled={busy || !name.trim() || name.trim() === account.name}
                        className="px-4 py-2 rounded-lg bg-tm-purple hover:bg-tm-purple/90 text-white text-xs font-bold transition disabled:opacity-40"
                    >
                        <Pencil className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Broker preference */}
            <div className="glass-card p-5">
                <label className="text-xs font-bold uppercase tracking-wider text-tm-muted">Your broker</label>
                <p className="text-[11px] text-tm-muted mt-1 mb-3">
                    Used to preselect the right walkthrough when a signal links to the order-entry guide.
                </p>
                <select
                    value={broker}
                    onChange={(e) => {
                        const v = e.target.value;
                        setBroker(v);
                        if (typeof window !== 'undefined') {
                            if (v) localStorage.setItem(BROKER_PREF_KEY, v);
                            else localStorage.removeItem(BROKER_PREF_KEY);
                        }
                        if (v) patch({ broker: v }, 'Broker preference saved');
                    }}
                    className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-tm-purple/60"
                >
                    <option value="">Choose your broker</option>
                    {BROKERS.map((b) => (
                        <option key={b.key} value={b.key}>{b.name}</option>
                    ))}
                </select>
                <Link
                    href={`/help/enter-orders${broker ? `?broker=${broker}` : ''}`}
                    className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold text-tm-purple hover:text-white transition"
                >
                    <BookOpen className="w-3.5 h-3.5" /> Open the order-entry guide
                </Link>
            </div>

            {/* Danger zone */}
            <div className="glass-card p-5 border-tm-red/20">
                <label className="text-xs font-bold uppercase tracking-wider text-tm-muted">Delete account</label>
                <p className="text-[11px] text-tm-muted mt-1 mb-3">
                    Removes this account, its positions, and its activity history. Active memberships are cancelled.
                </p>
                <button
                    onClick={remove}
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-tm-red/40 text-tm-red text-xs font-bold hover:bg-tm-red/10 transition disabled:opacity-40"
                >
                    <Trash2 className="w-3.5 h-3.5" /> Delete this account
                </button>
            </div>

            {saved && (
                <div className="fixed left-1/2 -translate-x-1/2 bottom-36 z-50 bg-emerald-500 text-black text-xs font-bold px-4 py-2 rounded-full shadow-xl">
                    {saved}
                </div>
            )}
        </div>
    );
}
