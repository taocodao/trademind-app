"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Award } from "lucide-react";
import Link from "next/link";
import { BadgeGrid } from "@/components/gamification/BadgeGrid";

interface Badge {
    type: string;
    name: string;
    icon: string;
    earnedAt: string | null;
    progress: number;
    requirement?: string;
}

interface GamificationStats {
    badges: Badge[];
    totalProfit: number;
    totalTrades: number;
    currentStreak: number;
}

export default function BadgesPage() {
    const { ready, authenticated } = usePrivy();
    const router = useRouter();
    const [stats, setStats] = useState<GamificationStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (ready && !authenticated) {
            router.push("/");
        }
    }, [ready, authenticated, router]);

    useEffect(() => {
        if (authenticated) {
            fetchStats();
        }
    }, [authenticated]);

    const fetchStats = async () => {
        try {
            const response = await fetch('/api/gamification/stats');
            if (response.ok) {
                const data = await response.json();
                setStats(data);
            }
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        } finally {
            setLoading(false);
        }
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

    const earnedCount = stats?.badges?.filter(b => b.earnedAt)?.length || 0;
    const totalCount = stats?.badges?.length || 0;

    return (
        <main className="min-h-screen pb-6">
            <header className="px-6 pt-12 pb-6 flex items-center gap-4">
                <Link href="/dashboard" className="w-10 h-10 rounded-full bg-tm-surface flex items-center justify-center">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div className="flex-1">
                    <h1 className="text-xl font-bold">Badges</h1>
                    <p className="text-sm text-tm-muted">{earnedCount} of {totalCount} earned</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                    <Award className="w-5 h-5 text-yellow-400" />
                </div>
            </header>

            {/* Progress Summary */}
            <div className="px-6 mb-6">
                <div className="glass-card p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-tm-muted">Collection Progress</span>
                        <span className="text-sm font-semibold">{earnedCount}/{totalCount}</span>
                    </div>
                    <div className="h-2 bg-tm-surface rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-tm-purple to-yellow-400 transition-all"
                            style={{ width: `${(earnedCount / totalCount) * 100}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Stats Summary */}
            {stats && (
                <div className="px-6 mb-6">
                    <div className="grid grid-cols-3 gap-3">
                        <div className="glass-card p-3 text-center">
                            <p className="text-2xl font-bold">{stats.totalTrades}</p>
                            <p className="text-xs text-tm-muted">Trades</p>
                        </div>
                        <div className="glass-card p-3 text-center">
                            <p className="text-2xl font-bold text-tm-green">
                                ${stats.totalProfit.toFixed(0)}
                            </p>
                            <p className="text-xs text-tm-muted">Profit</p>
                        </div>
                        <div className="glass-card p-3 text-center">
                            <p className="text-2xl font-bold text-orange-400">{stats.currentStreak}🔥</p>
                            <p className="text-xs text-tm-muted">Streak</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Badge Grid */}
            <div className="px-6">
                {loading ? (
                    <div className="grid grid-cols-2 gap-4">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="glass-card p-4 h-32 animate-pulse" />
                        ))}
                    </div>
                ) : stats?.badges ? (
                    <BadgeGrid badges={stats.badges} showLocked={true} />
                ) : (
                    <div className="text-center py-8 text-tm-muted">
                        <p>Unable to load badges</p>
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="px-6 mt-6">
                <p className="text-center text-xs text-tm-muted">
                    Complete trades and hit milestones to unlock badges.
                    Flex your collection on social media!
                </p>
            </div>
        </main>
    );
}
