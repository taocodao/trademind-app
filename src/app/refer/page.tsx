'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Users, DollarSign, Clock, HelpCircle, Activity, CalendarDays, Trophy, Rocket, ChevronDown } from 'lucide-react';
import { ShareSection } from '@/components/referral/ShareSection';
import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';

export default function ReferPage() {
    const { authenticated, ready } = usePrivy();
    const router = useRouter();

    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showDetails, setShowDetails] = useState(false);


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

            {/* AI Social Share Section */}
            {data?.referralCode && (
                <div className="mb-8">
                    <ShareSection
                        promoCode={data.referralCode}
                        referralLink={data.shareLink ?? shareLink}
                        userTier={data.tier?.current?.tier ?? 'bronze'}
                        isCreator={data.isCreator ?? false}
                    />
                </div>
            )}

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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

            {/* Tier Progress */}
            {(() => {
                const currentTier = data?.tier?.current;
                const nextAt = currentTier?.nextTierAt;
                const progress = nextAt ? Math.min(100, Math.round((totalReferred / nextAt) * 100)) : 100;
                return currentTier ? (
                    <div className="bg-tm-surface border border-tm-border rounded-2xl p-5 mb-8">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <span className="text-2xl">{currentTier.emoji}</span>
                                <div>
                                    <div className="font-bold text-white text-sm">{currentTier.name}</div>
                                    <div className="text-xs text-tm-muted">Current Tier</div>
                                </div>
                            </div>
                            {nextAt && (
                                <div className="text-right">
                                    <div className="text-xs text-tm-muted">{totalReferred} / {nextAt} referrals to next tier</div>
                                </div>
                            )}
                        </div>
                        <div className="w-full bg-tm-bg rounded-full h-2 overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-tm-purple to-purple-400 rounded-full transition-all duration-700"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        {nextAt && (
                            <p className="text-[10px] text-tm-muted mt-2">
                                {nextAt - totalReferred} more referral{nextAt - totalReferred !== 1 ? 's' : ''} to unlock <strong className="text-white">{data.tier.all?.find((t: any) => t.tier === currentTier.nextTier)?.name ?? 'next tier'}</strong>
                            </p>
                        )}
                    </div>
                ) : null;
            })()}

            {/* Quick Links */}
            <div className="grid grid-cols-2 gap-3 mb-8">
                <Link href="/referral-leaderboard" className="bg-tm-surface border border-tm-border hover:border-amber-500/40 rounded-xl p-4 flex items-center gap-3 transition-all">
                    <Trophy className="w-5 h-5 text-amber-400" />
                    <div>
                        <div className="text-sm font-bold text-white">Leaderboard</div>
                        <div className="text-[10px] text-tm-muted">See top affiliates</div>
                    </div>
                </Link>
                <Link href="/creators" className="bg-tm-surface border border-tm-purple/30 hover:border-tm-purple/60 rounded-xl p-4 flex items-center gap-3 transition-all">
                    <Rocket className="w-5 h-5 text-tm-purple" />
                    <div>
                        <div className="text-sm font-bold text-white">Creator Program</div>
                        <div className="text-[10px] text-tm-muted">Apply for 20% rev share</div>
                    </div>
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Referrals & How it works */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Collapsible Info Section */}
                    <div className="bg-tm-surface border border-tm-border rounded-xl overflow-hidden mb-8">
                        <button
                            onClick={() => setShowDetails(!showDetails)}
                            className="w-full flex items-center justify-between p-5 hover:bg-white/[0.02] transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                <HelpCircle className="w-5 h-5 text-tm-purple" />
                                <h3 className="text-lg font-bold text-white">How It Works & Rewards</h3>
                            </div>
                            <ChevronDown className={`w-5 h-5 text-tm-muted transition-transform duration-300 ${showDetails ? 'rotate-180' : ''}`} />
                        </button>
                        
                    {showDetails && (
                            <div className="p-5 border-t border-tm-border space-y-8 bg-black/20 animate-in fade-in slide-in-from-top-4 duration-300">
                                {/* How It Works — New Bilateral Model */}
                                <section>
                                    <div className="space-y-4">
                                        <div className="flex gap-4">
                                            <div className="w-8 h-8 rounded-full bg-tm-purple/20 text-tm-purple font-bold flex items-center justify-center shrink-0">1</div>
                                            <div>
                                                <div className="font-bold text-sm mb-1">Stage 1 — Friend Signs Up (Both Get $50)</div>
                                                <div className="text-xs text-tm-muted leading-relaxed">
                                                    When your friend uses your link and starts a trial:
                                                    <ul className="mt-1.5 space-y-1 list-disc list-inside">
                                                        <li><strong className="text-white">Your friend (referee)</strong> gets <strong className="text-tm-purple">$50 worth of bonus trial days</strong> added on top of the 14-day base — no charge until the extended trial ends.</li>
                                                        <li><strong className="text-white">You (referrer)</strong> get your subscription extended immediately by the equivalent <strong className="text-tm-purple">$50 in free days</strong>.</li>
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-4">
                                            <div className="w-8 h-8 rounded-full bg-green-500/20 text-green-400 font-bold flex items-center justify-center shrink-0">2</div>
                                            <div>
                                                <div className="font-bold text-sm mb-1">Stage 2 — First Charge (Both Get Another $50)</div>
                                                <div className="text-xs text-tm-muted leading-relaxed">
                                                    When your friend&apos;s card is first charged after their trial:
                                                    <ul className="mt-1.5 space-y-1 list-disc list-inside">
                                                        <li><strong className="text-white">Your friend</strong> gets another <strong className="text-green-400">$50 in free days</strong> added.</li>
                                                        <li><strong className="text-white">You</strong> get another <strong className="text-green-400">$50 in free days</strong> too.</li>
                                                    </ul>
                                                    Total = <strong className="text-white">$100 each</strong> in free subscription days.
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-4">
                                            <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-500 font-bold flex items-center justify-center shrink-0">★</div>
                                            <div>
                                                <div className="font-bold text-sm text-amber-400 mb-1">Annual Plan Bonus</div>
                                                <div className="text-xs text-tm-muted leading-relaxed">Friend subscribes to an annual plan? Both you and your friend receive a larger <strong className="text-white">bonus in free days</strong> ($75 each from the $150 annual bonus pool) in one shot.</div>
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                {/* Extension Days Table */}
                                <section>
                                    <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
                                        <CalendarDays className="w-4 h-4 text-tm-purple" /> Free Days Per Plan
                                    </h4>
                                    <div className="bg-tm-bg border border-tm-border rounded-xl overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-tm-border">
                                                    <th className="text-left p-3 text-tm-muted font-semibold text-xs uppercase tracking-wider">Plan</th>
                                                    <th className="text-center p-3 text-tm-purple font-semibold text-xs uppercase tracking-wider">Stage 1 ($50)</th>
                                                    <th className="text-center p-3 text-green-400 font-semibold text-xs uppercase tracking-wider">Stage 2 ($50)</th>
                                                    <th className="text-center p-3 text-white font-semibold text-xs uppercase tracking-wider">Total ($100)</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-tm-border">
                                                {[
                                                    { plan: 'TurboCore', price: 29 },
                                                    { plan: 'TurboCore Pro', price: 49 },
                                                    { plan: 'Both Bundle', price: 69 },
                                                ].map(({ plan, price }) => {
                                                    const daily = price / 30;
                                                    const days50 = Math.floor(50 / daily);
                                                    const days100 = Math.floor(100 / daily);
                                                    return (
                                                        <tr key={plan} className="hover:bg-white/[0.02] transition-colors">
                                                            <td className="p-3 font-medium text-white">{plan} <span className="text-tm-muted text-xs">(${price}/mo)</span></td>
                                                            <td className="p-3 text-center"><span className="text-tm-purple font-bold">+{days50}d</span></td>
                                                            <td className="p-3 text-center"><span className="text-green-400 font-bold">+{days50}d</span></td>
                                                            <td className="p-3 text-center"><span className="text-white font-black">+{days100}d</span></td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                        <div className="p-3 border-t border-tm-border">
                                            <p className="text-[10px] text-tm-muted text-center">Days = credit ÷ (monthly price ÷ 30). Both referrer and referee receive each stage. Applied automatically.</p>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        )}
                    </div>

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
