"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ArrowLeft, Trophy } from "lucide-react";
import Link from "next/link";
import { LeaderboardTable } from "@/components/gamification/LeaderboardTable";

export default function LeaderboardPage() {
    const { ready, authenticated } = usePrivy();
    const router = useRouter();

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
        <main className="min-h-screen pb-6">
            <header className="px-6 pt-12 pb-6 flex items-center gap-4">
                <Link href="/dashboard" className="w-10 h-10 rounded-full bg-tm-surface flex items-center justify-center">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div className="flex-1">
                    <h1 className="text-xl font-bold">Leaderboard</h1>
                    <p className="text-sm text-tm-muted">Top traders this week</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-yellow-400" />
                </div>
            </header>

            {/* Leaderboard Info */}
            <div className="px-6 mb-6">
                <div className="glass-card p-4">
                    <p className="text-sm text-tm-muted">
                        <span className="text-yellow-400 font-semibold">🏆 Top 10</span> traders get 1 month free performance fee!
                        Ranked by Sharpe ratio to reward consistent, risk-adjusted returns.
                    </p>
                </div>
            </div>

            {/* Leaderboard Table */}
            <div className="px-6">
                <LeaderboardTable />
            </div>
        </main>
    );
}
