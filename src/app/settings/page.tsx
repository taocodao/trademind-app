"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
    ArrowLeft,
    Settings,
    Shield,
    AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { RiskLevelSelector } from "@/components/signals/RiskLevelSelector";

export default function SettingsPage() {
    const { ready, authenticated } = usePrivy();
    const router = useRouter();
    const [currentRiskLevel, setCurrentRiskLevel] = useState<string>('MEDIUM');

    useEffect(() => {
        if (ready && !authenticated) {
            router.push("/");
        }
    }, [ready, authenticated, router]);

    const handleRiskLevelChange = (level: string) => {
        setCurrentRiskLevel(level);
        console.log('Risk level changed to:', level);
    };

    if (!ready || !authenticated) {
        return (
            <main className="min-h-screen flex items-center justify-center">
                <div className="animate-pulse">
                    <div className="w-12 h-12 rounded-full bg-tm-purple/30" />
                </div>
            </main>
        );
    }

    // Get API base URL for risk settings
    const apiBase = process.env.NEXT_PUBLIC_API_URL ||
        (typeof window !== 'undefined' && window.location.hostname === 'localhost'
            ? 'http://localhost:8002'
            : 'https://api.trademind.bot');

    return (
        <main className="min-h-screen pb-6">
            <header className="px-6 pt-12 pb-6 flex items-center gap-4">
                <Link href="/dashboard" className="w-10 h-10 rounded-full bg-tm-surface flex items-center justify-center">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div className="flex-1">
                    <h1 className="text-xl font-bold">Settings</h1>
                    <p className="text-sm text-tm-muted">Configure your trading preferences</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-tm-purple/20 flex items-center justify-center">
                    <Settings className="w-5 h-5 text-tm-purple" />
                </div>
            </header>

            <div className="px-6 space-y-6">
                {/* Theta Sprint Risk Level Section */}
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <Shield className="w-5 h-5 text-tm-purple" />
                        <h2 className="text-lg font-semibold">Theta Sprint Risk Level</h2>
                    </div>

                    <p className="text-sm text-tm-muted mb-4">
                        Control position sizing, maximum positions, and VIX thresholds for the Theta Sprint strategy.
                        Changes take effect on the next scheduler run.
                    </p>

                    <RiskLevelSelector
                        apiBase={apiBase}
                        onLevelChange={handleRiskLevelChange}
                    />
                </section>

                {/* Warning Section */}
                <section className="glass-card p-4 border border-yellow-500/20">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <h3 className="font-semibold text-yellow-400 mb-1">Risk Profile Warning</h3>
                            <p className="text-sm text-tm-muted">
                                Higher risk levels mean larger positions and higher potential returns,
                                but also significantly increased loss exposure during market downturns.
                                Consider your total portfolio allocation before selecting aggressive settings.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Strategy Info */}
                <section className="glass-card p-5">
                    <h3 className="font-semibold mb-3">Current Risk Profile Summary</h3>
                    <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between py-2 border-b border-white/10">
                            <span className="text-tm-muted">Active Risk Level</span>
                            <span className="font-semibold text-tm-purple">{currentRiskLevel}</span>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b border-white/10">
                            <span className="text-tm-muted">Strategy</span>
                            <span className="font-semibold">Theta Sprint (Cash-Secured Puts)</span>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b border-white/10">
                            <span className="text-tm-muted">Defensive Exits</span>
                            <span className="font-semibold">Research-Validated Profiles</span>
                        </div>
                        <div className="flex items-center justify-between py-2">
                            <span className="text-tm-muted">VIX Protection</span>
                            <span className="font-semibold text-tm-green">Enabled</span>
                        </div>
                    </div>
                </section>

                {/* Documentation Link */}
                <section className="text-center text-sm text-tm-muted">
                    <p>
                        Risk profiles based on academic research including GMO, Eurex, and
                        Bailey & López de Prado recommendations for systematic options strategies.
                    </p>
                </section>
            </div>
        </main>
    );
}
