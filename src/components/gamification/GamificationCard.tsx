"use client";

import { useState, useEffect } from "react";
import { Flame, Trophy, Target, ChevronRight } from "lucide-react";
import Link from "next/link";

interface Badge {
    type: string;
    name: string;
    icon: string;
    earnedAt: string | null;
    progress: number;
}

interface GamificationStats {
    currentStreak: number;
    longestStreak: number;
    totalWins: number;
    totalTrades: number;
    totalProfit: number;
    weeklyProfit: number;
    winRate: number;
    badges: Badge[];
    leaderboardRank: number | null;
}

export function GamificationCard() {
    const [stats, setStats] = useState<GamificationStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const response = await fetch('/api/gamification/stats');
            if (response.ok) {
                const data = await response.json();
                setStats(data);
            }
        } catch (error) {
            console.error('Failed to fetch gamification stats:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="glass-card p-4 animate-pulse">
                <div className="h-6 bg-tm-surface rounded w-1/3 mb-4" />
                <div className="h-16 bg-tm-surface rounded" />
            </div>
        );
    }

    const earnedBadges = stats?.badges?.filter(b => b.earnedAt) || [];
    const streak = stats?.currentStreak || 0;
    const rank = stats?.leaderboardRank;

    return (
        <div className="glass-card p-5">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-400" />
                    Your Progress
                </h3>
                <Link href="/leaderboard" className="text-sm text-tm-purple flex items-center gap-1">
                    Leaderboard <ChevronRight className="w-4 h-4" />
                </Link>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4 mb-4">
                {/* Streak */}
                <div className="text-center p-3 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/30">
                    <Flame className="w-6 h-6 text-orange-400 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-orange-400">{streak}</p>
                    <p className="text-xs text-tm-muted">Week Streak</p>
                </div>

                {/* Win Rate */}
                <div className="text-center p-3 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30">
                    <Target className="w-6 h-6 text-green-400 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-green-400">{stats?.winRate || 0}%</p>
                    <p className="text-xs text-tm-muted">Win Rate</p>
                </div>

                {/* Rank */}
                <div className="text-center p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/30">
                    <Trophy className="w-6 h-6 text-purple-400 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-purple-400">
                        {rank ? `#${rank}` : '-'}
                    </p>
                    <p className="text-xs text-tm-muted">Rank</p>
                </div>
            </div>

            {/* Badges */}
            {earnedBadges.length > 0 && (
                <div>
                    <p className="text-sm text-tm-muted mb-2">Badges Earned</p>
                    <div className="flex flex-wrap gap-2">
                        {earnedBadges.slice(0, 6).map((badge) => (
                            <div
                                key={badge.type}
                                className="w-10 h-10 rounded-full bg-tm-surface flex items-center justify-center text-lg"
                                title={badge.name}
                            >
                                {badge.icon}
                            </div>
                        ))}
                        {earnedBadges.length > 6 && (
                            <div className="w-10 h-10 rounded-full bg-tm-surface flex items-center justify-center text-sm text-tm-muted">
                                +{earnedBadges.length - 6}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Total Profit */}
            <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                <span className="text-sm text-tm-muted">Total Profit</span>
                <span className={`font-mono font-bold ${(stats?.totalProfit || 0) >= 0 ? 'text-tm-green' : 'text-tm-red'}`}>
                    ${(stats?.totalProfit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
            </div>
        </div>
    );
}
