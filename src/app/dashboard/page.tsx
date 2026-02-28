'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import {
    Wallet,
    RefreshCw,
    Bell,
    LogOut,
    Home,
    TrendingUp,
    Activity,
    Settings,
    Trophy,
    Flame,
    Target,
    Medal,
    CheckSquare,
    Square,
    CheckCircle,
    AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useSettings } from '@/components/providers/SettingsProvider';
import { TastytradeLink } from '@/components/TastytradeLink';
import { TQQQStatusBanner } from '@/components/dashboard/TQQQStatusBanner';
import { SignalCard, type TQQQSignal } from '@/components/dashboard/SignalCard';
import { TurboBounceSignalCard, type TurboBounceSignal } from '@/components/dashboard/TurboBounceSignalCard';
import { Suspense } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AccountData {
    accountNumber: string;
    netLiquidatingValue: number;
    buyingPower: number;
    todayPnL: number;
    todayPnLPercent: number;
    positionCount: number;
}

interface GamStats {
    streak: number;
    winRate: number;
    rank: number | null;
    totalProfit: number;
}

// ─── Top Nav ─────────────────────────────────────────────────────────────────

function TopNav({ onLogout, onRefresh, loading }: {
    onLogout: () => void;
    onRefresh: () => void;
    loading: boolean;
}) {
    return (
        <nav className="sticky top-0 z-50 bg-tm-surface/95 backdrop-blur-md border-b border-white/5 hidden md:block">
            <div className="flex items-center justify-between px-4 py-2">
                {/* Live indicator */}
                <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-tm-green animate-pulse" />
                    <span className="text-[10px] text-tm-green font-semibold">Live</span>
                </div>

                {/* Nav links */}
                <div className="flex items-center gap-1">
                    {/* Home — active */}
                    <span className="flex flex-col items-center px-3 py-1 text-tm-purple">
                        <Home className="w-4 h-4" />
                        <span className="text-[9px] mt-0.5">Home</span>
                    </span>
                    <Link href="/signals" className="flex flex-col items-center px-3 py-1 text-tm-muted hover:text-tm-text transition-colors">
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-[9px] mt-0.5">Signals</span>
                    </Link>
                    <Link href="/positions" className="flex flex-col items-center px-3 py-1 text-tm-muted hover:text-tm-text transition-colors">
                        <Activity className="w-4 h-4" />
                        <span className="text-[9px] mt-0.5">Positions</span>
                    </Link>
                    <Link href="/activity" className="flex flex-col items-center px-3 py-1 text-tm-muted hover:text-tm-text transition-colors">
                        <Bell className="w-4 h-4" />
                        <span className="text-[9px] mt-0.5">Activity</span>
                    </Link>
                    <Link href="/settings" className="flex flex-col items-center px-3 py-1 text-tm-muted hover:text-tm-text transition-colors">
                        <Settings className="w-4 h-4" />
                        <span className="text-[9px] mt-0.5">Settings</span>
                    </Link>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={onRefresh}
                        disabled={loading}
                        className="w-7 h-7 rounded-full bg-tm-bg flex items-center justify-center"
                        aria-label="Refresh"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 text-tm-muted ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={onLogout}
                        className="w-7 h-7 rounded-full bg-tm-bg flex items-center justify-center"
                        aria-label="Logout"
                    >
                        <LogOut className="w-3.5 h-3.5 text-tm-muted" />
                    </button>
                </div>
            </div>
        </nav>
    );
}

// ─── Progress Card ────────────────────────────────────────────────────────────

function ProgressCard({ stats }: { stats: GamStats }) {
    return (
        <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-yellow-400" />
                    <span className="font-semibold text-sm">Your Progress</span>
                </div>
                <Link href="/leaderboard" className="text-tm-purple text-xs font-semibold">
                    Leaderboard &rsaquo;
                </Link>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-orange-900/30 border border-orange-700/30 rounded-xl p-3 text-center">
                    <Flame className="w-5 h-5 text-orange-400 mx-auto mb-1" />
                    <p className="text-lg font-bold">{stats.streak}</p>
                    <p className="text-[10px] text-tm-muted">Week Streak</p>
                </div>
                <div className="bg-tm-green/10 border border-tm-green/20 rounded-xl p-3 text-center">
                    <Target className="w-5 h-5 text-tm-green mx-auto mb-1" />
                    <p className="text-lg font-bold text-tm-green">{stats.winRate}%</p>
                    <p className="text-[10px] text-tm-muted">Win Rate</p>
                </div>
                <div className="bg-tm-purple/10 border border-tm-purple/20 rounded-xl p-3 text-center">
                    <Medal className="w-5 h-5 text-tm-purple mx-auto mb-1" />
                    <p className="text-lg font-bold text-tm-purple">{stats.rank ?? '—'}</p>
                    <p className="text-[10px] text-tm-muted">Rank</p>
                </div>
            </div>
            <div className="flex items-center justify-between text-sm border-t border-white/5 pt-2">
                <span className="text-tm-muted">Total Profit</span>
                <span className={`font-mono font-bold ${stats.totalProfit >= 0 ? 'text-tm-green' : 'text-tm-red'}`}>
                    {stats.totalProfit >= 0 ? '+' : ''}${stats.totalProfit.toFixed(2)}
                </span>
            </div>
        </div>
    );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

function DashboardContent() {
    const { ready, authenticated, logout, user } = usePrivy();
    const router = useRouter();
    const { settings, setAutoApproval } = useSettings();

    const [data, setData] = useState<AccountData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [tastyLinked, setTastyLinked] = useState<boolean | null>(null);
    const [tastyUsername, setTastyUsername] = useState<string | null>(null);
    const [signals, setSignals] = useState<TQQQSignal[]>([]);
    const [turboSignals, setTurboSignals] = useState<TurboBounceSignal[]>([]);
    const [recentOrders, setRecentOrders] = useState<any[]>([]);
    const [executingId, setExecutingId] = useState<string | null>(null);
    const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

    const [gamStats, setGamStats] = useState<GamStats>({ streak: 0, winRate: 0, rank: null, totalProfit: 0 });

    // ── Auth guard ──
    useEffect(() => {
        if (ready && !authenticated) router.push('/');
    }, [ready, authenticated, router]);

    // ── Check Tastytrade link ──
    useEffect(() => {
        if (ready && authenticated && tastyLinked === null) {
            fetch('/api/tastytrade/status')
                .then(r => r.json())
                .then(d => {
                    setTastyLinked(d.linked);
                    if (d.username) setTastyUsername(d.username);
                })
                .catch(() => setTastyLinked(false));
        }
    }, [ready, authenticated, tastyLinked]);

    // ── Fetch recent orders ──
    const fetchOrders = useCallback(async (accountNum?: string) => {
        const targetAccount = accountNum || data?.accountNumber;
        if (!targetAccount) return;
        try {
            // Fetch both live and filled orders from today
            const res = await fetch(`/api/tastytrade/orders/status?accountNumber=${targetAccount}&liveOnly=false`);
            if (res.ok) {
                const pd = await res.json();
                setRecentOrders(pd.data?.items || []);
            }
        } catch (err) {
            console.error('Failed to fetch orders:', err);
        }
    }, [data?.accountNumber]);

    // ── Fetch account data ──
    const fetchAccountData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // Step 1: Get account number from the accounts endpoint
            const acctRes = await fetch('/api/tastytrade/account');
            if (!acctRes.ok) {
                const e = await acctRes.json();
                throw new Error(e.error || 'Failed to fetch account');
            }
            const acctJson = await acctRes.json();
            const accountNumber =
                acctJson?.data?.items?.[0]?.account?.['account-number'];

            if (!accountNumber) {
                throw new Error('No account found in Tastytrade response');
            }

            // Step 2: Get real balance from /accounts/{number}/balances
            const balRes = await fetch(`/api/tastytrade/balance?accountNumber=${accountNumber}`);
            if (!balRes.ok) {
                const e = await balRes.json();
                throw new Error(e.error || 'Failed to fetch balance');
            }
            const balJson = await balRes.json();

            setData({
                accountNumber,
                netLiquidatingValue: balJson.netLiquidatingValue ?? 0,
                buyingPower: balJson.buyingPower ?? 0,
                todayPnL: balJson.todayPnL ?? 0,
                todayPnLPercent: 0,
                positionCount: 0,
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load account data');
        } finally {
            setLoading(false);
        }
    }, []);


    // ── Fetch pending signals ──
    const fetchSignals = useCallback(async () => {
        try {
            const res = await fetch('/api/tqqq/signals');
            if (res.ok) {
                const newSignals = await res.json();

                // Auto-approval logic
                if (settings.autoApproval && tastyLinked) {
                    const riskPct = settings.riskLevel === 'LOW' ? 0.05 : settings.riskLevel === 'HIGH' ? 0.10 : 0.075;
                    const maxRisk = settings.investmentPrincipal * riskPct;
                    const maxConcurrentSpreads = Math.max(1, Math.floor(0.70 / riskPct)); // Leave 30% BP reserve

                    // Only do expensive Tastytrade fetching if there's actually a pending signal we might execute
                    const hasPendingEligible = newSignals.some((sig: TQQQSignal) => {
                        return (!sig.status || sig.status === 'PENDING') && sig.confidence >= 70 && !signals.some(s => s.id === sig.id);
                    });

                    if (hasPendingEligible && !executingId && data?.accountNumber) {
                        try {
                            const acctNum = data.accountNumber;
                            const posRes = await fetch(`/api/tqqq/positions?accountNumber=${acctNum}`);
                            if (posRes.ok) {
                                const pd = await posRes.json();
                                let openSpreadsCount = pd.count || 0;

                                for (const sig of newSignals) {
                                    const alreadyExists = signals.some(s => s.id === sig.id);
                                    const isPending = !sig.status || sig.status === 'PENDING';

                                    if (!alreadyExists && isPending && sig.confidence >= 70 && !executingId) {
                                        if (openSpreadsCount >= maxConcurrentSpreads) {
                                            console.log(`[Auto-Approve] Concurrent cap reached (${openSpreadsCount}/${maxConcurrentSpreads}). Skipping automatic execution.`);
                                            continue; // Leave as PENDING in UI for manual tracking
                                        }

                                        const maxLossPerContract = sig.maxLoss * 100;
                                        const quantity = Math.min(Math.max(1, Math.floor(maxRisk / maxLossPerContract)), 10);

                                        showToast(`Auto-executing ${sig.type.replace('_', ' ')}: ${quantity}x`, true);
                                        handleApproveExecute(sig.id, quantity);
                                        openSpreadsCount++; // Increment immediately to prevent next signal from over-allocation
                                    }
                                }
                            }
                        } catch (err) {
                            console.error('Failed to verify positions for auto-approve', err);
                        }
                    }
                }

                // Filter out signals older than 12 hours to avoid clutter
                const twelveHoursAgo = Date.now() - 12 * 60 * 60 * 1000;
                const recentSignals = newSignals.filter((s: TQQQSignal) => {
                    const age = s.createdAt ? new Date(s.createdAt).getTime() : Date.now();
                    return age > twelveHoursAgo;
                });

                setSignals(recentSignals);
            }
        } catch {
            // silently ignore — signals are best-effort
        }
    }, [settings, tastyLinked, signals, executingId]);

    // ── Fetch Gamification Stats ──
    const fetchGamificationStats = useCallback(async () => {
        if (!authenticated) return;
        try {
            const res = await fetch('/api/gamification/stats');
            if (res.ok) {
                const data = await res.json();
                setGamStats({
                    streak: data.currentStreak || 0,
                    winRate: data.winRate || 0,
                    rank: data.leaderboardRank || null,
                    totalProfit: data.totalProfit || 0
                });
            }
        } catch {
            // gracefully degrade to 0s if gamification fetch fails
        }
    }, [authenticated]);

    // ── Fetch turbobounce signals ──
    const fetchTurboSignals = useCallback(async () => {
        try {
            const res = await fetch('/api/turbobounce/signals');
            if (res.ok) {
                const newSignals = await res.json();

                // Filter out signals older than 12 hours
                const twelveHoursAgo = Date.now() - 12 * 60 * 60 * 1000;
                const recentSignals = newSignals.filter((s: TurboBounceSignal) => {
                    const age = s.timestamp ? new Date(s.timestamp).getTime() : Date.now();
                    return age > twelveHoursAgo;
                });

                setTurboSignals(recentSignals);
            }
        } catch {
            // silently ignore
        }
    }, [settings, tastyLinked]);

    const showToast = (msg: string, ok: boolean) => {
        setToast({ msg, ok });
        setTimeout(() => setToast(null), 3000);
    };

    const handleApproveExecute = async (id: string, quantity: number) => {
        setExecutingId(id);
        try {
            const res = await fetch('/api/tqqq/signals/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ signalId: id, quantity }),
            });
            if (!res.ok) throw new Error((await res.json()).error || 'Execution failed');
            setSignals(prev => prev.map(s => s.id === id ? { ...s, status: 'EXECUTED', fill_price: undefined } : s));
            showToast('Order submitted to Tastytrade ✓', true);
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Execution failed', false);
        } finally {
            setExecutingId(null);
        }
    };

    const handleTrackOnly = async (id: string) => {
        try {
            await fetch('/api/tqqq/signals/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ signalId: id }),
            });
            setSignals(prev => prev.map(s => s.id === id ? { ...s, status: 'TRACKED' } : s));
            showToast('Position added to tracker ✓', true);
        } catch {
            showToast('Failed to track position', false);
        }
    };

    // ── Polling loops ──
    useEffect(() => {
        if (!ready || !authenticated) return;

        // Initial fetch
        fetchAccountData().then(acctData => {
            // Since fetchAccountData doesn't return data, we rely on the state update
            // However, the next effect hook triggers fetchSignals on `data` change anyway
        });

        const signalInterval = setInterval(() => { fetchSignals(); fetchTurboSignals(); fetchGamificationStats(); }, 5000 * 60); // 5 min
        const dataInterval = setInterval(fetchAccountData, 60000); // 1 min

        return () => {
            clearInterval(signalInterval);
            clearInterval(dataInterval);
        };
    }, [ready, authenticated, fetchSignals, fetchAccountData, fetchGamificationStats]);

    // Fetch dependent data once we have the account number
    useEffect(() => {
        if (data?.accountNumber) {
            fetchSignals(); // Initial fast signal fetch
            fetchTurboSignals();
            fetchOrders(data.accountNumber);
            const orderInterval = setInterval(() => fetchOrders(data.accountNumber), 5000); // poll orders fast when active
            return () => clearInterval(orderInterval);
        }
    }, [data?.accountNumber, fetchSignals, fetchTurboSignals, fetchOrders]);

    // ── Loading state ──
    if (!ready || !authenticated || tastyLinked === null) {
        return (
            <main className="min-h-screen flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-tm-purple/30 animate-pulse" />
            </main>
        );
    }

    // ── Not linked → show link screen ──
    if (tastyLinked === false && signals.length === 0) {
        return <TastytradeLink onLinked={() => setTastyLinked(true)} />;
    }

    const refreshAll = () => { fetchAccountData(); fetchSignals(); fetchTurboSignals(); };

    return (
        <main className="min-h-screen bg-tm-bg flex flex-col">
            {/* TOP NAV */}
            <TopNav onLogout={logout} onRefresh={refreshAll} loading={loading} />

            <div className="flex-1 px-4 py-3 space-y-3">

                {/* Welcome header */}
                <div>
                    <p className="text-tm-muted text-xs">Welcome back</p>
                    <h1 className="text-base font-bold truncate">
                        {tastyUsername || user?.email?.address || 'Trader'}
                    </h1>
                </div>

                {/* Toast */}
                {toast && (
                    <div className={`flex items-center gap-2 p-3 rounded-xl border text-sm ${toast.ok
                        ? 'bg-tm-green/10 border-tm-green/30 text-tm-green'
                        : 'bg-tm-red/10 border-tm-red/30 text-tm-red'
                        }`}>
                        {toast.ok
                            ? <CheckCircle className="w-4 h-4 flex-shrink-0" />
                            : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                        {toast.msg}
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="glass-card p-3 border border-tm-red/30 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-tm-red flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="text-tm-red text-xs font-medium truncate">{error}</p>
                        </div>
                        <button onClick={fetchAccountData} className="text-tm-purple text-xs flex-shrink-0">Retry</button>
                    </div>
                )}

                {/* TQQQ Status Banner */}
                <TQQQStatusBanner />

                {/* Balance Card */}
                {tastyLinked && (
                    <div className="glass-card p-4">
                        <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2 text-tm-muted">
                                <Wallet className="w-4 h-4" />
                                <span className="text-xs">Net Liquidating Value</span>
                            </div>
                            {/* Win rate donut */}
                            <div className="relative w-9 h-9">
                                <svg className="w-9 h-9 -rotate-90">
                                    <circle className="text-tm-surface" strokeWidth="3" stroke="currentColor" fill="transparent" r="14" cx="18" cy="18" />
                                    <circle className="text-tm-green" strokeWidth="3" strokeDasharray={`${gamStats.winRate * 0.88} 100`} strokeLinecap="round" stroke="currentColor" fill="transparent" r="14" cx="18" cy="18" />
                                </svg>
                                <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold">{gamStats.winRate}%</span>
                            </div>
                        </div>
                        <p className="text-2xl font-bold font-mono">
                            {loading && !data
                                ? <span className="animate-pulse text-tm-muted">Loading…</span>
                                : `$${(data?.netLiquidatingValue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        </p>
                        <p className={`text-sm font-mono font-semibold ${(data?.todayPnL ?? 0) >= 0 ? 'text-tm-green' : 'text-tm-red'}`}>
                            {(data?.todayPnL ?? 0) >= 0 ? '+' : ''}${(data?.todayPnL ?? 0).toFixed(2)} today
                        </p>
                    </div>
                )}

                {/* Your Progress */}
                <ProgressCard stats={gamStats} />

                {/* Auto-Approve Toggle */}
                <button
                    onClick={() => setAutoApproval(!settings.autoApproval)}
                    className="w-full flex items-center gap-3 glass-card px-4 py-3"
                >
                    {settings.autoApproval
                        ? <CheckSquare className="w-5 h-5 text-tm-purple flex-shrink-0" />
                        : <Square className="w-5 h-5 text-tm-muted flex-shrink-0" />}
                    <div className="text-left">
                        <p className="font-semibold text-sm">Auto-Approve Trades</p>
                        <p className="text-xs text-tm-muted">
                            {settings.autoApproval
                                ? 'Signals execute automatically on Tastytrade'
                                : 'Manually approve each signal before execution'}
                        </p>
                    </div>
                </button>

                {/* Trade Signals */}
                <div className="glass-card p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="font-semibold text-sm">Trade Signals</h2>
                        {signals.length > 0 && (
                            <span className="text-xs bg-tm-purple/20 text-tm-purple px-2 py-0.5 rounded-full">
                                {signals.length} pending
                            </span>
                        )}
                    </div>

                    {/* Signals Pending Approval */}
                    <div className="md:col-span-8">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold font-mono text-tm-purple tracking-tight">ACTION REQUIRED</h2>
                            {signals.length > 0 && (
                                <div className="flex items-center gap-2">
                                    <span className="flex w-2.5 h-2.5 relative">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tm-purple opacity-75"></span>
                                        <span className="relative inline-flex rounded-full w-2.5 h-2.5 bg-tm-purple"></span>
                                    </span>
                                    <span className="text-xs font-semibold text-tm-purple bg-tm-purple/10 px-2 py-1 rounded-full">{signals.length} Pending</span>
                                </div>
                            )}
                        </div>

                        {signals.length === 0 && turboSignals.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-6 gap-2">
                                <CheckCircle className="w-10 h-10 text-tm-green opacity-60" />
                                <p className="font-semibold text-sm">All caught up!</p>
                                <p className="text-xs text-tm-muted">No pending signals</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {signals.map(signal => (
                                    <SignalCard
                                        key={signal.id}
                                        signal={signal}
                                        tastyLinked={!!tastyLinked}
                                        onApproveExecute={handleApproveExecute}
                                        onTrackOnly={handleTrackOnly}
                                        executing={executingId === signal.id}
                                        recentOrders={recentOrders}
                                    />
                                ))}

                                {turboSignals.length > 0 && (
                                    <div className="mt-8">
                                        <h3 className="text-sm font-bold text-tm-muted mb-3 uppercase tracking-wider pl-1">TurboBounce Multi-Ticker</h3>
                                        <div className="space-y-3">
                                            {turboSignals.map(signal => (
                                                <TurboBounceSignalCard
                                                    key={signal.id}
                                                    signal={signal}
                                                    tastyLinked={!!tastyLinked}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {!tastyLinked && (
                                    <p className="text-xs text-tm-muted text-center pt-1">
                                        Not using Tastytrade?{' '}
                                        <span className="text-tm-purple">Track Only</span>
                                        {' '}monitors P&L without executing orders.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}

export default function Dashboard() {
    return (
        <Suspense fallback={
            <main className="min-h-screen flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-tm-purple/30 animate-pulse" />
            </main>
        }>
            <DashboardContent />
        </Suspense>
    );
}
