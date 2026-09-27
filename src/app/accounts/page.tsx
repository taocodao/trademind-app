"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
    ArrowLeft, Wallet, Pencil, Trash2, RefreshCw, ChevronRight, CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { useAccountContext } from "@/components/providers/AccountContext";
import { getStrategy } from "@/lib/strategies";

/** Annual prices per plan (display only; source of truth is Stripe). */
const PLAN_PRICE: Record<string, number> = { basic: 252, leaps: 336 };

function membershipBadge(m?: { status: string; free_month_ends_at: string | null; current_period_end: string | null; cancel_at_period_end: boolean } | null) {
    if (!m) return null;
    const fmt = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    switch (m.status) {
        case 'free_month': {
            const days = m.free_month_ends_at ? Math.max(0, Math.ceil((new Date(m.free_month_ends_at).getTime() - Date.now()) / 86400000)) : 0;
            return { text: `Free month - ${days} day${days !== 1 ? 's' : ''} left`, cls: 'bg-purple-500/15 text-purple-300 border-purple-500/30' };
        }
        case 'awaiting_payment':
            return { text: 'Payment due', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30' };
        case 'active':
            return {
                text: m.cancel_at_period_end && m.current_period_end
                    ? `Ends ${fmt(m.current_period_end)}`
                    : m.current_period_end ? `Active - renews ${fmt(m.current_period_end)}` : 'Active',
                cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
            };
        case 'past_due':
            return { text: 'Payment failed', cls: 'bg-red-500/15 text-red-300 border-red-500/30' };
        case 'canceled':
            return { text: m.current_period_end ? `Canceled - access to ${fmt(m.current_period_end)}` : 'Canceled', cls: 'bg-white/10 text-tm-muted border-white/15' };
        case 'expired':
            return { text: 'Expired', cls: 'bg-white/10 text-tm-muted border-white/15' };
        default:
            return null;
    }
}

interface AccountSummary {
    nlv: number;
    cash: number;
    positionsValue: number;
    initialPrincipal: number;
    cumulativePnl: number;
    cumulativePnlPct: number;
    positionCount: number;
    phase?: string;
    phaseCap?: number;
}

export default function AccountsPage() {
    return (
        <Suspense fallback={<main className="min-h-screen bg-tm-bg" />}>
            <AccountsPageInner />
        </Suspense>
    );
}

function AccountsPageInner() {
    const { ready, authenticated, user } = usePrivy();
    const router = useRouter();
    const { accounts, loading, refreshAccounts, setActiveAccountId } = useAccountContext();

    const [summaries, setSummaries] = useState<Record<number, AccountSummary>>({});
    const [renameId, setRenameId] = useState<number | null>(null);
    const [renameValue, setRenameValue] = useState('');
    const [cashAmount, setCashAmount] = useState('');
    const [cashError, setCashError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (ready && !authenticated) router.push("/");
    }, [ready, authenticated, router]);

    // Smart-default landing: with exactly one account, open it straight away.
    // ?list=1 is the escape hatch so the list (and Create Account) stays
    // reachable from the account workspace back link and Manage Accounts.
    const searchParams = useSearchParams();
    const forceList = searchParams?.get('list') === '1';
    const checkoutSuccess = searchParams?.get('checkout') === 'success';

    // Just paid: Stripe redirects here the moment checkout closes, but the
    // webhook that creates the account can lag a few seconds behind. Poll
    // until the account appears, then open it directly.
    const [provisionWaited, setProvisionWaited] = useState(0);
    useEffect(() => {
        if (!checkoutSuccess || !ready || !authenticated) return;
        if (accounts.length > 0) return;
        if (provisionWaited >= 30) return; // give up polling; empty state shows a support path
        const timer = setTimeout(() => {
            setProvisionWaited((w) => w + 2);
            void refreshAccounts();
        }, 2000);
        return () => clearTimeout(timer);
    }, [checkoutSuccess, ready, authenticated, accounts.length, provisionWaited, refreshAccounts]);

    useEffect(() => {
        if (forceList || loading || !ready || !authenticated) return;
        if (accounts.length === 1) {
            router.replace(`/account/${accounts[0].id}`);
        }
    }, [forceList, loading, ready, authenticated, accounts, router]);



    // Load a summary per account
    useEffect(() => {
        let cancelled = false;
        async function load() {
            const map: Record<number, AccountSummary> = {};
            await Promise.all(accounts.map(async (a) => {
                try {
                    const res = await fetch(`/api/accounts/${a.id}/summary`);
                    if (res.ok) {
                        const d = await res.json();
                        map[a.id] = {
                            nlv: d.nlv, cash: d.cash, positionsValue: d.positionsValue,
                            initialPrincipal: d.initialPrincipal, cumulativePnl: d.cumulativePnl,
                            cumulativePnlPct: d.cumulativePnlPct, positionCount: d.positionCount,
                            phase: d.phase, phaseCap: d.phaseCap,
                        };
                    }
                } catch { /* ignore */ }
            }));
            if (!cancelled) setSummaries(map);
        }
        if (accounts.length > 0) load();
        return () => { cancelled = true; };
    }, [accounts]);

    // Accounts are created automatically at checkout (one QQQ Basic and/or one
    // QQQ LEAPS per login). To add a plan, subscribe from the pricing section.

    const handleRename = async () => {
        if (renameId === null || !renameValue.trim()) return;
        setBusy(true);
        try {
            const body: Record<string, unknown> = { name: renameValue.trim() };
            await fetch(`/api/accounts/${renameId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            setRenameId(null); setRenameValue(''); setCashAmount(''); setCashError(null);
            await refreshAccounts();
            window.location.reload();
        } finally { setBusy(false); }
    };

    const handleCash = async (action: 'deposit' | 'withdraw') => {
        if (renameId === null) return;
        const amount = parseFloat(cashAmount);
        if (!isFinite(amount) || amount <= 0) { setCashError('Enter an amount greater than zero'); return; }
        setBusy(true); setCashError(null);
        try {
            const res = await fetch(`/api/accounts/${renameId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cashAction: action, cashAmount: amount }),
            });
            const data = await res.json();
            if (!res.ok) { setCashError(data.error || 'Unable to update cash'); return; }
            setCashAmount('');
            await refreshAccounts();
            window.location.reload();
        } finally { setBusy(false); }
    };

    const handleDelete = async (id: number, acctName: string) => {
        if (!confirm(`Delete account "${acctName}"? Its positions and activity ledger will be removed.`)) return;
        setBusy(true);
        try {
            await fetch(`/api/accounts/${id}`, { method: 'DELETE' });
            await refreshAccounts();
        } finally { setBusy(false); }
    };

    const openAccount = (id: number) => {
        setActiveAccountId(id);
        router.push(`/account/${id}`);
    };

    if (!ready || !authenticated) {
        return (
            <main className="min-h-screen flex items-center justify-center">
                <div className="animate-pulse"><div className="w-12 h-12 rounded-full bg-tm-purple/30" /></div>
            </main>
        );
    }

    return (
        <main className="min-h-screen pb-24 max-w-4xl mx-auto w-full border-x border-white/5 bg-tm-bg shadow-2xl relative">
            {/* Header */}
            <header className="px-6 pt-12 pb-4 flex items-center gap-4">
                <Link href="/accounts" className="w-10 h-10 rounded-full bg-tm-surface flex items-center justify-center">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div className="flex-1">
                    <h1 className="text-xl font-bold">Accounts</h1>
                    <p className="text-sm text-tm-muted">{accounts.length} virtual account{accounts.length !== 1 ? 's' : ''}</p>
                </div>
                <button onClick={refreshAccounts} className="w-10 h-10 rounded-full bg-tm-surface flex items-center justify-center text-tm-muted hover:text-white transition">
                    <RefreshCw className="w-4 h-4" />
                </button>
            </header>

            <div className="px-6 mb-4 grid grid-cols-2 gap-3">
                {!accounts.some((a) => a.membership?.plan === 'basic') && (
                    <Link
                        href="/upgrade?plan=basic"
                        className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold border border-[#4f8ef7]/50 text-white transition hover:bg-[#4f8ef7]/10"
                    >
                        Start QQQ Basic - $252/yr
                    </Link>
                )}
                {!accounts.some((a) => a.membership?.plan === 'leaps') && (
                    <Link
                        href="/upgrade?plan=leaps"
                        className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold bg-tm-purple hover:bg-tm-purple/90 text-white transition"
                    >
                        Start QQQ LEAPS - $336/yr
                    </Link>
                )}
            </div>

            {/* Account list */}
            <div className="px-6 space-y-3">
                {loading && accounts.length === 0 ? (
                    <div className="glass-card p-8 text-center text-tm-muted text-sm animate-pulse">Loading accounts...</div>
                ) : accounts.length === 0 && checkoutSuccess && provisionWaited < 30 ? (
                    <div className="glass-card p-8 text-center">
                        <CheckCircle2 className="w-8 h-8 text-tm-green mx-auto mb-3" />
                        <p className="text-sm font-bold text-white">Payment received</p>
                        <p className="text-sm text-tm-muted mt-1 animate-pulse">Setting up your virtual account, this takes a few seconds...</p>
                    </div>
                ) : accounts.length === 0 ? (
                    <div className="glass-card p-8 text-center">
                        <Wallet className="w-8 h-8 text-tm-muted mx-auto mb-3" />
                        <p className="text-sm text-tm-muted">No accounts yet. Subscribe to a plan above and your virtual account is created automatically.</p>
                        {checkoutSuccess && (
                            <p className="text-xs text-tm-muted mt-2">
                                Payment went through but the account is still not here. Contact{' '}
                                <a href="mailto:support@trademind.bot" className="text-tm-purple">support@trademind.bot</a> and we will finish the setup.
                            </p>
                        )}
                    </div>
                ) : (
                    accounts.map((a) => {
                        const s = summaries[a.id];
                        const cfg = getStrategy(a.strategy);
                        const pnl = s?.cumulativePnl ?? 0;
                        const pnlPos = pnl >= 0;
                        return (
                            <div key={a.id} className="glass-card p-5">
                                <div className="flex items-start justify-between">
                                    <button onClick={() => openAccount(a.id)} className="flex-1 text-left">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-bold text-base">{a.name}</h3>
                                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${cfg?.color || 'bg-white/10 text-white border-white/20'}`}>
                                                {cfg?.shortLabel || a.strategy}
                                            </span>
                                            <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-white/5 text-tm-muted border border-white/10 capitalize">
                                                {a.risk_level}
                                            </span>
                                            {(() => {
                                                const b = membershipBadge(a.membership);
                                                return b ? (
                                                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${b.cls}`}>
                                                        {b.text}
                                                    </span>
                                                ) : null;
                                            })()}
                                            {s?.phase && (
                                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${
                                                    s.phase === 'TARGET' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' :
                                                    s.phase === 'GROWTH' ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' :
                                                    'bg-purple-500/15 text-purple-400 border-purple-500/30'
                                                }`}>
                                                    {s.phase}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-tm-muted">
                                            {s ? `${s.positionCount} position${s.positionCount !== 1 ? 's' : ''} · Principal $${s.initialPrincipal.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : 'Loading...'}
                                        </p>
                                    </button>
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => { setRenameId(a.id); setRenameValue(a.name); setCashAmount(''); setCashError(null); }} className="p-1.5 rounded hover:bg-white/10 text-tm-muted hover:text-tm-purple transition" title="Edit">
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleDelete(a.id, a.name)} className="p-1.5 rounded hover:bg-white/10 text-tm-muted hover:text-red-400 transition" title="Delete">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {a.membership && (a.membership.status === 'awaiting_payment' || a.membership.status === 'expired' || a.membership.status === 'past_due') && (
                                    <button
                                        onClick={async () => {
                                            setBusy(true);
                                            try {
                                                const res = await fetch('/api/stripe/checkout', {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ accountId: a.id }),
                                                });
                                                const d = await res.json();
                                                if (d.url) window.location.href = d.url;
                                            } finally { setBusy(false); }
                                        }}
                                        className="w-full mt-4 py-2.5 rounded-lg font-bold bg-tm-purple hover:bg-tm-purple/90 text-white text-sm transition"
                                    >
                                        {a.membership.status === 'past_due' ? 'Update payment' : `Subscribe - $${PLAN_PRICE[a.membership.plan] ?? ''}/yr`}
                                    </button>
                                )}

                                {s && (
                                    <button onClick={() => openAccount(a.id)} className="w-full mt-4 flex items-center justify-between">
                                        <div className="flex gap-6">
                                            <div>
                                                <p className="text-[10px] text-tm-muted uppercase font-semibold tracking-wider">Total Value</p>
                                                <p className="text-base font-bold font-mono text-white">${s.nlv.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-tm-muted uppercase font-semibold tracking-wider">Cash</p>
                                                <p className="text-base font-bold font-mono text-emerald-400">${s.cash.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-tm-muted uppercase font-semibold tracking-wider">P&L</p>
                                                <p className={`text-base font-bold font-mono ${pnlPos ? 'text-tm-green' : 'text-tm-red'}`}>
                                                    {pnlPos ? '+' : ''}${pnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                </p>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-tm-muted" />
                                    </button>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Rename modal */}
            {renameId !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
                    <div className="bg-[#111] border border-white/10 p-6 rounded-2xl w-full max-w-sm">
                        <h3 className="text-lg font-bold mb-4">Edit Account</h3>
                        <label className="text-[10px] text-tm-muted uppercase font-bold tracking-wider mb-1 block">Name</label>
                        <input
                            type="text" value={renameValue} onChange={(e) => setRenameValue(e.target.value)}
                            className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-tm-purple mb-4"
                            autoFocus
                        />
                        <label className="text-[10px] text-tm-muted uppercase font-bold tracking-wider mb-1 block">Deposit / Withdraw Cash ($)</label>
                        <input
                            type="number" min="1" step="100" value={cashAmount} onChange={(e) => setCashAmount(e.target.value)}
                            placeholder="Amount, e.g. 5000"
                            className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white font-mono focus:outline-none focus:border-tm-purple mb-2"
                        />
                        <div className="flex gap-2 mb-1">
                            <button onClick={() => void handleCash('deposit')} disabled={busy} className="flex-1 py-2.5 rounded-lg font-bold bg-tm-green/20 text-tm-green hover:bg-tm-green/30 transition disabled:opacity-50">Deposit</button>
                            <button onClick={() => void handleCash('withdraw')} disabled={busy} className="flex-1 py-2.5 rounded-lg font-bold bg-red-500/20 text-red-300 hover:bg-red-500/30 transition disabled:opacity-50">Withdraw</button>
                        </div>
                        {cashError && <p className="text-[10px] text-red-400 mb-2">{cashError}</p>}
                        <p className="text-[10px] text-tm-muted mb-4">Adds or removes virtual cash and adjusts starting capital so your return tracking stays honest.</p>
                        <div className="flex gap-3">
                            <button onClick={() => { setRenameId(null); setCashAmount(''); setCashError(null); }} className="flex-1 py-3 rounded-lg font-bold bg-white/5 hover:bg-white/10 transition">Cancel</button>
                            <button onClick={handleRename} disabled={busy} className="flex-1 py-3 rounded-lg font-bold bg-tm-purple hover:bg-tm-purple/90 text-white transition disabled:opacity-50">Save Name</button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
