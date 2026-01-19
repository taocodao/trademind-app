"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
    TrendingUp,
    Wallet,
    Activity,
    ChevronRight,
    LogOut,
    Bell
} from "lucide-react";
import Link from "next/link";

// Mock data - will be replaced with real API calls
const mockData = {
    balance: 12450.23,
    todayPnL: 342.18,
    todayPnLPercent: 2.75,
    winRate: 73,
    openPositions: 3,
    positions: [
        { symbol: "AAPL", type: "Calendar", pnl: 185.50, pnlPercent: 1.23 },
        { symbol: "SPY", type: "Calendar", pnl: 127.50, pnlPercent: 2.15 },
        { symbol: "MSFT", type: "Calendar", pnl: 29.18, pnlPercent: 0.87 },
    ],
};

export default function Dashboard() {
    const { ready, authenticated, logout, user } = usePrivy();
    const router = useRouter();
    const [data] = useState(mockData);

    useEffect(() => {
        if (ready && !authenticated) {
            router.push("/");
        }
    }, [ready, authenticated, router]);

    if (!ready || !authenticated) {
        return (
            <main className="min-h-screen flex items-center justify-center">
                <div className="animate-pulse">
                    <div className="w-12 h-12 rounded-full bg-tm-purple/30" />
                </div>
            </main>
        );
    }

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

            {/* Balance Card */}
            <div className="px-6 mb-6">
                <div className="glass-card p-6">
                    <div className="flex items-center gap-2 text-tm-muted mb-2">
                        <Wallet className="w-4 h-4" />
                        <span className="text-sm">Total Balance</span>
                    </div>
                    <h2 className="text-4xl font-bold font-mono mb-4">
                        ${data.balance.toLocaleString()}
                    </h2>

                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-tm-muted">Today's P&L</p>
                            <p className={`text-xl font-semibold font-mono ${data.todayPnL >= 0 ? 'profit-glow' : 'loss-glow'}`}>
                                {data.todayPnL >= 0 ? '+' : ''}${data.todayPnL.toFixed(2)}
                                <span className="text-sm ml-1">({data.todayPnLPercent}%)</span>
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
                                            strokeDasharray={`${data.winRate * 1.26} 126`}
                                            strokeLinecap="round"
                                            stroke="currentColor"
                                            fill="transparent"
                                            r="20"
                                            cx="24"
                                            cy="24"
                                        />
                                    </svg>
                                    <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">
                                        {data.winRate}%
                                    </span>
                                </div>
                            </div>
                        </div>
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
                            <p className="text-sm text-tm-green">3 new</p>
                        </div>
                    </Link>
                    <Link href="/positions" className="glass-card p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-tm-green/20 flex items-center justify-center">
                            <Activity className="w-5 h-5 text-tm-green" />
                        </div>
                        <div>
                            <p className="font-semibold">Positions</p>
                            <p className="text-sm text-tm-muted">{data.openPositions} open</p>
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
                    {data.positions.map((pos, i) => (
                        <div key={i} className="glass-card p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-tm-surface flex items-center justify-center font-bold text-sm">
                                    {pos.symbol.slice(0, 2)}
                                </div>
                                <div>
                                    <p className="font-semibold">{pos.symbol}</p>
                                    <p className="text-sm text-tm-muted">{pos.type}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className={`font-mono font-semibold ${pos.pnl >= 0 ? 'text-tm-green' : 'text-tm-red'}`}>
                                    {pos.pnl >= 0 ? '+' : ''}${pos.pnl.toFixed(2)}
                                </p>
                                <p className="text-sm text-tm-muted">
                                    {pos.pnl >= 0 ? '+' : ''}{pos.pnlPercent}%
                                </p>
                            </div>
                        </div>
                    ))}
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
