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

import { useSignalContext } from '@/components/providers/SignalProvider';

import { useStrategyContext } from '@/components/providers/StrategyContext';

import { StrategyTabs } from '@/components/ui/StrategyTabs';

import { getStrategy } from '@/lib/strategies';

import { TastytradeLink } from '@/components/TastytradeLink';

import { TQQQStatusBanner } from '@/components/dashboard/TQQQStatusBanner';

import { TurboCoreSignalCard, type TurboCoreSignal } from '@/components/signals/TurboCoreSignalCard';

import { Suspense } from 'react';

import { useTranslation } from 'react-i18next';



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

    const { t } = useTranslation();

    return (

        <nav className="sticky top-0 z-50 bg-tm-surface/95 backdrop-blur-md border-b border-white/5 hidden">

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

                        <span className="text-[9px] mt-0.5">{t('dashboard.nav.home')}</span>

                    </span>

                    <Link href="/signals" className="flex flex-col items-center px-3 py-1 text-tm-muted hover:text-tm-text transition-colors">

                        <TrendingUp className="w-4 h-4" />

                        <span className="text-[9px] mt-0.5">{t('dashboard.nav.signals')}</span>

                    </Link>

                    <Link href="/positions" className="flex flex-col items-center px-3 py-1 text-tm-muted hover:text-tm-text transition-colors">

                        <Activity className="w-4 h-4" />

                        <span className="text-[9px] mt-0.5">{t('dashboard.nav.positions')}</span>

                    </Link>

                    <Link href="/activity" className="flex flex-col items-center px-3 py-1 text-tm-muted hover:text-tm-text transition-colors">

                        <Bell className="w-4 h-4" />

                        <span className="text-[9px] mt-0.5">{t('dashboard.nav.activity')}</span>

                    </Link>

                    <Link href="/settings" className="flex flex-col items-center px-3 py-1 text-tm-muted hover:text-tm-text transition-colors">

                        <Settings className="w-4 h-4" />

                        <span className="text-[9px] mt-0.5">{t('dashboard.nav.settings')}</span>

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

    const { t } = useTranslation();

    return (

        <div className="glass-card p-4">

            <div className="flex items-center justify-between mb-3">

                <div className="flex items-center gap-2">

                    <Trophy className="w-4 h-4 text-yellow-400" />

                    <span className="font-semibold text-sm">{t('dashboard.progress.title')}</span>

                </div>

                <Link href="/leaderboard" className="text-tm-purple text-xs font-semibold">

                    {t('dashboard.progress.leaderboard')}

                </Link>

            </div>

            <div className="grid grid-cols-3 gap-2 mb-3">

                <div className="bg-orange-900/30 border border-orange-700/30 rounded-xl p-3 text-center">

                    <Flame className="w-5 h-5 text-orange-400 mx-auto mb-1" />

                    <p className="text-lg font-bold">{stats.streak}</p>

                    <p className="text-[10px] text-tm-muted">{t('dashboard.progress.streak')}</p>

                </div>

                <div className="bg-tm-green/10 border border-tm-green/20 rounded-xl p-3 text-center">

                    <Target className="w-5 h-5 text-tm-green mx-auto mb-1" />

                    <p className="text-lg font-bold text-tm-green">{stats.winRate}%</p>

                    <p className="text-[10px] text-tm-muted">{t('dashboard.progress.win_rate')}</p>

                </div>

                <div className="bg-tm-purple/10 border border-tm-purple/20 rounded-xl p-3 text-center">

                    <Medal className="w-5 h-5 text-tm-purple mx-auto mb-1" />

                    <p className="text-lg font-bold text-tm-purple">{stats.rank ?? '—'}</p>

                    <p className="text-[10px] text-tm-muted">{t('dashboard.progress.rank')}</p>

                </div>

            </div>

            <div className="flex items-center justify-between text-sm border-t border-white/5 pt-2">

                <span className="text-tm-muted">{t('dashboard.progress.total_profit')}</span>

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

    const { allSignals, removeSignal } = useSignalContext();

    const { t, i18n } = useTranslation();



    const { activeStrategy, setActiveStrategy, enabledStrategies } = useStrategyContext();

    const activeStrategyConfig = getStrategy(activeStrategy);



    const [data, setData] = useState<AccountData | null>(null);

    const [loading, setLoading] = useState(true);

    const [error, setError] = useState<string | null>(null);

    const [tastyLinked, setTastyLinked] = useState<boolean | null>(null);

    const [tastyUsername, setTastyUsername] = useState<string | null>(null);

    // Filter by the currently active strategy's key
    const coreSignals = allSignals.filter(s =>
        s.strategy?.toUpperCase() === activeStrategy.toUpperCase() ||
        // Temporary fallback for older 'rebalance' types that implicitly meant TQQQ_TURBOCORE
        ((s as any).type === 'REBALANCE' && activeStrategy === 'TQQQ_TURBOCORE' && s.strategy === undefined)
    ).slice(0, 1) as unknown as TurboCoreSignal[];

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





    const showToast = (msg: string, ok: boolean) => {
        setToast({ msg, ok });
        setTimeout(() => setToast(null), 3000);
    };





    // ── Execute TurboCore Rebalance ──
    const handleTurboCoreExecute = async (signal: TurboCoreSignal) => {
        setExecutingId(String(signal.id));
        setToast(null);

        try {
            if (data?.accountNumber) {
                // Tier 2a: Live Sync
                const endpoint = `/api/signals/${signal.id}/approve`;
                const payload = {
                    accountNumber: data.accountNumber,
                    signalDetails: signal
                };

                console.log("🚀 [DEBUG] Executing TurboCore Signal. ID:", signal.id);
                console.log("📦 [DEBUG] Payload Signal Details:", JSON.stringify(signal, null, 2));

                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    const errData = await response.json();
                    const errMsg = errData.message || errData.error || '';
                    if (errMsg.includes('already executed')) {
                        setToast({ msg: 'Signal was already executed. Removing from dashboard.', ok: true });
                        await removeSignal(String(signal.id));
                        return;
                    }
                    throw new Error(errMsg || 'Execution failed');
                }

                setToast({ msg: 'TurboCore Atomic Rebalance queued successfully', ok: true });
                await removeSignal(String(signal.id));
                fetchOrders();
                fetchAccountData(); // Immediately refresh positions matching user request
            } else {
                // Tier 2b: Shadow Sync Calculation
                if (!settings?.shadowLedger) {
                    throw new Error("No shadow ledger found. Please configure it in settings.");
                }

                const targetMatrix: Record<string, number> = {};
                signal.legs?.forEach(leg => {
                    targetMatrix[leg.symbol] = leg.target_pct;
                });

                const endpoint = '/api/calculate_delta_trade';
                const payload = {
                    targetMatrix,
                    shadowBalance: settings.shadowLedger.balance || 0,
                    shadowPositions: settings.shadowLedger.positions || {}
                };

                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    const errData = await response.json();
                    throw new Error(errData.error || errData.message || 'Shadow calculation failed');
                }

                const result = await response.json();
                console.log("Calculated Shadow Orders: ", result.orders);
                // For a polished experience, we'd open a modal here. For now, we resolve the signal and toast.
                setToast({ msg: `Shadow Sync: Calculated ${result.orders?.length || 0} manual trades. Check console logs.`, ok: true });
                await removeSignal(String(signal.id));
            }
        } catch (err: any) {
            console.error('Core Exec error:', err);
            setToast({ msg: err.message, ok: false });
        } finally {
            setExecutingId(null);
        }
    };







    // ── Polling loops ──
    useEffect(() => {
        if (!ready || !authenticated) return;
        fetchAccountData().then(acctData => { });
        const dataInterval = setInterval(fetchAccountData, 60000); // 1 min

        return () => {
            clearInterval(dataInterval);
        };
    }, [ready, authenticated, fetchAccountData]);

    useEffect(() => {
        if (!data?.accountNumber) return;
        fetchOrders(data.accountNumber);
        const orderInterval = setInterval(() => fetchOrders(data.accountNumber), 120000);
        return () => clearInterval(orderInterval);
    }, [data?.accountNumber]);



    // ── Loading state ──

    if (!ready || !authenticated || tastyLinked === null) {

        return (

            <main className="min-h-screen flex items-center justify-center">

                <div className="w-12 h-12 rounded-full bg-tm-purple/30 animate-pulse" />

            </main>

        );

    }



    // ── Not linked → show link screen ──

    if (tastyLinked === false && coreSignals.length === 0) {
        return <TastytradeLink onLinked={() => setTastyLinked(true)} />;
    }

    const refreshAll = () => { fetchAccountData(); };



    return (

        <main className="min-h-screen pb-24 max-w-lg mx-auto w-full border-x border-white/5 bg-tm-bg shadow-2xl relative flex flex-col">

            {/* TOP NAV */}

            <TopNav onLogout={logout} onRefresh={refreshAll} loading={loading} />

            <div className="flex-1 px-4 py-3 space-y-3 flex flex-col">



                {/* Welcome header */}

                <div className="flex items-center justify-between">

                    <div>

                        <p className="text-tm-muted text-xs">{t('dashboard.welcome')}</p>

                        <h1 className="text-base font-bold truncate">

                            {tastyUsername || user?.email?.address || t('dashboard.trader')}

                        </h1>

                    </div>

                    {/* Language Selector */}

                    <div className="flex items-center gap-1.5 p-1 rounded-full bg-tm-card border border-tm-border/50 shadow-inner">

                        <button

                            onClick={() => i18n.changeLanguage('en')}

                            className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all ${i18n.language?.startsWith('en') ? 'bg-tm-purple text-white shadow-md' : 'text-tm-muted hover:text-white/80 hover:bg-white/5'}`}

                        >

                            EN

                        </button>

                        <button

                            onClick={() => i18n.changeLanguage('es')}

                            className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all ${i18n.language?.startsWith('es') ? 'bg-tm-purple text-white shadow-md' : 'text-tm-muted hover:text-white/80 hover:bg-white/5'}`}

                        >

                            ES

                        </button>

                        <button

                            onClick={() => i18n.changeLanguage('zh')}

                            className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all ${i18n.language?.startsWith('zh') ? 'bg-tm-purple text-white shadow-md' : 'text-tm-muted hover:text-white/80 hover:bg-white/5'}`}

                        >

                            中

                        </button>

                    </div>

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

                        <button onClick={fetchAccountData} className="text-tm-purple text-xs flex-shrink-0">{t('dashboard.toast.retry')}</button>

                    </div>

                )}



                {/* Balance Card */}

                {tastyLinked && (

                    <div className="glass-card p-4">

                        <div className="flex items-center justify-between mb-1">

                            <div className="flex items-center gap-2 text-tm-muted">

                                <Wallet className="w-4 h-4" />

                                <span className="text-xs">{t('dashboard.net_liq')}</span>

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

                                ? <span className="animate-pulse text-tm-muted">{t('dashboard.toast.loading')}</span>

                                : `$${(data?.netLiquidatingValue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}

                        </p>

                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5 text-xs text-tm-muted">

                            <span>Principal: <span className="text-tm-text font-semibold">${settings.investmentPrincipal.toLocaleString()}</span></span>

                        </div>

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

                        <p className="font-semibold text-sm">{t('dashboard.auto_approve.title')}</p>

                        <p className="text-xs text-tm-muted">

                            {settings.autoApproval

                                ? t('dashboard.auto_approve.enabled')

                                : t('dashboard.auto_approve.disabled')}

                        </p>

                    </div>

                </button>



                {/* Trade Signals */}

                <div className="glass-card p-4">

                    <StrategyTabs
                        strategies={enabledStrategies}
                        activeKey={activeStrategy}
                        onChange={setActiveStrategy}
                    />

                    <div className="flex items-center justify-between mb-3 mt-4">
                        <h2 className="font-semibold text-sm">{activeStrategyConfig?.label || 'TurboCore'} Signals</h2>
                        {coreSignals.length > 0 && (
                            <span className="text-xs bg-tm-purple/20 text-tm-purple px-2 py-0.5 rounded-full">
                                {coreSignals.length} Active Target Change
                            </span>
                        )}
                    </div>

                    {/* Signals Pending Approval */}
                    <div className="md:col-span-8">

                        {coreSignals.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-6 gap-2 border border-white/5 rounded-xl bg-black/20">
                                <CheckCircle className="w-10 h-10 text-tm-green opacity-60" />
                                <p className="font-semibold text-sm">Portfolio Target Aligned</p>
                                <p className="text-xs text-tm-muted">No pending ML target rebalances requested.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {coreSignals.map(signal => (
                                    <TurboCoreSignalCard
                                        key={signal.id}
                                        signal={signal}
                                        onExecute={handleTurboCoreExecute}
                                        executingId={executingId}
                                        accountData={data}
                                        principalSetting={settings?.investmentPrincipal}
                                    />
                                ))}

                                {!tastyLinked && (
                                    <p className="text-xs text-tm-muted text-center pt-1">
                                        Not using Tastytrade? <span className="text-tm-purple">Track Only</span> monitors P&L without executing orders.
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

