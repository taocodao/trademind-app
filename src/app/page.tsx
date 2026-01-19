"use client";

import { usePrivy } from "@privy-io/react-auth";
import { ArrowRight, TrendingUp, Shield, Zap } from "lucide-react";

export default function Home() {
    const { login, authenticated, ready } = usePrivy();

    if (!ready) {
        return (
            <main className="min-h-screen flex items-center justify-center">
                <div className="animate-pulse">
                    <div className="w-12 h-12 rounded-full bg-tm-purple/30" />
                </div>
            </main>
        );
    }

    if (authenticated) {
        // Redirect to dashboard (will be implemented)
        if (typeof window !== "undefined") {
            window.location.href = "/dashboard";
        }
        return null;
    }

    return (
        <main className="min-h-screen flex flex-col">
            {/* Hero Section */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
                {/* Logo */}
                <div className="mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-tm-purple to-purple-900 flex items-center justify-center">
                        <TrendingUp className="w-8 h-8 text-white" />
                    </div>
                </div>

                {/* Title */}
                <h1 className="text-4xl font-bold text-center mb-3">
                    Trade<span className="text-tm-purple">Mind</span>
                </h1>
                <p className="text-tm-muted text-center text-lg mb-12">
                    Smart signals. Real profits.
                </p>

                {/* Login Button */}
                <button
                    onClick={login}
                    className="btn-primary flex items-center gap-3 text-lg"
                >
                    Get Started
                    <ArrowRight className="w-5 h-5" />
                </button>

                {/* Features */}
                <div className="mt-16 grid gap-6 w-full max-w-sm">
                    <Feature
                        icon={<TrendingUp className="w-5 h-5 text-tm-green" />}
                        title="73% Win Rate"
                        description="Calendar spread signals"
                    />
                    <Feature
                        icon={<Shield className="w-5 h-5 text-tm-purple" />}
                        title="Risk Managed"
                        description="Auto stop-loss protection"
                    />
                    <Feature
                        icon={<Zap className="w-5 h-5 text-yellow-400" />}
                        title="Real-Time"
                        description="Live P&L tracking"
                    />
                </div>
            </div>

            {/* Footer */}
            <footer className="py-6 text-center text-tm-muted text-sm">
                <p>© 2026 TradeMind.bot</p>
            </footer>
        </main>
    );
}

function Feature({
    icon,
    title,
    description,
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
}) {
    return (
        <div className="glass-card p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-tm-bg flex items-center justify-center">
                {icon}
            </div>
            <div>
                <h3 className="font-semibold text-tm-text">{title}</h3>
                <p className="text-sm text-tm-muted">{description}</p>
            </div>
        </div>
    );
}
