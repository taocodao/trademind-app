'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Trophy, Users, ArrowLeft, Medal, Crown, Zap } from 'lucide-react';

export default function ReferralLeaderboardPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/referrals/leaderboard')
            .then(r => r.json())
            .then(setData)
            .finally(() => setLoading(false));
    }, []);

    const getRankIcon = (rank: number) => {
        if (rank === 1) return <Crown className="w-5 h-5 text-amber-400" />;
        if (rank === 2) return <Medal className="w-5 h-5 text-slate-300" />;
        if (rank === 3) return <Medal className="w-5 h-5 text-amber-700" />;
        return <span className="text-tm-muted font-bold text-sm w-5 text-center">#{rank}</span>;
    };

    const getRankBg = (rank: number) => {
        if (rank === 1) return 'bg-amber-500/10 border-amber-500/30';
        if (rank === 2) return 'bg-slate-400/10 border-slate-400/20';
        if (rank === 3) return 'bg-amber-700/10 border-amber-700/20';
        return 'bg-tm-surface border-tm-border';
    };

    return (
        <main className="min-h-screen bg-tm-bg text-white pb-24 px-4 pt-6 max-w-2xl mx-auto">
            <header className="flex items-center gap-3 mb-8">
                <Link href="/refer" className="p-2 -ml-2 text-tm-muted hover:text-white transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold">Top Affiliates</h1>
                    <p className="text-xs text-tm-muted">{data?.month ?? '...'}</p>
                </div>
            </header>

            {/* TikTok Hook Banner */}
            <div className="bg-gradient-to-r from-tm-purple/20 to-pink-500/10 border border-tm-purple/30 rounded-2xl p-5 mb-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-tm-purple/10 blur-[80px] rounded-full pointer-events-none" />
                <div className="flex items-start gap-3 z-10 relative">
                    <Zap className="w-6 h-6 text-tm-purple shrink-0 mt-0.5" />
                    <div>
                        <p className="font-bold text-white text-sm mb-1">📱 On TikTok?</p>
                        <p className="text-xs text-tm-muted leading-relaxed">
                            Rank in the Top 10 and you have a built-in content hook:
                            <em className="text-white"> "I'm a top TradeMind affiliate this month 🤑 — use code [YOURS]"</em>
                        </p>
                    </div>
                </div>
            </div>

            {/* Leaderboard */}
            <section>
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-400" /> This Month's Top Referrers
                </h2>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="w-8 h-8 rounded-full border-4 border-tm-purple border-t-transparent animate-spin" />
                    </div>
                ) : !data?.leaders?.length ? (
                    <div className="text-center text-tm-muted py-12 bg-tm-surface rounded-2xl border border-tm-border">
                        <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p className="font-bold text-white mb-1">No referrals yet this month</p>
                        <p className="text-sm">Be the first — share your code!</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {data.leaders.map((leader: any) => (
                            <div
                                key={leader.rank}
                                className={`flex items-center gap-4 p-4 rounded-2xl border ${getRankBg(leader.rank)} transition-all`}
                            >
                                <div className="flex items-center justify-center w-8 shrink-0">
                                    {getRankIcon(leader.rank)}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-sm text-white flex items-center gap-2">
                                        {leader.displayName}
                                        {leader.rank <= 3 && (
                                            <span className="text-[10px] bg-tm-purple/20 text-tm-purple px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold">
                                                Top Affiliate
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-xs text-tm-muted mt-0.5">
                                        Code: <span className="text-white font-mono font-bold">{leader.code}</span>
                                    </div>
                                </div>

                                <div className="text-right shrink-0">
                                    <div className="text-xl font-black text-white">{leader.referralCount}</div>
                                    <div className="text-[10px] text-tm-muted uppercase tracking-wider">referrals</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Monthly Prizes */}
            <section className="mt-10">
                <h2 className="text-lg font-bold mb-4">Monthly Prizes</h2>
                <div className="bg-tm-surface border border-tm-border rounded-2xl overflow-hidden">
                    {[
                        { rank: '#1', prize: '1 full year free + Elite Affiliate badge', bg: 'bg-amber-500/10', text: 'text-amber-400' },
                        { rank: '#2–3', prize: '6 months free + Discord VIP access', bg: 'bg-slate-400/10', text: 'text-slate-300' },
                        { rank: '#4–10', prize: '3 months free subscription', bg: 'bg-tm-bg', text: 'text-tm-muted' },
                    ].map(p => (
                        <div key={p.rank} className={`${p.bg} border-b border-tm-border last:border-0 p-4 flex items-center gap-4`}>
                            <span className={`font-black text-lg w-12 shrink-0 ${p.text}`}>{p.rank}</span>
                            <span className="text-sm text-white">{p.prize}</span>
                        </div>
                    ))}
                </div>
                <p className="text-[10px] text-tm-muted text-center mt-3">
                    Winners announced the 1st of each month. Prizes applied automatically to subscription.
                </p>
            </section>

            <div className="mt-8 text-center">
                <Link href="/refer" className="inline-flex items-center gap-2 bg-tm-purple hover:bg-tm-purple/90 text-white px-6 py-3 rounded-full font-bold text-sm transition-all">
                    Get My Referral Code →
                </Link>
            </div>
        </main>
    );
}
