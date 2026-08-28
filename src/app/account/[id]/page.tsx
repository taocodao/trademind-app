"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { ArrowLeft, RefreshCw, Wallet, WifiOff, LayoutList, Activity as ActivityIcon, Zap } from "lucide-react";
import Link from "next/link";
import { getStrategy } from "@/lib/strategies";
import { ActivityTab } from "@/components/accounts/ActivityTab";
import { SignalCard, type SignalRow } from "@/components/accounts/SignalCard";
import { AccountTab } from "@/components/console/AccountTab";

type ConsoleTab = 'signals' | 'positions' | 'activity' | 'account' | 'refer';
import { ReferDashboard } from "@/app/refer/page";

interface Position {
    id: number;
    symbol: string;
    quantity: number;
    avg_price: number;
    currentPrice: number;
    marketValue: number;
    unrealizedPnl: number;
    unrealizedPnlPct: number;
    signal_id?: string | null;
}

interface AccountData {
    id: number;
    name: string;
    strategy: string;
    risk_level: 'conservative' | 'moderate' | 'aggressive';
    initial_principal: number;
    cash_balance: number;
    broker?: string | null;
}

interface MembershipInfo {
    status: 'free_month' | 'awaiting_payment' | 'active' | 'past_due' | 'canceled' | 'expired';
    plan: 'BASIC' | 'LEAPS';
    free_month_ends_at: string | null;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
}

export default function AccountDetailPage() {
    const { ready, authenticated } = usePrivy();
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const accountId = Number(params?.id);

    // Deep-linkable tab: /account/[id]?tab=positions|signals|activity|account|refer
    const VALID_TABS: ConsoleTab[] = ['signals', 'positions', 'activity', 'account', 'refer'];
    const tabParam = searchParams?.get('tab');
    const initialTab: ConsoleTab = (VALID_TABS as string[]).includes(tabParam || '') ? (tabParam as ConsoleTab) : 'positions';
    const [tab, setTab] = useState<ConsoleTab>(initialTab);

    const selectTab = useCallback((t: ConsoleTab) => {
        setTab(t);
        router.replace(`/account/${accountId}?tab=${t}`, { scroll: false });
    }, [router, accountId]);

    // Keep state in sync when the URL tab param changes (deep links, back nav).
    useEffect(() => {
        const t = searchParams?.get('tab');
        if (t && (VALID_TABS as string[]).includes(t) && t !== tab) setTab(t as ConsoleTab);
    }, [searchParams, tab]);
    const [account, setAccount] = useState<AccountData | null>(null);
    const [membership, setMembership] = useState<MembershipInfo | null>(null);
    const [checkoutBusy, setCheckoutBusy] = useState(false);
    const [positions, setPositions] = useState<Position[]>([]);
    const [cash, setCash] = useState(0);
    const [positionsValue, setPositionsValue] = useState(0);
    const [nlv, setNlv] = useState(0);
    const [phase, setPhase] = useState<string | null>(null);
    const [phaseCap, setPhaseCap] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        if (ready && !authenticated) router.push("/signin");
    }, [ready, authenticated, router]);

    const fetchPositions = useCallback(async () => {
        try {
            const res = await fetch(`/api/accounts/${accountId}/positions`);
            if (res.status === 404) { setNotFound(true); setLoading(false); return; }
            if (res.ok) {
                const d = await res.json();
                setAccount(d.account);
                setPositions(d.positions || []);
                setCash(d.cash);
                setPositionsValue(d.positionsValue);
                setNlv(d.nlv);
                setPhase(d.phase ?? null);
                setPhaseCap(d.phaseCap ?? null);
            }
        } catch (e) {
            console.error('[account] fetch failed', e);
        } finally {
            setLoading(false);
        }
    }, [accountId]);

    useEffect(() => {
        if (ready && authenticated && accountId) {
            fetchPositions();
            const iv = setInterval(fetchPositions, 15000);
            return () => clearInterval(iv);
        }
    }, [ready, authenticated, accountId, fetchPositions]);

    const fetchMembership = useCallback(() => {
        if (!accountId) return;
        fetch(`/api/accounts/${accountId}/membership`)
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => { if (d?.membership) setMembership(d.membership); })
            .catch(() => {});
    }, [accountId]);

    useEffect(() => { fetchMembership(); }, [fetchMembership]);

    const startCheckout = async () => {
        setCheckoutBusy(true);
        try {
            const res = await fetch('/api/stripe/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accountId }),
            });
            const d = await res.json();
            if (d.url) window.location.href = d.url;
        } finally { setCheckoutBusy(false); }
    };

    if (!ready || !authenticated) {
        return (
            <main className="min-h-screen flex items-center justify-center">
                <div className="animate-pulse"><div className="w-12 h-12 rounded-full bg-tm-purple/30" /></div>
            </main>
        );
    }

    if (notFound) {
        return (
            <main className="min-h-screen pb-24 max-w-4xl mx-auto w-full border-x border-white/5 bg-tm-bg flex flex-col items-center justify-center">
                <p className="text-tm-muted mb-4">Account not found.</p>
                <Link href="/accounts" className="text-tm-purple font-bold">Back to Accounts</Link>
            </main>
        );
    }

    const cfg = account ? getStrategy(account.strategy) : null;
    const realizedSoFar = nlv - (account?.initial_principal ?? 0);

    return (
        <main className="min-h-screen pb-28 max-w-4xl mx-auto w-full border-x border-white/5 bg-tm-bg shadow-2xl relative">
            {/* Header */}
            <header className="px-6 pt-12 pb-2 flex items-center gap-4">
                <Link href="/accounts?list=1" className="w-10 h-10 rounded-full bg-tm-surface flex items-center justify-center">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div className="flex-1">
                    <h1 className="text-xl font-bold flex items-center gap-2 flex-wrap">
                        {account?.name || 'Account'}
                        <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                            <WifiOff className="w-2.5 h-2.5" /> VIRTUAL
                        </span>
                        {phase && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                phase === 'TARGET' ? 'bg-emerald-500/20 text-emerald-400' :
                                phase === 'GROWTH' ? 'bg-amber-500/20 text-amber-400' :
                                'bg-purple-500/20 text-purple-400'
                            }`}>
                                {phase} PHASE
                            </span>
                        )}
                    </h1>
                    <p className="text-sm text-tm-muted capitalize">
                        {cfg?.label || account?.strategy} · {account?.risk_level}
                        {phaseCap != null && (
                            <span className="text-tm-muted/70"> · sizing cap {(phaseCap * 100).toFixed(0)}% NLV</span>
                        )}
                    </p>
                </div>
                <button onClick={fetchPositions} className="w-10 h-10 rounded-full bg-tm-surface flex items-center justify-center text-tm-muted hover:text-white transition">
                    <RefreshCw className="w-4 h-4" />
                </button>
            </header>

            {/* Account overview */}
            <div className="px-6 mb-6 mt-4">
                <div className="glass-card p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Wallet className="w-5 h-5 text-tm-purple" />
                        <h3 className="font-bold">Account Overview</h3>
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-center">
                        <div>
                            <p className="text-[10px] text-tm-muted uppercase tracking-wider font-semibold mb-1">Total Value</p>
                            <p className="text-lg font-bold font-mono text-white">${nlv.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-tm-muted uppercase tracking-wider font-semibold mb-1">Cash</p>
                            <p className="text-lg font-bold font-mono text-emerald-400">${cash.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-tm-muted uppercase tracking-wider font-semibold mb-1">Positions Value</p>
                            <p className="text-lg font-bold font-mono text-purple-400">${positionsValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-tm-muted uppercase tracking-wider font-semibold mb-1">P&L vs Principal</p>
                            <p className={`text-lg font-bold font-mono ${realizedSoFar >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {realizedSoFar >= 0 ? '+' : ''}${realizedSoFar.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </p>
                        </div>
                    </div>
                </div>
            </div>


            {/* In-page tab row (bottom nav covers global navigation) */}
            <div className="px-6 mb-4 flex gap-1.5 overflow-x-auto no-scrollbar">
                {([
                    ['signals', 'Signals'],
                    ['positions', 'Positions'],
                    ['activity', 'Activity'],
                    ['account', 'Account'],
                    ['refer', 'Refer'],
                ] as [ConsoleTab, string][]).map(([key, label]) => (
                    <button
                        key={key}
                        onClick={() => selectTab(key)}
                        className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition border ${
                            tab === key
                                ? 'bg-tm-purple text-white border-tm-purple'
                                : 'text-tm-muted border-white/10 hover:border-white/30 hover:text-white'
                        }`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            <div className="px-6">
                {tab === 'positions' ? (
                    <PositionsTable positions={positions} loading={loading} strategy={account?.strategy || ''} switchToSignal={(sid) => {
                        setTab('signals');
                        router.replace(`/account/${accountId}?tab=signals&signal=${encodeURIComponent(sid)}`, { scroll: false });
                    }} />
                ) : tab === 'signals' ? (
                    <SignalsTab accountId={accountId} />
                ) : tab === 'activity' ? (
                    <ActivityTab accountId={accountId} accountName={account?.name} onChanged={fetchPositions} />
                ) : tab === 'refer' ? (
                    <ReferDashboard />
                ) : account ? (
                    <div className="space-y-4">
                        {membership && (
                            <MembershipBanner membership={membership} busy={checkoutBusy} onSubscribe={startCheckout} />
                        )}
                        <AccountTab account={account} onChanged={() => { fetchPositions(); fetchMembership(); }} />
                    </div>
                ) : null}
            </div>

        </main>
    );
}

function PositionsTable({ positions, loading, strategy, switchToSignal }: { positions: Position[]; loading: boolean; strategy: string; switchToSignal: (signalId: string) => void }) {
    const symbolColors: Record<string, string> = {
        QQQ: strategy === 'QQQ_LEAPS' ? 'text-amber-400' : 'text-blue-400',
        QLD: 'text-indigo-400',
        TQQQ: 'text-purple-400',
        SGOV: 'text-emerald-400',
    };
    return (
        <div>
            <h2 className="text-sm font-bold text-tm-muted uppercase tracking-wider mb-3">Equity Holdings</h2>
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
                            </tr>
                        </thead>
                        <tbody>
                            {loading && positions.length === 0 ? (
                                <tr><td colSpan={5} className="px-4 py-8 text-center text-tm-muted text-xs animate-pulse">Loading positions...</td></tr>
                            ) : positions.length === 0 ? (
                                <tr><td colSpan={5} className="px-4 py-8 text-center text-tm-muted text-xs">No active positions.</td></tr>
                            ) : (
                                positions.map((p) => {
                                    const isProfit = p.unrealizedPnl >= 0;
                                    const color = symbolColors[p.symbol] || 'text-white';
                                    return (
                                        <tr key={p.id} className="border-b border-white/5 hover:bg-white/[0.02] transition last:border-0">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <span className={`font-bold font-mono ${color}`}>{p.symbol}</span>
                                                    <span className="text-[10px] text-tm-muted font-mono bg-white/5 px-1.5 py-0.5 rounded">x{p.quantity}</span>
                                                    {p.signal_id && (
                                                        <button
                                                            onClick={() => switchToSignal(p.signal_id!)}
                                                            title="From signal"
                                                            className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-tm-purple/10 text-tm-purple border border-tm-purple/25 hover:bg-tm-purple/20 transition"
                                                        >
                                                            signal
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono text-sm">${p.currentPrice.toFixed(2)}</td>
                                            <td className="px-4 py-3 text-right font-mono text-sm text-tm-muted">${p.avg_price.toFixed(2)}</td>
                                            <td className="px-4 py-3 text-right font-mono text-sm">${p.marketValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                            <td className="px-4 py-3 text-right">
                                                <p className={`font-mono text-sm font-bold ${isProfit ? 'text-tm-green' : 'text-tm-red'}`}>
                                                    {isProfit ? '+' : ''}${p.unrealizedPnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                </p>
                                                <p className={`font-mono text-[10px] ${isProfit ? 'text-tm-green/70' : 'text-tm-red/70'}`}>
                                                    {isProfit ? '+' : ''}{p.unrealizedPnlPct.toFixed(2)}%
                                                </p>
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
    );
}

function SignalsTab({ accountId }: { accountId: number }) {
    const searchParams = useSearchParams();
    const highlightId = searchParams?.get('signal');
    const [rows, setRows] = useState<SignalRow[]>([]);
    const [loadingSignals, setLoadingSignals] = useState(true);

    const load = useCallback(async () => {
        try {
            const res = await fetch(`/api/accounts/${accountId}/signals`);
            if (res.ok) {
                const d = await res.json();
                setRows(d.signals || []);
            }
        } catch (e) {
            console.error('[account] signals fetch failed', e);
        } finally {
            setLoadingSignals(false);
        }
    }, [accountId]);

    useEffect(() => { load(); }, [load]);

    // Deep link from signal emails: scroll to and highlight the target card.
    useEffect(() => {
        if (!highlightId || rows.length === 0) return;
        const t = setTimeout(() => {
            document.getElementById(`signal-${highlightId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 350);
        return () => clearTimeout(t);
    }, [highlightId, rows.length]);

    return (
        <div>
            <h2 className="text-sm font-bold text-tm-muted uppercase tracking-wider mb-3">Signals Delivered</h2>
            {loadingSignals && rows.length === 0 ? (
                <div className="glass-card p-8 text-center text-tm-muted text-xs animate-pulse">Loading signals...</div>
            ) : rows.length === 0 ? (
                <div className="glass-card p-8 text-center">
                    <Zap className="w-8 h-8 text-tm-muted mx-auto mb-3" />
                    <p className="text-sm text-tm-muted">No signals yet. When the model issues one for this strategy, it lands here with its order instruction.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {rows.map((sig) => (
                        <SignalCard
                            key={sig.signalId}
                            signal={sig}
                            accountId={accountId}
                            highlighted={highlightId === sig.signalId}
                            onChanged={load}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function MembershipBanner({ membership, busy, onSubscribe }: { membership: MembershipInfo; busy: boolean; onSubscribe: () => void }) {
    const fmt = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    const daysLeft = (iso: string) => Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000));
    const price = membership.plan === 'LEAPS' ? 336 : 252;

    let tone = 'border-white/10 bg-white/[0.03]';
    let dot = 'bg-tm-muted';
    let title = '';
    let detail = '';
    let cta: string | null = null;

    switch (membership.status) {
        case 'free_month': {
            const d = membership.free_month_ends_at ? daysLeft(membership.free_month_ends_at) : 0;
            tone = 'border-purple-500/30 bg-purple-500/10'; dot = 'bg-purple-400';
            title = `Free month - ${d} day${d !== 1 ? 's' : ''} left`;
            detail = `Signals are running. Subscribe before ${membership.free_month_ends_at ? fmt(membership.free_month_ends_at) : 'it ends'} to keep them on.`;
            cta = `Subscribe - $${price}/yr`;
            break;
        }
        case 'awaiting_payment':
            tone = 'border-amber-500/30 bg-amber-500/10'; dot = 'bg-amber-400';
            title = 'Payment due';
            detail = 'Subscribe to start signal delivery for this account.';
            cta = `Subscribe - $${price}/yr`;
            break;
        case 'active':
            tone = 'border-emerald-500/30 bg-emerald-500/10'; dot = 'bg-emerald-400';
            if (membership.cancel_at_period_end && membership.current_period_end) {
                title = `Active - auto-renew off, ends ${fmt(membership.current_period_end)}`;
                detail = `${daysLeft(membership.current_period_end)} days of access remaining. Resubscribe any time to continue.`;
                cta = 'Resubscribe';
            } else {
                title = membership.current_period_end ? `Active - renews ${fmt(membership.current_period_end)}` : 'Active';
                detail = membership.current_period_end ? `${daysLeft(membership.current_period_end)} days until renewal. Signals are running.` : 'Signals are running.';
            }
            break;
        case 'past_due':
            tone = 'border-tm-red/30 bg-tm-red/10'; dot = 'bg-tm-red';
            title = 'Payment failed';
            detail = 'Update your payment method to keep signal delivery on.';
            cta = 'Update payment';
            break;
        case 'canceled':
            title = membership.current_period_end ? `Canceled - access until ${fmt(membership.current_period_end)}` : 'Canceled';
            detail = membership.current_period_end ? `${daysLeft(membership.current_period_end)} days of access remaining.` : '';
            cta = 'Resubscribe';
            break;
        case 'expired':
            tone = 'border-tm-red/30 bg-tm-red/10'; dot = 'bg-tm-red';
            title = 'Membership expired';
            detail = 'Signal delivery is paused for this account. Subscribe to resume.';
            cta = `Subscribe - $${price}/yr`;
            break;
    }

    return (
        <div className={`rounded-xl border p-4 flex items-center gap-3 ${tone}`}>
            <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
            <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white">{title}</p>
                {detail && <p className="text-[11px] text-tm-muted mt-0.5">{detail}</p>}
            </div>
            {cta && (
                <button
                    onClick={onSubscribe}
                    disabled={busy}
                    className="shrink-0 px-4 py-2 rounded-lg font-bold bg-tm-purple hover:bg-tm-purple/90 text-white text-xs transition disabled:opacity-50"
                >
                    {busy ? 'Loading...' : cta}
                </button>
            )}
        </div>
    );
}
