'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Copy, CheckCircle2, Users, DollarSign, Clock, HelpCircle, Activity } from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';

export default function ReferPage() {
    const { authenticated, ready } = usePrivy();
    const router = useRouter();

    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (ready && authenticated) {
            fetch('/api/referrals')
                .then(res => {
                    if (!res.ok) throw new Error('Failed to load referral stats');
                    return res.json();
                })
                .then(setData)
                .catch(err => setError(err.message))
                .finally(() => setLoading(false));
        } else if (ready && !authenticated) {
            router.push('/');
        }
    }, [ready, authenticated, router]);

    const handleCopy = () => {
        if (data?.referralCode) {
            const link = `https://trademind.bot/?ref=${data.referralCode}`;
            navigator.clipboard.writeText(link);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (!ready || loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-tm-bg">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-tm-purple border-t-transparent"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-tm-bg text-red-500">
                {error}
            </div>
        );
    }

    const shareLink = `https://trademind.bot/?ref=${data?.referralCode}`;
    
    // Calculate pending standard credits: if stage1 Paid but stage2 NOT paid, $50 is conceptually pending for stage2
    const totalReferred = data?.stats?.totalReferred || 0;
    const stage1PaidCount = data?.stats?.stage1Paid || 0;
    const stage2PaidCount = data?.stats?.stage2Paid || 0;
    
    // This is just a rough estimate of potential pending value for display
    const pendingCredits = (totalReferred - stage1PaidCount) * 50 + (stage1PaidCount - stage2PaidCount) * 50;

    return (
        <main className="min-h-screen bg-tm-bg text-white pb-24 px-4 pt-6 max-w-4xl mx-auto">
            <header className="flex items-center gap-3 mb-8">
                <button onClick={() => router.push('/')} className="p-2 -ml-2 text-tm-muted hover:text-white transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-2xl font-bold">Referral Dashboard</h1>
            </header>

            {/* Share Card */}
            <div className="bg-tm-surface border border-tm-purple/30 rounded-2xl p-6 mb-8 relative overflow-hidden shadow-[0_0_30px_rgba(168,85,247,0.1)]">
                <div className="absolute top-0 right-0 w-64 h-64 bg-tm-purple/10 blur-[100px] rounded-full pointer-events-none"></div>
                <h2 className="text-lg font-bold mb-2">Invite Friends, Earn Credits</h2>
                <p className="text-tm-muted text-sm mb-6 max-w-xl">Share your unique link. When a friend signs up for a paid plan after their trial, you earn account credits automatically applied to your next bill.</p>
                
                <div className="flex items-center gap-2 bg-tm-bg rounded-xl border border-tm-border p-2 max-w-lg">
                    <div className="px-3 text-tm-muted truncate flex-1 text-sm font-medium">{shareLink}</div>
                    <button 
                        onClick={handleCopy}
                        className="bg-tm-purple hover:bg-tm-purple/90 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors shrink-0"
                    >
                        {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        {copied ? 'Copied!' : 'Copy Link'}
                    </button>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
                <div className="bg-tm-surface/50 border border-tm-border rounded-xl p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
                        <Users className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-tm-muted tracking-wider uppercase font-bold text-[10px] mb-1">Total Referred</div>
                        <div className="text-2xl font-black">{totalReferred}</div>
                    </div>
                </div>
                <div className="bg-tm-surface/50 border border-tm-border rounded-xl p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                        <DollarSign className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-tm-muted tracking-wider uppercase font-bold text-[10px] mb-1">Total Earned</div>
                        <div className="text-2xl font-black">${data?.stats?.totalEarned || 0}</div>
                    </div>
                </div>
                <div className="bg-tm-surface/50 border border-tm-border rounded-xl p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400">
                        <Clock className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-tm-muted tracking-wider uppercase font-bold text-[10px] mb-1">Potential Value</div>
                        <div className="text-2xl font-black">${pendingCredits}</div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Referrals & How it works */}
                <div className="lg:col-span-2 space-y-8">
                    
                    {/* How It Works */}
                    <section>
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <HelpCircle className="w-5 h-5 text-tm-purple" /> How It Works
                        </h3>
                        <div className="bg-tm-surface border border-tm-border rounded-xl p-5 space-y-4">
                            <div className="flex gap-4">
                                <div className="w-8 h-8 rounded-full bg-tm-purple/20 text-tm-purple font-bold flex items-center justify-center shrink-0">1</div>
                                <div>
                                    <div className="font-bold text-sm mb-1">Stage 1: The Trial Conversion</div>
                                    <div className="text-xs text-tm-muted leading-relaxed">Get $50 credit when they pay for their first month after the 14-day trial.</div>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-8 h-8 rounded-full bg-tm-purple/20 text-tm-purple font-bold flex items-center justify-center shrink-0">2</div>
                                <div>
                                    <div className="font-bold text-sm mb-1">Stage 2: The Second Month</div>
                                    <div className="text-xs text-tm-muted leading-relaxed">Get another $50 credit when they complete their second paid month.</div>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-500 font-bold flex items-center justify-center shrink-0">★</div>
                                <div>
                                    <div className="font-bold text-sm text-amber-400 mb-1">Annual Bonus Bypass</div>
                                    <div className="text-xs text-tm-muted leading-relaxed">Get a $150 credit instantly if they bypass monthly and sign up for an Annual Plan!</div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Referrals List */}
                    <section>
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <Users className="w-5 h-5 text-blue-400" /> Your Referrals
                        </h3>
                        
                        <div className="bg-tm-surface border border-tm-border rounded-xl overflow-hidden">
                            {data?.referrals?.length === 0 ? (
                                <div className="p-8 text-center text-tm-muted text-sm">
                                    No referrals yet. Share your link to get started!
                                </div>
                            ) : (
                                <div className="divide-y divide-tm-border">
                                    {data?.referrals?.map((ref: any) => (
                                        <div key={ref.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div>
                                                <div className="font-bold text-sm flex items-center gap-2">
                                                    {ref.name}
                                                    {ref.annualBonusPaid && <span className="bg-amber-500/20 text-amber-400 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">Annual</span>}
                                                </div>
                                                <div className="text-xs text-tm-muted mt-1">
                                                    Joined {new Date(ref.joinedAt).toLocaleDateString()}
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-2">
                                                {/* Progress dots */}
                                                <div className="flex items-center gap-1.5 bg-tm-bg p-2 rounded-lg border border-tm-border">
                                                    <div className="flex flex-col items-center gap-1 w-12">
                                                        <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                                                        <div className="text-[9px] text-tm-muted uppercase">Signed Up</div>
                                                    </div>
                                                    <div className="w-4 h-[1px] bg-tm-border"></div>
                                                    <div className="flex flex-col items-center gap-1 w-12">
                                                        <div className={`w-3 h-3 rounded-full ${ref.stage1Paid || ref.annualBonusPaid ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-tm-border'}`}></div>
                                                        <div className="text-[9px] text-tm-muted uppercase">Stage 1</div>
                                                    </div>
                                                    <div className="w-4 h-[1px] bg-tm-border"></div>
                                                    <div className="flex flex-col items-center gap-1 w-12">
                                                        <div className={`w-3 h-3 rounded-full ${ref.stage2Paid || ref.annualBonusPaid ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-tm-border'}`}></div>
                                                        <div className="text-[9px] text-tm-muted uppercase">Stage 2</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </section>
                </div>

                {/* Right Column: Activity Feed */}
                <div>
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-emerald-400" /> Recent Activity
                    </h3>
                    <div className="bg-tm-surface border border-tm-border rounded-xl p-5">
                        {data?.activity?.length === 0 ? (
                            <div className="text-center text-tm-muted text-sm py-4">
                                No activity yet.
                            </div>
                        ) : (
                            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-[11px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-tm-border before:to-transparent">
                                {data?.activity?.map((act: any, i: number) => (
                                    <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                        <div className="flex items-center justify-center w-6 h-6 rounded-full border border-tm-border bg-tm-surface text-tm-muted shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                                            {act.credit_amount > 0 ? (
                                              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                            ) : (
                                              <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                                            )}
                                        </div>
                                        <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] pl-4 md:pl-0 md:group-even:pr-4 md:group-odd:pl-4">
                                            <div className="p-3 bg-tm-bg rounded-lg border border-tm-border/50 shadow-sm flex flex-col gap-1">
                                                <div className="flex items-center justify-between">
                                                    <span className={`text-xs font-bold ${act.credit_amount > 0 ? 'text-emerald-400' : 'text-white'}`}>
                                                        {act.credit_amount > 0 ? `+$${act.credit_amount}` : 'Update'}
                                                    </span>
                                                    <time className="text-[10px] text-tm-muted font-medium">
                                                        {new Date(act.created_at).toLocaleDateString()}
                                                    </time>
                                                </div>
                                                <div className="text-xs text-tm-muted/90 leading-tight">
                                                    {act.description}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}
