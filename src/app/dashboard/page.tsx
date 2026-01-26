"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import {
    TrendingUp,
    Wallet,
    Activity,
    ChevronRight,
    LogOut,
    Bell,
    RefreshCw,
    AlertCircle,
    CheckCircle,
    Link2Off
} from "lucide-react";
import Link from "next/link";
import { TastytradeLink } from "@/components/TastytradeLink";

interface Position {
    symbol: string;
    underlying: string;
    type: string;
    quantity: number;
    entryPrice: number;
    currentPrice: number;
    unrealizedPnL: number;
    pnlPercent: number;
}

interface AccountData {
    accountNumber: string;
    balance: number;
    netLiquidatingValue: number;
    buyingPower: number;
    todayPnL: number;
    todayPnLPercent: number;
    positions: Position[];
    positionCount: number;
}

import { Suspense } from "react";

function DashboardContent() {
    const { ready, authenticated, logout, user } = usePrivy();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [data, setData] = useState<AccountData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [tastyLinked, setTastyLinked] = useState<boolean | null>(null);
    const [showLinkedSuccess, setShowLinkedSuccess] = useState(false);
    const [disconnecting, setDisconnecting] = useState(false);

    // Handle Tastytrade disconnect
    const handleDisconnect = async () => {
        if (!confirm("Are you sure you want to disconnect your Tastytrade account? You'll need to reconnect to approve trades.")) {
            return;
        }

        setDisconnecting(true);
        try {
            const response = await fetch('/api/tastytrade/disconnect', {
                method: 'POST',
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to disconnect');
            }

            // Reset state to show link screen
            setTastyLinked(false);
            setData(null);
        } catch (err) {
            console.error('Disconnect error:', err);
            setError(err instanceof Error ? err.message : 'Failed to disconnect');
        } finally {
            setDisconnecting(false);
        }
    };

    // Check for OAuth callback parameters
    useEffect(() => {
        const linked = searchParams.get("linked");
        const oauthError = searchParams.get("error");

        if (linked === "true") {
            setShowLinkedSuccess(true);
            setTastyLinked(true);
            // Clear URL params
            router.replace("/dashboard");
            // Hide success message after 3 seconds
            setTimeout(() => setShowLinkedSuccess(false), 3000);
        }

        if (oauthError) {
            setError(decodeURIComponent(oauthError));
            router.replace("/dashboard");
        }
    }, [searchParams, router]);

    // Check Tastytrade link status
    useEffect(() => {
        if (ready && authenticated && tastyLinked === null) {
            fetch("/api/tastytrade/status")
                .then((res) => res.json())
                .then((data) => {
                    setTastyLinked(data.linked);
                })
                .catch(() => {
                    setTastyLinked(false);
                });
        }
    }, [ready, authenticated, tastyLinked]);

    const fetchAccountData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch('/api/tastytrade/account');

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch account data');
            }

            const accountData = await response.json();
            setData(accountData);
            setLastUpdated(new Date());
        } catch (err) {
            console.error('Failed to fetch account:', err);
            setError(err instanceof Error ? err.message : 'Failed to load account data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (ready && !authenticated) {
            router.push("/");
        }
    }, [ready, authenticated, router]);

    useEffect(() => {
        if (ready && authenticated && tastyLinked) {
            fetchAccountData();

            // Auto-refresh every 30 seconds
            const interval = setInterval(fetchAccountData, 30000);
            return () => clearInterval(interval);
        }
    }, [ready, authenticated, tastyLinked, fetchAccountData]);

    // Show loading while checking auth and link status
    if (!ready || !authenticated || tastyLinked === null) {
        return (
            <main className="min-h-screen flex items-center justify-center">
                <div className="animate-pulse">
                    <div className="w-12 h-12 rounded-full bg-tm-purple/30" />
                </div>
            </main>
        );
    }

    // Show Tastytrade link modal if not linked
    if (tastyLinked === false) {
        return <TastytradeLink onLinked={() => setTastyLinked(true)} />;
    }

    // Win rate would come from trade history - using placeholder for now
    const winRate = 73;

    return (
        <main className="min-h-screen pb-20">
            {/* Header */}
            <header className="px-6 pt-12 pb-6 flex items-center justify-between">
                <div>
                    <p className="text-tm-muted text-sm">Welcome back</p>
                    <h1 className="text-xl font-bold">
                        {user?.email?.address?.split("@")[0] || "Trader"}
                    </h1>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchAccountData}
                        disabled={loading}
                        className="w-10 h-10 rounded-full bg-tm-surface flex items-center justify-center"
                    >
                        <RefreshCw className={`w-5 h-5 text-tm-muted ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button className="w-10 h-10 rounded-full bg-tm-surface flex items-center justify-center">
                        <Bell className="w-5 h-5 text-tm-muted" />
                    </button>
                    <button
                        onClick={logout}
                        className="w-10 h-10 rounded-full bg-tm-surface flex items-center justify-center"
                    >
                        <LogOut className="w-5 h-5 text-tm-muted" />
                    </button>
                </div>
            </header>

            {/* Success Toast */}
            {showLinkedSuccess && (
                <div className="px-6 mb-6">
                    <div className="glass-card p-4 border border-tm-green/30 flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-tm-green flex-shrink-0" />
                        <p className="text-tm-green font-medium">Tastytrade account linked successfully!</p>
                    </div>
                </div>
            )}

            {/* Error State */}
            {error && (
                <div className="px-6 mb-6">
                    <div className="glass-card p-4 border border-tm-red/30 flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-tm-red flex-shrink-0" />
                        <div className="flex-1">
                            <p className="text-tm-red font-medium">Error loading data</p>
                            <p className="text-sm text-tm-muted">{error}</p>
                        </div>
                        <div className="flex gap-2">
                            {error.toLowerCase().includes('session') || error.toLowerCase().includes('reconnect') ? (
                                <button
                                    onClick={() => setTastyLinked(false)}
                                    className="text-sm text-tm-purple font-medium hover:underline"
                                >
                                    Reconnect Tastytrade
                                </button>
                            ) : (
                                <button
                                    onClick={fetchAccountData}
                                    className="text-sm text-tm-purple"
                                >
                                    Retry
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Balance Card */}
            <div className="px-6 mb-6">
                <div className="glass-card p-6">
                    <div className="flex items-center gap-2 text-tm-muted mb-2">
                        <Wallet className="w-4 h-4" />
                        <span className="text-sm">Net Liquidating Value</span>
                        {data?.accountNumber && (
                            <span className="text-xs ml-auto">Acct: {data.accountNumber}</span>
                        )}
                    </div>
                    <h2 className="text-4xl font-bold font-mono mb-4">
                        {loading && !data ? (
                            <span className="animate-pulse">Loading...</span>
                        ) : (
                            `$${(data?.netLiquidatingValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        )}
                    </h2>

                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-tm-muted">Today&apos;s P&amp;L</p>
                            <p className={`text-xl font-semibold font-mono ${(data?.todayPnL || 0) >= 0 ? 'profit-glow' : 'loss-glow'}`}>
                                {(data?.todayPnL || 0) >= 0 ? '+' : ''}${(data?.todayPnL || 0).toFixed(2)}
                                <span className="text-sm ml-1">({(data?.todayPnLPercent || 0).toFixed(2)}%)</span>
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-tm-muted">Win Rate</p>
                            <div className="flex items-center gap-2">
                                <div className="relative w-12 h-12">
                                    <svg className="w-12 h-12 transform -rotate-90">
                                        <circle
                                            className="text-tm-surface"
                                            strokeWidth="4"
                                            stroke="currentColor"
                                            fill="transparent"
                                            r="20"
                                            cx="24"
                                            cy="24"
                                        />
                                        <circle
                                            className="text-tm-green"
                                            strokeWidth="4"
                                            strokeDasharray={`${winRate * 1.26} 126`}
                                            strokeLinecap="round"
                                            stroke="currentColor"
                                            fill="transparent"
                                            r="20"
                                            cx="24"
                                            cy="24"
                                        />
                                    </svg>
                                    <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">
                                        {winRate}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {lastUpdated && (
                        <p className="text-xs text-tm-muted mt-4">
                            Last updated: {lastUpdated.toLocaleTimeString()}
                        </p>
                    )}

                    {/* Disconnect Tastytrade Button */}
                    <div className="mt-4 pt-4 border-t border-white/10">
                        <button
                            onClick={handleDisconnect}
                            disabled={disconnecting}
                            className="flex items-center gap-2 text-sm text-tm-muted hover:text-tm-red transition-colors"
                        >
                            <Link2Off className="w-4 h-4" />
                            {disconnecting ? 'Disconnecting...' : 'Disconnect Tastytrade'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="px-6 mb-6">
                <div className="grid grid-cols-2 gap-4">
                    <Link href="/signals" className="glass-card p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-tm-purple/20 flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-tm-purple" />
                        </div>
                        <div>
                            <p className="font-semibold">Signals</p>
                            <p className="text-sm text-tm-green">View trades</p>
                        </div>
                    </Link>
                    <Link href="/positions" className="glass-card p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-tm-green/20 flex items-center justify-center">
                            <Activity className="w-5 h-5 text-tm-green" />
                        </div>
                        <div>
                            <p className="font-semibold">Positions</p>
                            <p className="text-sm text-tm-muted">{data?.positionCount || 0} open</p>
                        </div>
                    </Link>
                </div>
            </div>

            {/* Open Positions */}
            <div className="px-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Open Positions</h3>
                    <Link href="/positions" className="text-sm text-tm-purple flex items-center gap-1">
                        View all <ChevronRight className="w-4 h-4" />
                    </Link>
                </div>

                <div className="space-y-3">
                    {loading && !data ? (
                        <div className="glass-card p-4 animate-pulse">
                            <div className="h-4 bg-tm-surface rounded w-1/3 mb-2" />
                            <div className="h-3 bg-tm-surface rounded w-1/4" />
                        </div>
                    ) : data?.positions && data.positions.length > 0 ? (
                        data.positions.slice(0, 5).map((pos, i) => (
                            <div key={i} className="glass-card p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-tm-surface flex items-center justify-center font-bold text-sm">
                                        {(pos.underlying || pos.symbol).slice(0, 2)}
                                    </div>
                                    <div>
                                        <p className="font-semibold">{pos.underlying || pos.symbol}</p>
                                        <p className="text-sm text-tm-muted">{pos.type} × {pos.quantity}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`font-mono font-semibold ${pos.unrealizedPnL >= 0 ? 'text-tm-green' : 'text-tm-red'}`}>
                                        {pos.unrealizedPnL >= 0 ? '+' : ''}${pos.unrealizedPnL.toFixed(2)}
                                    </p>
                                    <p className="text-sm text-tm-muted">
                                        {pos.pnlPercent >= 0 ? '+' : ''}{pos.pnlPercent.toFixed(2)}%
                                    </p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="glass-card p-6 text-center">
                            <p className="text-tm-muted">No open positions</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Nav */}
            <nav className="fixed bottom-0 left-0 right-0 bg-tm-surface/90 backdrop-blur-lg border-t border-white/5 px-6 py-4">
                <div className="flex items-center justify-around">
                    <NavItem icon={<Wallet />} label="Home" active />
                    <NavItem icon={<TrendingUp />} label="Signals" href="/signals" />
                    <NavItem icon={<Activity />} label="Positions" href="/positions" />
                </div>
            </nav>
        </main>
    );
}

export default function Dashboard() {
    return (
        <Suspense fallback={
            <main className="min-h-screen flex items-center justify-center">
                <div className="animate-pulse">
                    <div className="w-12 h-12 rounded-full bg-tm-purple/30" />
                </div>
            </main>
        }>
            <DashboardContent />
        </Suspense>
    );
}

function NavItem({
    icon,
    label,
    active = false,
    href = "#"
}: {
    icon: React.ReactNode;
    label: string;
    active?: boolean;
    href?: string;
}) {
    const content = (
        <div className={`flex flex-col items-center gap-1 ${active ? 'text-tm-purple' : 'text-tm-muted'}`}>
            <div className="w-6 h-6">{icon}</div>
            <span className="text-xs">{label}</span>
        </div>
    );

    return href === "#" ? content : <Link href={href}>{content}</Link>;
}

