"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
    ArrowLeft, PlusCircle, Wallet, Pencil, Trash2, RefreshCw, ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { useAccountContext } from "@/components/providers/AccountContext";
import { STRATEGIES, getStrategy } from "@/lib/strategies";

type RiskLevel = 'conservative' | 'moderate' | 'aggressive';

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
    const [showCreate, setShowCreate] = useState(false);
    const [renameId, setRenameId] = useState<number | null>(null);
    const [renameValue, setRenameValue] = useState('');
    const [busy, setBusy] = useState(false);

    // create form
    const [name, setName] = useState('');
    const [strategy, setStrategy] = useState(STRATEGIES[0].key);
    const [riskLevel, setRiskLevel] = useState<RiskLevel>('moderate');
    const [principal, setPrincipal] = useState('');
    const [alertEmail, setAlertEmail] = useState('');
    const [loginEmail, setLoginEmail] = useState('');
    const [createError, setCreateError] = useState<string | null>(null);

    useEffect(() => {
        if (ready && !authenticated) router.push("/");
    }, [ready, authenticated, router]);

    // Smart-default landing: with exactly one account, open it straight away.
    // ?list=1 is the escape hatch so the list (and Create Account) stays
    // reachable from the account workspace back link and Manage Accounts.
    const searchParams = useSearchParams();
    const forceList = searchParams?.get('list') === '1';
    useEffect(() => {
        if (forceList || loading || !ready || !authenticated) return;
        if (accounts.length === 1) {
            router.replace(`/account/${accounts[0].id}`);
        }
    }, [forceList, loading, ready, authenticated, accounts, router]);

    // The Privy login email is the default alert recipient for new accounts.
    useEffect(() => {
        const addr = (user?.email?.address as string | undefined) || '';
        if (addr) setLoginEmail(addr);
    }, [user]);

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

    const handleCreate = async () => {
        setCreateError(null);
        const p = parseFloat(principal);
        if (!name.trim()) { setCreateError('Give the account a name'); return; }
        if (!isFinite(p) || p <= 0) { setCreateError('Enter a valid initial principal'); return; }
        setBusy(true);
        try {
            const res = await fetch('/api/accounts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name.trim(), strategy, riskLevel, initialPrincipal: p,
                    alertEmail: alertEmail.trim() || undefined,
                }),
            });
            if (!res.ok) {
                const d = await res.json();
                throw new Error(d.error || 'Failed to create account');
            }
            setShowCreate(false);
            setName(''); setPrincipal(''); setRiskLevel('moderate'); setAlertEmail('');
            await refreshAccounts();
        } catch (e: any) {
            setCreateError(e.message);
        } finally {
            setBusy(false);
        }
    };

    const handleRename = async () => {
        if (renameId === null || !renameValue.trim()) return;
        setBusy(true);
        try {
            await fetch(`/api/accounts/${renameId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: renameValue.trim() }),
            });
            setRenameId(null); setRenameValue('');
            await refreshAccounts();
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

            <div className="px-6 mb-4">
                <button
                    onClick={() => setShowCreate(true)}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold bg-tm-purple hover:bg-tm-purple/90 text-white transition"
                >
                    <PlusCircle className="w-4 h-4" /> Create Account
                </button>
            </div>

            {/* Account list */}
            <div className="px-6 space-y-3">
                {loading && accounts.length === 0 ? (
                    <div className="glass-card p-8 text-center text-tm-muted text-sm animate-pulse">Loading accounts...</div>
                ) : accounts.length === 0 ? (
                    <div className="glass-card p-8 text-center">
                        <Wallet className="w-8 h-8 text-tm-muted mx-auto mb-3" />
                        <p className="text-sm text-tm-muted">No accounts yet. Create one to start tracking a strategy.</p>
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
                                        <button onClick={() => { setRenameId(a.id); setRenameValue(a.name); }} className="p-1.5 rounded hover:bg-white/10 text-tm-muted hover:text-tm-purple transition" title="Rename">
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

            {/* Create modal */}
            {showCreate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
                    <div className="bg-[#111] border border-white/10 p-6 rounded-2xl w-full max-w-sm">
                        <h3 className="text-lg font-bold mb-1">Create Account</h3>
                        <p className="text-xs text-tm-muted mb-5">A named virtual account that tracks one strategy at a chosen risk level.</p>

                        <label className="text-[10px] text-tm-muted uppercase font-bold tracking-wider mb-1 block">Account Name</label>
                        <input
                            type="text" value={name} onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. My Pro Account"
                            className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-tm-purple mb-4"
                            autoFocus
                        />

                        <label className="text-[10px] text-tm-muted uppercase font-bold tracking-wider mb-1 block">Strategy</label>
                        <div className="grid grid-cols-3 gap-2 mb-4">
                            {STRATEGIES.map((s) => (
                                <button
                                    key={s.key}
                                    onClick={() => setStrategy(s.key)}
                                    className={`py-2 rounded-lg text-xs font-bold border transition ${strategy === s.key ? 'bg-tm-purple/20 border-tm-purple text-white' : 'bg-white/5 border-white/10 text-tm-muted hover:text-white'}`}
                                >
                                    {s.shortLabel}
                                </button>
                            ))}
                        </div>

                        <label className="text-[10px] text-tm-muted uppercase font-bold tracking-wider mb-1 block">Risk Level</label>
                        <div className="grid grid-cols-3 gap-2 mb-4">
                            {(['conservative', 'moderate', 'aggressive'] as RiskLevel[]).map((r) => (
                                <button
                                    key={r}
                                    onClick={() => setRiskLevel(r)}
                                    className={`py-2 rounded-lg text-xs font-bold border capitalize transition ${riskLevel === r ? 'bg-tm-purple/20 border-tm-purple text-white' : 'bg-white/5 border-white/10 text-tm-muted hover:text-white'}`}
                                >
                                    {r}
                                </button>
                            ))}
                        </div>

                        <label className="text-[10px] text-tm-muted uppercase font-bold tracking-wider mb-1 block">Alert Email</label>
                        <input
                            type="email" value={alertEmail} onChange={(e) => setAlertEmail(e.target.value)}
                            placeholder={loginEmail || 'Defaults to your login email'}
                            className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-tm-purple mb-1"
                        />
                        <p className="text-[10px] text-tm-muted mb-4">Signal emails for this account go here. Leave blank to use your login email.</p>

                        <label className="text-[10px] text-tm-muted uppercase font-bold tracking-wider mb-1 block">Initial Principal ($)</label>
                        <input
                            type="number" min="1" step="100" value={principal} onChange={(e) => setPrincipal(e.target.value)}
                            placeholder="e.g. 25000"
                            className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white font-mono focus:outline-none focus:border-tm-purple mb-4"
                        />

                        <p className="text-[10px] text-tm-muted mb-3">
                            Every account starts with a free month (30 days). Subscribe annually before it ends to keep signals running. Each account has its own membership.
                        </p>

                        {createError && <p className="text-red-400 text-xs mb-3">{createError}</p>}

                        <div className="flex gap-3">
                            <button onClick={() => setShowCreate(false)} className="flex-1 py-3 rounded-lg font-bold bg-white/5 hover:bg-white/10 transition">Cancel</button>
                            <button
                                onClick={handleCreate} disabled={busy}
                                className="flex-1 py-3 rounded-lg font-bold bg-tm-purple hover:bg-tm-purple/90 text-white transition disabled:opacity-50 flex items-center justify-center"
                            >
                                {busy ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Rename modal */}
            {renameId !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
                    <div className="bg-[#111] border border-white/10 p-6 rounded-2xl w-full max-w-sm">
                        <h3 className="text-lg font-bold mb-4">Rename Account</h3>
                        <input
                            type="text" value={renameValue} onChange={(e) => setRenameValue(e.target.value)}
                            className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-tm-purple mb-4"
                            autoFocus
                        />
                        <div className="flex gap-3">
                            <button onClick={() => setRenameId(null)} className="flex-1 py-3 rounded-lg font-bold bg-white/5 hover:bg-white/10 transition">Cancel</button>
                            <button onClick={handleRename} disabled={busy} className="flex-1 py-3 rounded-lg font-bold bg-tm-purple hover:bg-tm-purple/90 text-white transition disabled:opacity-50">Save</button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
