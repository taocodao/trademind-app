"use client";

import { useState, useEffect } from "react";
import { Trophy, Medal, Award, TrendingUp } from "lucide-react";

interface LeaderboardEntry {
    rank: number;
    displayName: string;
    sharpeRatio: number;
    weeklyReturn: number;
    winRate: number;
    isCurrentUser: boolean;
}

interface LeaderboardData {
    leaderboard: LeaderboardEntry[];
    weekStart: string;
    weekEnd: string;
}

export function LeaderboardTable() {
    const [data, setData] = useState<LeaderboardData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLeaderboard();
    }, []);

    const fetchLeaderboard = async () => {
        try {
            const response = await fetch('/api/gamification/leaderboard');
            if (response.ok) {
                const result = await response.json();
                setData(result);
            }
        } catch (error) {
            console.error('Failed to fetch leaderboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const getRankIcon = (rank: number) => {
        switch (rank) {
            case 1:
                return <Trophy className="w-5 h-5 text-yellow-400" />;
            case 2:
                return <Medal className="w-5 h-5 text-gray-300" />;
            case 3:
                return <Award className="w-5 h-5 text-amber-600" />;
            default:
                return <span className="text-sm text-tm-muted w-5 text-center">{rank}</span>;
        }
    };

    const getRankBg = (rank: number, isCurrentUser: boolean) => {
        if (isCurrentUser) return 'bg-tm-purple/20 border-tm-purple/40';
        switch (rank) {
            case 1:
                return 'bg-gradient-to-r from-yellow-500/20 to-amber-500/10 border-yellow-500/30';
            case 2:
                return 'bg-gradient-to-r from-gray-400/20 to-gray-300/10 border-gray-400/30';
            case 3:
                return 'bg-gradient-to-r from-amber-600/20 to-orange-500/10 border-amber-600/30';
            default:
                return 'bg-tm-surface/50 border-white/5';
        }
    };

    if (loading) {
        return (
            <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="glass-card p-4 animate-pulse">
                        <div className="h-6 bg-tm-surface rounded" />
                    </div>
                ))}
            </div>
        );
    }

    if (!data || data.leaderboard.length === 0) {
        return (
            <div className="glass-card p-8 text-center">
                <TrendingUp className="w-12 h-12 text-tm-muted mx-auto mb-3" />
                <p className="text-tm-muted">No traders on the leaderboard yet.</p>
                <p className="text-sm text-tm-muted mt-1">Complete 5+ trades to qualify!</p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {/* Header */}
            <div className="px-4 py-2 flex items-center text-xs text-tm-muted">
                <span className="w-12">Rank</span>
                <span className="flex-1">Trader</span>
                <span className="w-20 text-right">Sharpe</span>
                <span className="w-24 text-right">Weekly P&L</span>
            </div>

            {/* Entries */}
            {data.leaderboard.map((entry) => (
                <div
                    key={entry.rank}
                    className={`rounded-xl border p-4 flex items-center transition-all ${getRankBg(entry.rank, entry.isCurrentUser)}`}
                >
                    {/* Rank */}
                    <div className="w-12 flex items-center justify-center">
                        {getRankIcon(entry.rank)}
                    </div>

                    {/* Name */}
                    <div className="flex-1">
                        <p className={`font-semibold ${entry.isCurrentUser ? 'text-tm-purple' : ''}`}>
                            {entry.displayName}
                            {entry.isCurrentUser && (
                                <span className="ml-2 text-xs bg-tm-purple/30 px-2 py-0.5 rounded">You</span>
                            )}
                        </p>
                        <p className="text-xs text-tm-muted">{entry.winRate}% win rate</p>
                    </div>

                    {/* Sharpe */}
                    <div className="w-20 text-right">
                        <span className="font-mono font-semibold text-tm-green">
                            {entry.sharpeRatio.toFixed(2)}x
                        </span>
                    </div>

                    {/* Weekly P&L */}
                    <div className="w-24 text-right">
                        <span className={`font-mono font-semibold ${entry.weeklyReturn >= 0 ? 'text-tm-green' : 'text-tm-red'}`}>
                            {entry.weeklyReturn >= 0 ? '+' : ''}${entry.weeklyReturn.toFixed(0)}
                        </span>
                    </div>
                </div>
            ))}

            {/* Week Info */}
            <p className="text-center text-xs text-tm-muted mt-4">
                Week: {data.weekStart} to {data.weekEnd} • Resets Monday 9:30 AM ET
            </p>
        </div>
    );
}
