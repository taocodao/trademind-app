'use client';

export const dynamic = 'force-dynamic';



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

    Crown,

    Clock,

    ArrowRight,

    Share2,

    Gift,

} from 'lucide-react';

import Image from 'next/image';

import Link from 'next/link';

import { useSettings } from '@/components/providers/SettingsProvider';

import { useSignalContext } from '@/components/providers/SignalProvider';

import { useStrategyContext } from '@/components/providers/StrategyContext';

import { StrategyTabs } from '@/components/ui/StrategyTabs';

import { OnboardingWelcomeModal } from '@/components/dashboard/OnboardingWelcomeModal';

import { getStrategy } from '@/lib/strategies';

import { TastytradeLink } from '@/components/TastytradeLink';

import { TQQQStatusBanner } from '@/components/dashboard/TQQQStatusBanner';

import { TurboCoreSignalCard, type TurboCoreSignal } from '@/components/signals/TurboCoreSignalCard';

import { QQQLEAPSSignalCard, isQQQLEAPSSignal } from '@/components/signals/QQQLEAPSSignalCard';

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

    const { t, i18n } = useTranslation();

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

    const { ready, authenticated, logout, user, getAccessToken } = usePrivy();

    const router = useRouter();

    const { settings, setAutoApproval, setLanguage } = useSettings();

    const { allSignals, removeSignal, updateSignalExecution } = useSignalContext();

    const { t, i18n } = useTranslation();



    const { activeStrategy, setActiveStrategy, enabledStrategies } = useStrategyContext();

    const activeStrategyConfig = getStrategy(activeStrategy);

    // Sync user email on dashboard load
    useEffect(() => {
        if (!ready || !authenticated || !user) return;
        const emailSynced = sessionStorage.getItem('tm_email_synced');
        if (emailSynced === '1') return;

        // Try getting exact email from Privy user object
        const userEmail = 
            user.email?.address || 
            (user as any).google?.email || 
            (user as any).apple?.email ||
            (user.linkedAccounts?.find((a: any) => a.type === 'google_oauth') as any)?.email ||
            (user.linkedAccounts?.find((a: any) => a.type === 'apple_oauth') as any)?.email ||
            (user.linkedAccounts?.find((a: any) => a.type === 'email') as any)?.address;

        if (userEmail) {
            fetch('/api/settings/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: userEmail }),
            })
            .then(res => { if (res.ok) sessionStorage.setItem('tm_email_synced', '1'); })
            .catch(() => {});
        }
    }, [ready, authenticated, user]);

    const [data, setData] = useState<AccountData | null>(null);

    const [loading, setLoading] = useState(true);

    const [error, setError] = useState<string | null>(null);

    const [tastyLinked, setTastyLinked] = useState<boolean | null>(null);

    const [tastyUsername, setTastyUsername] = useState<string | null>(null);

    // Filter by the currently active strategy's key AND ensure it is from today
    const coreSignals = allSignals.filter(s => {
        const isMatch = s.strategy?.toUpperCase() === activeStrategy.toUpperCase() ||
            // Temporary fallback for older 'rebalance' types that implicitly meant TQQQ_TURBOCORE
            ((s as any).type === 'REBALANCE' && activeStrategy === 'TQQQ_TURBOCORE' && s.strategy === undefined);
            
        if (!isMatch) return false;

        // Strictly enforce that the signal was generated today (local browser time)
        const signalDate = new Date(s.createdAt || (s as any).timestamp || Date.now());
        const today = new Date();
        return signalDate.toDateString() === today.toDateString();
    }).slice(0, 1) as unknown as TurboCoreSignal[];

    const [recentOrders, setRecentOrders] = useState<any[]>([]);

    const [executingId, setExecutingId] = useState<string | null>(null);

    const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);



    const [gamStats, setGamStats] = useState<GamStats>({ streak: 0, winRate: 0, rank: null, totalProfit: 0 });

    // ── Virtual balance & positions (always fetched from DB-backed virtual account) ──
    const [virtualBalance, setVirtualBalance] = useState<number>(25000);
    const [shadowPositions, setShadowPositions] = useState<Record<string, number>>({});

    // ── Membership info ──
    const [membership, setMembership] = useState<{
        tier: string; status: string | null; billingInterval: string | null;
        currentPeriodEnd: string | null; trialEnd: string | null;
        cancelAtPeriodEnd: boolean; cancelAt: string | null; fetched: boolean;
        // Trial fields
        appTrialStatus: string | null;
        appTrialEnd: string | null;
        appTrialAvailable: boolean;
        appTrialCount: number;
        appTrialTier: string;
        trialDaysTotal: number;
    }>({
        tier: 'observer', status: null, billingInterval: null, currentPeriodEnd: null, trialEnd: null,
        cancelAtPeriodEnd: false, cancelAt: null, fetched: false,
        appTrialStatus: null, appTrialEnd: null, appTrialAvailable: false,
        appTrialCount: 0, appTrialTier: 'both_bundle', trialDaysTotal: 14,
    });



    // ── Auth guard ──

    useEffect(() => {

        if (ready && !authenticated) router.push('/');

    }, [ready, authenticated, router]);

    // ── Fetch virtual balance + shadow positions for signal card allocation ──
    useEffect(() => {
        if (!ready || !authenticated) return;
        // Fetch virtual balance
        fetch(`/api/virtual-accounts?strategy=${activeStrategy}`)
            .then(r => r.json())
            .then(d => { if (d.nlv || d.balance) setVirtualBalance(Number(d.nlv || d.balance)); })
            .catch(() => {});
        // Fetch shadow positions for delta preview
        fetch(`/api/shadow-positions?strategy=${activeStrategy}`)
            .then(r => r.json())
            .then(d => {
                const map: Record<string, number> = {};
                (d.positions || []).forEach((p: any) => { map[p.symbol] = Number(p.quantity); });
                setShadowPositions(map);
            })
            .catch(() => {});
    }, [ready, authenticated, activeStrategy]);



    // ── Resume pending Stripe checkout after Privy login ──

    useEffect(() => {

        if (!ready || !authenticated) return;

        const pendingTierId = typeof window !== 'undefined' ? sessionStorage.getItem('pendingTierUrl') : null;

        if (!pendingTierId) return;

        sessionStorage.removeItem('pendingTierUrl');

        const isAnnual = sessionStorage.getItem('pendingTierAnnual') === 'true';

        sessionStorage.removeItem('pendingTierAnnual');

        const priceId = pendingTierId;

        // Small delay to let Privy fully establish the session

        const timer = setTimeout(async () => {

            try {

                const token = await getAccessToken();

                const res = await fetch('/api/stripe/checkout', {

                    method: 'POST',

                    headers: {

                        'Content-Type': 'application/json',

                        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),

                    },

                    body: JSON.stringify({ priceId, isAnnual, locale: i18n.language }),

                });

                const data = await res.json();

                if (data.url) window.location.href = data.url;

            } catch (err) {

                console.error('Pending checkout failed:', err);

            }

        }, 600);

        return () => clearTimeout(timer);

    }, [ready, authenticated]);



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

            // Fetch membership and auto-start trial for new users
            getAccessToken().then(token => {
                const authHeader: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {};
                fetch('/api/settings/tier', { headers: authHeader })
                    .then(r => r.json())
                    .then(d => {
                        setMembership(prev => ({ ...prev, ...d, fetched: true }));
                        // Auto-start the first free trial if not yet started and no Stripe sub
                        if (
                            (d.appTrialStatus === 'not_started' || !d.appTrialStatus) &&
                            d.appTrialAvailable &&
                            d.tier === 'observer'
                        ) {
                            fetch('/api/settings/start-trial', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', ...authHeader },
                                body: JSON.stringify({ isSecondTrial: false }),
                            })
                                .then(r => r.json())
                                .then(trialData => {
                                    if (trialData.success) {
                                        // Refresh membership with new trial state
                                        fetch('/api/settings/tier', { headers: authHeader })
                                            .then(r => r.json())
                                            .then(d2 => setMembership(prev => ({ ...prev, ...d2, fetched: true })));
                                    }
                                })
                                .catch(e => console.error('Trial auto-start failed:', e));
                        }
                    })
                    .catch(e => { console.error(e); setMembership(prev => ({ ...prev, fetched: true })); });
            });

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



            // Step 1: Get account number — skip silently if user has no TT tokens

            const acctRes = await fetch('/api/tastytrade/account');

            if (!acctRes.ok) {

                if (acctRes.status === 401) {
                    // No TT connection — this is normal for virtual-only users. Don't show error.
                    setData(null);
                    return;
                }

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

                const liveResult = await response.json();
                const liveOrderId = liveResult.orderId || liveResult.order_id || null;
                setToast({ msg: 'TurboCore Atomic Rebalance queued successfully', ok: true });
                // Flip card to Executed immediately — same as auto-approve path
                updateSignalExecution(String(signal.id), liveOrderId);
                fetchOrders();
                fetchAccountData(); // Immediately refresh positions matching user request
            } else {
                // Tier 2b: Virtual Sync — no Tastytrade connected
                // The approve route automatically detects missing TT tokens and runs
                // buildVirtualOrdersFromSignal → /api/virtual-accounts/execute
                const endpoint = `/api/signals/${signal.id}/approve`;
                const payload = { signalDetails: signal };

                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    const errData = await response.json();
                    const errMsg = errData.message || errData.error || '';
                    if (errMsg.includes('already executed') || errData.status === 'already_executed') {
                        setToast({ msg: 'Signal was already executed. Removing from dashboard.', ok: true });
                        await removeSignal(String(signal.id));
                        return;
                    }
                    throw new Error(errMsg || 'Virtual execution failed');
                }

                setToast({ msg: `Virtual Execution Complete — Positions updated!`, ok: true });
                // Flip card to Executed immediately — same as auto-approve path
                updateSignalExecution(String(signal.id), null);
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



    // Note: Users without Tastytrade see the dashboard with virtual account features.
    // They can connect Tastytrade from Settings at any time.

    const refreshAll = () => { fetchAccountData(); };



    return (

        <main className="min-h-screen pb-24 max-w-4xl mx-auto w-full border-x border-white/5 bg-tm-bg shadow-2xl relative flex flex-col">

            <OnboardingWelcomeModal />

            {/* TOP NAV */}

            <TopNav onLogout={logout} onRefresh={refreshAll} loading={loading} />

            <div className="flex-1 px-4 py-3 space-y-3 flex flex-col">



                {/* Header — Logo + Language Selector */}

                <div className="glass-card p-3 flex items-center gap-3">

                    {/* TradeMind Logo / Refer Link */}
                    <Link href="/refer" className="relative flex items-center gap-2 shrink-0 hover:scale-[1.02] active:scale-[0.98] transition-all bg-gradient-to-br from-tm-purple/10 to-transparent border border-tm-purple/30 rounded-xl pl-1 pr-2.5 py-1.5 shadow-[0_4px_20px_rgba(168,85,247,0.15)] ring-1 ring-white/5 group">
                        <Image
                            src="/Trade mind logo.png"
                            alt="TradeMind"
                            width={160}
                            height={48}
                            priority
                            className="h-12 w-auto object-contain drop-shadow-md group-hover:drop-shadow-[0_0_8px_rgba(168,85,247,0.4)] transition-all"
                        />
                        <div className="flex flex-col justify-center">
                            <span className="text-[10px] font-black uppercase tracking-wider text-tm-purple leading-tight">{t('dashboard.nav.refer', 'Refer')}</span>
                            <span className="text-xs font-bold text-white flex items-center gap-1 leading-none shadow-sm">
                                & {t('dashboard.refer_earn_badge', 'Earn')} <span className="text-sm border flex items-center justify-center p-0.5 rounded shadow-sm bg-white/10 border-white/20 -mt-0.5">🎁</span>
                            </span>
                        </div>
                    </Link>

                    {/* Setup Guide — mobile pill */}
                    <button
                        onClick={() => window.dispatchEvent(new Event('open-onboarding'))}
                        className="flex sm:hidden items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-blue-500 to-tm-purple text-white hover:opacity-90 transition-all text-[10px] font-bold border border-white/20 shadow-md whitespace-nowrap"
                    >
                        <Bell className="w-3 h-3" />
                        <span>{t('dashboard.setup_short', 'Setup')}</span>
                    </button>

                    {/* Setup Guide — desktop */}
                    <button
                        onClick={() => window.dispatchEvent(new Event('open-onboarding'))}
                        className="hidden sm:flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-blue-500 to-tm-purple text-white hover:opacity-90 transition-all text-sm font-bold border border-white/20 shadow-lg shadow-tm-purple/30 whitespace-nowrap shrink-0"
                    >
                        <Bell className="w-4 h-4" />
                        <span>{t('dashboard.setup_guide', 'Setup Guide')}</span>
                    </button>

                    {/* Language Selector */}
                    <div className="flex items-center gap-1 p-1 rounded-full bg-black/40 border border-white/5 shadow-inner shrink-0 ml-auto">
                        <button
                            onClick={() => setLanguage('en')}
                            className={`flex items-center justify-center w-7 h-7 rounded-full text-[10px] font-bold transition-all ${i18n.language?.startsWith('en') ? 'bg-tm-purple text-white shadow-md' : 'text-tm-muted hover:text-white/80 hover:bg-white/5'}`}
                        >EN</button>
                        <button
                            onClick={() => setLanguage('es')}
                            className={`flex items-center justify-center w-7 h-7 rounded-full text-[10px] font-bold transition-all ${i18n.language?.startsWith('es') ? 'bg-tm-purple text-white shadow-md' : 'text-tm-muted hover:text-white/80 hover:bg-white/5'}`}
                        >ES</button>
                        <button
                            onClick={() => setLanguage('zh')}
                            className={`flex items-center justify-center w-7 h-7 rounded-full text-[10px] font-bold transition-all ${i18n.language?.startsWith('zh') ? 'bg-tm-purple text-white shadow-md' : 'text-tm-muted hover:text-white/80 hover:bg-white/5'}`}
                        >中</button>
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

                {!membership.fetched ? (
                    <div className="flex flex-col items-center justify-center py-10">
                        <div className="w-8 h-8 rounded-full border-2 border-tm-purple/30 border-t-tm-purple animate-spin" />
                    </div>
                ) : (() => {
                    const trialActive = membership.appTrialStatus === 'active' || membership.appTrialStatus === 'second_trial_active';
                    const trialExpired = membership.appTrialStatus === 'expired';
                    const isSubscribed = !['observer', null].includes(membership.tier) || trialActive;

                    // ── Trial countdown banner ────────────────────────────────
                    const TrialBanner = trialActive && membership.appTrialEnd ? (() => {
                        const daysLeft = Math.max(0, Math.ceil((new Date(membership.appTrialEnd).getTime() - Date.now()) / 86400000));
                        const trialNum = membership.appTrialStatus === 'second_trial_active' ? 2 : 1;
                        return (
                            <div className="glass-card p-3 flex items-center gap-3 border-tm-purple/30 bg-gradient-to-r from-tm-purple/10 to-blue-500/10">
                                <div className="w-8 h-8 rounded-full bg-tm-purple/20 flex items-center justify-center shrink-0">
                                    <span className="text-sm">🎉</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-white">
                                        {t('dashboard.trial_banner', 'Free Trial #{{trialNum}} — {{tier}} Access', { trialNum, tier: membership.appTrialTier.replace('_', ' ') })}
                                    </p>
                                    <p className="text-[10px] text-tm-muted">
                                        {daysLeft > 0 ? t(daysLeft === 1 ? 'dashboard.days_remaining' : 'dashboard.days_remaining_plural', '{{days}} days remaining · No credit card needed yet', { days: daysLeft }) : t('dashboard.expires_today', 'Expires today!')}
                                    </p>
                                </div>
                                <a href="https://www.trademind.bot/#pricing" className="text-[10px] font-bold text-tm-purple hover:underline whitespace-nowrap shrink-0">{t('dashboard.choose_plan', 'Choose a Plan →')}</a>
                            </div>
                        );
                    })() : null;

                    // ── Trial expired but second trial available ───────────────
                    const SecondTrialCTA = trialExpired && membership.appTrialAvailable ? (
                        <div className="glass-card p-5 flex flex-col items-center justify-center text-center border-yellow-500/20 bg-yellow-500/5">
                            <span className="text-2xl mb-2">⏳</span>
                            <h2 className="text-base font-bold mb-1">{t('dashboard.trial_ended', 'Your Free Trial Has Ended')}</h2>
                            <p className="text-xs text-tm-muted mb-4 max-w-sm">
                                {t('dashboard.trial_ended_desc', "Welcome back! As a special offer, you're eligible for one more {{days}}-day free trial — no credit card required.", { days: membership.trialDaysTotal })}
                            </p>
                            <div className="flex flex-col gap-2 w-full">
                                <button
                                    onClick={async () => {
                                        const token = await getAccessToken();
                                        const authHeader: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {};
                                        const r = await fetch('/api/settings/start-trial', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json', ...authHeader },
                                            body: JSON.stringify({ isSecondTrial: true }),
                                        });
                                        const data = await r.json();
                                        if (data.success) {
                                            const tierRes = await fetch('/api/settings/tier', { headers: authHeader });
                                            const tierData = await tierRes.json();
                                            setMembership(prev => ({ ...prev, ...tierData, fetched: true }));
                                        }
                                    }}
                                    className="btn-primary flex items-center gap-2 px-6 py-2.5 w-full justify-center text-sm"
                                >
                                    {t('dashboard.claim_second_trial', '🎁 Claim My Second Free Trial')}
                                </button>
                                <a href="https://www.trademind.bot/#pricing" className="text-xs text-tm-muted text-center hover:text-white transition-colors">{t('dashboard.subscribe_now', 'Or subscribe now →')}</a>
                            </div>
                        </div>
                    ) : null;

                    // ── Hard paywall: both trials expired & no subscription ────
                    const HardPaywall = trialExpired && !membership.appTrialAvailable ? (
                        <div className="glass-card p-6 flex flex-col items-center justify-center text-center mt-4 border-tm-purple/20">
                            <div className="w-16 h-16 rounded-full bg-tm-purple/10 flex items-center justify-center mb-4 border border-tm-purple/20">
                                <Target className="w-8 h-8 text-tm-purple" />
                            </div>
                            <h2 className="text-xl font-bold mb-2">{t('dashboard.hard_paywall_title', 'Continue with TradeMind')}</h2>
                            <p className="text-sm text-tm-muted mb-6 max-w-sm">
                                {t('dashboard.hard_paywall_desc', "You've used your free trials. Subscribe to keep access to AI-powered signals, real-time targets, and portfolio backtests.")}
                            </p>
                            <a href="https://www.trademind.bot/#pricing" className="btn-primary flex items-center gap-2 px-6 py-3 w-full justify-center text-sm">
                                {t('dashboard.view_plans', 'View Subscription Plans')}
                                <ArrowRight className="w-4 h-4 text-white/50" />
                            </a>
                        </div>
                    ) : null;

                    // ── First-time observer with trial not yet started ─────────
                    // (shouldn't normally show — auto-start handles this — but fallback)
                    const NotStartedCTA = !trialActive && !trialExpired && membership.tier === 'observer' ? (
                        <div className="glass-card p-6 flex flex-col items-center justify-center text-center mt-4 border-tm-purple/20">
                            <div className="w-16 h-16 rounded-full bg-tm-purple/10 flex items-center justify-center mb-4 border border-tm-purple/20">
                                <Target className="w-8 h-8 text-tm-purple" />
                            </div>
                            <h2 className="text-xl font-bold mb-2">{t('dashboard.trial_starting', 'Starting Your Free Trial…')}</h2>
                            <p className="text-sm text-tm-muted mb-4">{t('dashboard.trial_setting_up', 'Hold on one moment while we set up your {{days}}-day free access.', { days: membership.trialDaysTotal })}</p>
                            <div className="w-6 h-6 rounded-full border-2 border-tm-purple/30 border-t-tm-purple animate-spin" />
                        </div>
                    ) : null;

                    return (
                        <>
                            {TrialBanner}
                            {SecondTrialCTA}
                            {HardPaywall}
                            {NotStartedCTA}
                            {/* Rest of dashboard only shown when user has access */}
                            {isSubscribed && !trialExpired && !SecondTrialCTA && !HardPaywall ? (
                    <>
                        {/* Subscription Badge */}
                        <a href="/settings" className="glass-card p-3 flex items-center justify-between group">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-tm-purple/20 flex items-center justify-center">
                                    <Crown className="w-4 h-4 text-tm-purple" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-white">
                                        {{ turbocore: 'TurboCore', turbocore_pro: 'TurboCore Pro', both_bundle: 'Both Bundle' }[membership.tier] || membership.tier}
                                    </p>
                                    <div className="flex items-center gap-1.5">
                                        <span className={`w-1.5 h-1.5 rounded-full ${
                                            membership.status === 'active' ? 'bg-tm-green' :
                                            membership.status === 'trialing' ? 'bg-yellow-400 animate-pulse' : 'bg-tm-red'
                                        }`} />
                                        <span className={`text-[10px] font-semibold ${
                                            membership.status === 'active' ? 'text-tm-green' :
                                            membership.status === 'trialing' ? 'text-yellow-400' : 'text-tm-red'
                                        }`}>
                                        {(() => {
                                            const daysLeft = membership.trialEnd
                                                ? Math.max(0, Math.round((new Date(membership.trialEnd).getTime() - Date.now()) / 86400000))
                                                : 0;
                                            const renewDate = membership.currentPeriodEnd
                                                ? new Date(membership.currentPeriodEnd).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' })
                                                : '';
                                            const cancelDate = (membership.cancelAt || membership.currentPeriodEnd)
                                                ? new Date((membership.cancelAt || membership.currentPeriodEnd)!).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' })
                                                : '';

                                            if (membership.status === 'trialing') {
                                                return membership.cancelAtPeriodEnd
                                                    ? t('dashboard.badge_cancels', 'Cancels {{date}}', { date: cancelDate })
                                                    : t('dashboard.badge_trial_left', 'Trial · {{days}}d left', { days: daysLeft });
                                            }
                                            if (membership.status === 'active') {
                                                return membership.cancelAtPeriodEnd
                                                    ? t('dashboard.badge_cancels', 'Cancels {{date}}', { date: cancelDate })
                                                    : t('dashboard.badge_active_renews', 'Active · Renews {{date}}', { date: renewDate });
                                            }
                                            if (membership.status === 'past_due') return t('dashboard.badge_past_due', 'Past Due');
                                            return membership.status || '';
                                        })()
                                        }
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-tm-muted group-hover:text-tm-purple transition-colors">
                                <Clock className="w-3 h-3" />
                                <span>{membership.billingInterval === 'year' ? t('dashboard.billing_annual', 'Annual') : t('dashboard.billing_monthly', 'Monthly')}</span>
                            </div>
                        </a>



                {/* Your Progress */}
                {/* <ProgressCard stats={gamStats} /> */}

                {/* Auto-Approve Toggle — writes to DB, consistent with Settings page */}

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
                        <h2 className="font-semibold text-sm">{t('dashboard.signals_header', '{{strategy}} Signals', { strategy: activeStrategyConfig?.label || 'TurboCore' })}</h2>
                        {coreSignals.length > 0 && (
                            <span className="text-xs bg-tm-purple/20 text-tm-purple px-2 py-0.5 rounded-full">
                                {t(coreSignals.length === 1 ? 'dashboard.active_target_change' : 'dashboard.active_target_change_plural', '{{count}} Active Target Change', { count: coreSignals.length })}
                            </span>
                        )}
                    </div>

                    {/* Signals Pending Approval */}
                    <div className="md:col-span-8">

                        {coreSignals.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-6 gap-2 border border-white/5 rounded-xl bg-black/20">
                                <CheckCircle className="w-10 h-10 text-tm-green opacity-60" />
                                <p className="font-semibold text-sm">{t('dashboard.aligned_title', 'Portfolio Target Aligned')}</p>
                                <p className="text-xs text-tm-muted">
                                    {activeStrategy === 'QQQ_LEAPS'
                                        ? t('dashboard.leaps_aligned_desc', 'No entry or exit signal today — regime not triggering.')
                                        : t('dashboard.aligned_desc', 'No pending ML target rebalances requested.')}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {coreSignals.map(signal =>
                                    activeStrategy === 'QQQ_LEAPS' || isQQQLEAPSSignal(signal) ? (
                                        <QQQLEAPSSignalCard
                                            key={signal.id}
                                            signal={signal as any}
                                            onExecute={handleTurboCoreExecute as any}
                                            executingId={executingId}
                                            isExecuted={signal.userExecution != null && signal.userExecution.status === 'executed'}
                                        />
                                    ) : (
                                        <TurboCoreSignalCard
                                            key={signal.id}
                                            signal={signal}
                                            onExecute={handleTurboCoreExecute}
                                            executingId={executingId}
                                            isExecuted={signal.userExecution != null && signal.userExecution.status === 'executed'}
                                            accountData={data}
                                            principalSetting={25000}
                                            shadowBalance={virtualBalance}
                                            shadowPositions={shadowPositions}
                                        />
                                    )
                                )}

                                {!tastyLinked && (
                                    <div className="text-xs text-tm-muted text-center pt-1" dangerouslySetInnerHTML={{ __html: t('dashboard.track_only_notice', 'Not using Tastytrade? <span class="text-tm-purple">Track Only</span> monitors P&L without executing orders.') }} />
                                )}
                            </div>
                        )}
                    </div>
                </div>

                    </>
                    ) : null}
                        </>
                    );
                })()}

            </div>

            {/* Share FAB — floating referral entry point, above bottom nav */}
            <Link
                href="/refer"
                aria-label="Share & Earn"
                className="fixed bottom-24 right-4 z-50 w-14 h-14 bg-tm-purple rounded-full flex items-center justify-center shadow-[0_0_24px_rgba(168,85,247,0.55)] hover:shadow-[0_0_36px_rgba(168,85,247,0.8)] hover:scale-110 active:scale-95 transition-all duration-200"
            >
                <Gift className="w-6 h-6 text-white" />
            </Link>

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

