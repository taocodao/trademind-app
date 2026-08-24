"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { ArrowLeft, RefreshCw, Wallet, WifiOff, LayoutList, Activity as ActivityIcon, Zap } from "lucide-react";
import Link from "next/link";
import { getStrategy } from "@/lib/strategies";
import { ActivityTab } from "@/components/accounts/ActivityTab";
import { AccountSwitcher } from "@/components/accounts/AccountSwitcher";

interface Position {
    id: number;
    symbol: string;
    quantity: number;
    avg_price: number;
    currentPrice: number;
    marketValue: number;
    unrealizedPnl: number;
    unrealizedPnlPct: number;
}

interface AccountData {
    id: number;
    name: string;
    strategy: string;
    risk_level: string;
    initial_principal: number;
    cash_balance: number;
}

export default function AccountDetailPage() {
    const { ready, authenticated } = usePrivy();
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const accountId = Number(params?.id);

    // Deep-linkable tab: /account/[id]?tab=activity or ?tab=signals
    const tabParam = searchParams?.get('tab');
    const initialTab = tabParam === 'activity' ? 'activity' : tabParam === 'signals' ? 'signals' : 'positions';
    const [tab, setTab] = useState<'positions' | 'signals' | 'activity'>(initialTab);
    const [account, setAccount] = useState<AccountData | null>(null);
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
        <main className="min-h-screen pb-24 max-w-4xl mx-auto w-full border-x border-white/5 bg-tm-bg shadow-2xl relative">
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
                <AccountSwitcher navigateOnSelect tab={tab} />
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

            {/* Tabs */}
            <div className="px-6 mb-4">
                <div className="flex gap-2 bg-tm-surface rounded-xl p-1">
                    <button
                        onClick={() => setTab('positions')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition ${tab === 'positions' ? 'bg-tm-purple text-white' : 'text-tm-muted hover:text-white'}`}
                    >
                        <LayoutList className="w-4 h-4" /> Positions
                    </button>
                    <button
                        onClick={() => setTab('signals')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition ${tab === 'signals' ? 'bg-tm-purple text-white' : 'text-tm-muted hover:text-white'}`}
                    >
                        <Zap className="w-4 h-4" /> Signals
                    </button>
                    <button
                        onClick={() => setTab('activity')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition ${tab === 'activity' ? 'bg-tm-purple text-white' : 'text-tm-muted hover:text-white'}`}
                    >
                        <ActivityIcon className="w-4 h-4" /> Activity
                    </button>
                </div>
            </div>

            {/* Tab content */}
            <div className="px-6">
                {tab === 'positions' ? (
                    <PositionsTable positions={positions} loading={loading} strategy={account?.strategy || ''} />
                ) : tab === 'signals' ? (
                    <SignalsTab accountId={accountId} />
                ) : (
                    <ActivityTab accountId={accountId} accountName={account?.name} onChanged={fetchPositions} />
                )}
            </div>
        </main>
    );
}

function PositionsTable({ positions, loading, strategy }: { positions: Position[]; loading: boolean; strategy: string }) {
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

interface AccountSignalRow {
    signalId: string;
    accountStatus: string;
    receivedAt: string;
    publishedAt: string | null;
    strategy: string | null;
    symbol: string | null;
    signalStatus: string | null;
    action: string | null;
    summary: string | null;
    regime: string | null;
}

function SignalsTab({ accountId }: { accountId: number }) {
    const [rows, setRows] = useState<AccountSignalRow[]>([]);
    const [loadingSignals, setLoadingSignals] = useState(true);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(`/api/accounts/${accountId}/signals`);
                if (res.ok && !cancelled) {
                    const d = await res.json();
                    setRows(d.signals || []);
                }
            } catch (e) {
                console.error('[account] signals fetch failed', e);
            } finally {
                if (!cancelled) setLoadingSignals(false);
            }
        })();
        return () => { cancelled = true; };
    }, [accountId]);

    const statusColor = (s: string) =>
        s === 'executed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
        : s === 'skipped' ? 'bg-white/5 text-tm-muted border-white/10'
        : s === 'failed' ? 'bg-tm-red/10 text-tm-red border-tm-red/20'
        : 'bg-white/5 text-tm-muted border-white/10';

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
                    {rows.map((s) => {
                        const when = s.publishedAt || s.receivedAt;
                        const dateStr = when ? new Date(when).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';
                        return (
                            <div key={s.signalId} className="glass-card p-4">
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-sm text-white">{s.action || s.summary || 'Signal'}</span>
                                        {s.symbol && <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-white/5 text-tm-muted border border-white/10">{s.symbol}</span>}
                                        {s.regime && <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-white/5 text-tm-muted border border-white/10">{s.regime}</span>}
                                    </div>
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border capitalize ${statusColor(s.accountStatus)}`}>
                                        {s.accountStatus}
                                    </span>
                                </div>
                                {s.summary && s.action && <p className="text-xs text-tm-muted mb-1">{s.summary}</p>}
                                <p className="text-[10px] text-tm-muted">{dateStr}</p>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
