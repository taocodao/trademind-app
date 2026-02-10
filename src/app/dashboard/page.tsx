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
    Link2Off,
    Settings
} from "lucide-react";
import Link from "next/link";
import { TastytradeLink } from "@/components/TastytradeLink";
import { GamificationCard } from "@/components/gamification/GamificationCard";
import { CircuitBreakerBanner } from "@/components/diagonal/CircuitBreakerBanner";

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
    const [tastyUsername, setTastyUsername] = useState<string | null>(null);
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
                    if (data.username) {
                        setTastyUsername(data.username);
                    }
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
            {/* Header - Compact */}
            <header className="px-4 pt-8 pb-3 flex items-center justify-between">
                <div>
                    <p className="text-tm-muted text-xs">Welcome back</p>
                    <h1 className="text-lg font-bold truncate max-w-[180px]">
                        {tastyUsername || user?.email?.address || "Trader"}
                    </h1>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchAccountData}
                        disabled={loading}
                        className="w-9 h-9 rounded-full bg-tm-surface flex items-center justify-center"
                    >
                        <RefreshCw className={`w-4 h-4 text-tm-muted ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button className="w-9 h-9 rounded-full bg-tm-surface flex items-center justify-center">
                        <Bell className="w-4 h-4 text-tm-muted" />
                    </button>
                    <button
                        onClick={logout}
                        className="w-9 h-9 rounded-full bg-tm-surface flex items-center justify-center"
                    >
                        <LogOut className="w-4 h-4 text-tm-muted" />
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

            {/* Circuit Breaker Status Banner */}
            {tastyLinked && (
                <div className="px-4 mb-4">
                    <CircuitBreakerBanner
                        apiEndpoint="/api/diagonal/status"
                        refreshInterval={60}
                    />
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

            {/* Balance Card - Compact */}
            <div className="px-4 mb-4">
                <div className="glass-card p-4">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-tm-muted">
                            <Wallet className="w-4 h-4" />
                            <span className="text-xs">Net Liquidating Value</span>
                        </div>
                        <div className="relative w-10 h-10">
                            <svg className="w-10 h-10 transform -rotate-90">
                                <circle className="text-tm-surface" strokeWidth="3" stroke="currentColor" fill="transparent" r="16" cx="20" cy="20" />
                                <circle className="text-tm-green" strokeWidth="3" strokeDasharray={`${winRate * 1.0} 100`} strokeLinecap="round" stroke="currentColor" fill="transparent" r="16" cx="20" cy="20" />
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">{winRate}%</span>
                        </div>
                    </div>
                    <h2 className="text-3xl font-bold font-mono mb-2">
                        {loading && !data ? (
                            <span className="animate-pulse">Loading...</span>
                        ) : (
                            `$${(data?.netLiquidatingValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        )}
                    </h2>
                    <div className="flex items-center justify-between text-sm">
                        <div>
                            <span className="text-tm-muted">Today&apos;s P&amp;L: </span>
                            <span className={`font-mono font-semibold ${(data?.todayPnL || 0) >= 0 ? 'text-tm-green' : 'text-tm-red'}`}>
                                {(data?.todayPnL || 0) >= 0 ? '+' : ''}${(data?.todayPnL || 0).toFixed(2)}
                            </span>
                        </div>
                        {lastUpdated && (
                            <span className="text-xs text-tm-muted">
                                {lastUpdated.toLocaleTimeString()}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Quick Actions - Compact */}
            <div className="px-4 mb-4">
                <div className="grid grid-cols-2 gap-3">
                    <Link href="/signals" className="glass-card p-3 flex items-center gap-2">
                        <div className="w-9 h-9 rounded-lg bg-tm-purple/20 flex items-center justify-center">
                            <TrendingUp className="w-4 h-4 text-tm-purple" />
                        </div>
                        <div>
                            <p className="font-semibold text-sm">Signals</p>
                            <p className="text-xs text-tm-green">View trades</p>
                        </div>
                    </Link>
                    <Link href="/positions" className="glass-card p-3 flex items-center gap-2">
                        <div className="w-9 h-9 rounded-lg bg-tm-green/20 flex items-center justify-center">
                            <Activity className="w-4 h-4 text-tm-green" />
                        </div>
                        <div>
                            <p className="font-semibold text-sm">Positions</p>
                            <p className="text-xs text-tm-muted">{data?.positionCount || 0} open</p>
                        </div>
                    </Link>
                </div>
            </div>

            {/* Gamification Stats - Compact */}
            <div className="px-4 mb-4">
                <GamificationCard />
            </div>

            {/* Open Positions - Minimal Preview */}
            {data?.positions && data.positions.length > 0 && (
                <div className="px-4">
                    <Link href="/positions" className="glass-card p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold">Open Positions</span>
                            <span className="text-xs bg-tm-purple/20 text-tm-purple px-2 py-0.5 rounded-full">
                                {data.positionCount}
                            </span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-tm-muted" />
                    </Link>
                </div>
            )}

            {/* Bottom Nav */}
            <nav className="fixed bottom-0 left-0 right-0 bg-tm-surface/90 backdrop-blur-lg border-t border-white/5 px-6 py-4">
                <div className="flex items-center justify-around">
                    <NavItem icon={<Wallet />} label="Home" active />
                    <NavItem icon={<TrendingUp />} label="Signals" href="/signals" />
                    <NavItem icon={<Activity />} label="Positions" href="/positions" />
                    <NavItem icon={<Settings />} label="Settings" href="/settings" />
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

