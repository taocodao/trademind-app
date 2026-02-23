'use client';

import { usePrivy } from '@privy-io/react-auth';
import { ArrowRight, TrendingUp, Shield, Zap } from 'lucide-react';
import Image from 'next/image';

export default function Home() {
    const { login, authenticated, ready } = usePrivy();

    if (!ready) {
        return (
            <main className="min-h-screen flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-tm-purple/30 animate-pulse" />
            </main>
        );
    }

    if (authenticated) {
        if (typeof window !== 'undefined') window.location.href = '/dashboard';
        return null;
    }

    return (
        <main className="min-h-screen flex flex-col">
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
                {/* Logo */}
                <div className="mb-8">
                    <Image
                        src="/logo.png"
                        alt="TradeMind Logo"
                        width={80}
                        height={80}
                        className="rounded-2xl"
                        priority
                    />
                </div>

                {/* Title */}
                <h1 className="text-4xl font-bold text-center mb-2">
                    Trade<span className="text-tm-purple">Mind</span>
                </h1>
                <p className="text-tm-muted text-center text-base mb-2">
                    TQQQ Dual-Sided Options Strategy
                </p>
                <p className="text-tm-muted text-center text-sm mb-10">
                    VIX-adaptive put &amp; call spreads, fully automated.
                </p>

                {/* Login */}
                <button
                    onClick={login}
                    className="btn-primary flex items-center gap-3 text-lg"
                >
                    Get Started
                    <ArrowRight className="w-5 h-5" />
                </button>

                {/* Features */}
                <div className="mt-12 grid gap-4 w-full max-w-sm">
                    <Feature
                        icon={<TrendingUp className="w-5 h-5 text-tm-green" />}
                        title="+98% Backtest Return"
                        description="Dual-sided spread strategy (Scenario B)"
                    />
                    <Feature
                        icon={<Shield className="w-5 h-5 text-tm-purple" />}
                        title="VIX-Adaptive"
                        description="Regime-based sizing — puts in HIGH_VOL, calls in CRISIS"
                    />
                    <Feature
                        icon={<Zap className="w-5 h-5 text-yellow-400" />}
                        title="Auto-Managed"
                        description="ML-driven entries, exits, and position sizing"
                    />
                </div>
            </div>

            <footer className="py-6 text-center text-tm-muted text-sm">
                <p>© 2026 TradeMind.bot</p>
            </footer>
        </main>
    );
}

function Feature({
    icon, title, description,
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
}) {
    return (
        <div className="glass-card p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-tm-bg flex items-center justify-center flex-shrink-0">
                {icon}
            </div>
            <div>
                <h3 className="font-semibold text-tm-text">{title}</h3>
                <p className="text-sm text-tm-muted">{description}</p>
            </div>
        </div>
    );
}
