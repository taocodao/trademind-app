'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Users, DollarSign, Clock, HelpCircle, Activity, CalendarDays, Trophy, Rocket, ChevronDown, Gift, CheckCircle2, Circle } from 'lucide-react';
import { ShareSection } from '@/components/referral/ShareSection';
import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

export default function ReferPage() {
    const { authenticated, ready } = usePrivy();
    const router = useRouter();
    const { t } = useTranslation();

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
    
    const totalReferred = data?.stats?.totalReferred || 0;
    const referralHalf = data?.stats?.referralHalf || 50;
    const signupBonusPaidCount = data?.stats?.signupBonusPaid || 0;
    const stage1PaidCount = data?.stats?.stage1Paid || 0;

    const pendingCredits = Math.max(0,
        (totalReferred - signupBonusPaidCount) * referralHalf +
        (signupBonusPaidCount - stage1PaidCount) * referralHalf
    );

    return (
        <main className="min-h-screen bg-tm-bg text-white pb-24 px-4 pt-6 max-w-4xl mx-auto">
            <header className="flex items-center gap-3 mb-8">
                <button onClick={() => router.push('/')} className="p-2 -ml-2 text-tm-muted hover:text-white transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-2xl font-bold">{t('refer_page.title', 'Referral Dashboard')}</h1>
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
                        <div className="text-tm-muted tracking-wider uppercase font-bold text-[10px] mb-1">{t('refer_page.total_referred', 'Total Referred')}</div>
                        <div className="text-2xl font-black">{totalReferred}</div>
                    </div>
                </div>
                <div className="bg-tm-surface/50 border border-tm-border rounded-xl p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                        <DollarSign className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-tm-muted tracking-wider uppercase font-bold text-[10px] mb-1">{t('refer_page.total_earned', 'Total Earned')}</div>
                        <div className="text-2xl font-black">${data?.stats?.totalEarned || 0}</div>
                    </div>
                </div>
                <div className="bg-tm-surface/50 border border-tm-border rounded-xl p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400">
                        <Clock className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-tm-muted tracking-wider uppercase font-bold text-[10px] mb-1">{t('refer_page.potential_value', 'Potential Value')}</div>
                        <div className="text-2xl font-black">${pendingCredits}</div>
                    </div>
                </div>
            </div>

            {/* ── Referee Benefit Card ─ shown only if THIS user was referred ── */}
            {data?.refereeStatus && (() => {
                const rs = data.refereeStatus;
                const half = rs.referralHalf || 50;
                return (
                    <div className="mb-6 bg-gradient-to-r from-purple-900/20 to-purple-800/10 border border-purple-500/30 rounded-2xl p-5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-purple-600/10 blur-[60px] rounded-full pointer-events-none" />
                        <div className="flex items-center gap-2 mb-3">
                            <Gift className="w-5 h-5 text-purple-400" />
                            <h3 className="font-bold text-white text-sm">{t('refer_page.your_reward', 'Your Referral Reward')}</h3>
                            <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full font-mono">
                                {t('refer_page.via', 'via')} {rs.referredBy}
                            </span>
                        </div>
                        <p className="text-xs text-zinc-400 mb-4">
                            {t('refer_page.you_were_referred', "You were referred! Here's your")} <strong className="text-white">${rs.referralFee} {t('refer_page.total_reward', 'total reward')}</strong> {t('refer_page.applied_as_days', '— applied as free subscription days, no action needed.')}
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex gap-3 items-start">
                                <div className="mt-0.5 shrink-0">
                                    {rs.signupBonusPaid
                                        ? <CheckCircle2 className="w-5 h-5 text-purple-400" />
                                        : <Circle className="w-5 h-5 text-zinc-600" />
                                    }
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-white">
                                        {rs.signupBonusPaid ? t('refer_page.signup_bonus_applied', '✓ Signup Bonus Applied') : t('refer_page.signup_bonus_pending', 'Signup Bonus Pending')}
                                    </div>
                                    <div className="text-xs text-zinc-400 mt-0.5">
                                        <span className="text-purple-300 font-semibold">${half} {t('refer_page.signup_free_days', 'in free trial days')}</span> {t('refer_page.signup_extends', '— extends your trial before your first charge.')}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex gap-3 items-start">
                                <div className="mt-0.5 shrink-0">
                                    {rs.paymentBonusPaid
                                        ? <CheckCircle2 className="w-5 h-5 text-green-400" />
                                        : <Circle className="w-5 h-5 text-zinc-600" />
                                    }
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-white">
                                        {rs.paymentBonusPaid ? t('refer_page.charge_bonus_applied', '✓ First Charge Bonus Applied') : t('refer_page.charge_bonus_pending', 'First Charge Bonus — Coming')}
                                    </div>
                                    <div className="text-xs text-zinc-400 mt-0.5">
                                        <span className="text-green-400 font-semibold">${half} {t('refer_page.charge_more_days', 'more in free days')}</span> {t('refer_page.charge_auto', 'credited automatically when your first payment processes.')}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {rs.activity?.length > 0 && (
                            <div className="mt-4 space-y-2">
                                <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">{t('refer_page.credit_history', 'Your credit history')}</div>
                                {rs.activity.map((act: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between text-xs bg-black/20 px-3 py-2 rounded-lg">
                                        <span className="text-zinc-400">{act.description}</span>
                                        <span className="text-green-400 font-bold shrink-0 ml-2">
                                            {act.credit_amount > 0 ? `+$${act.credit_amount}` : ''}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })()}

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
                                    <div className="text-xs text-tm-muted">{t('refer_page.current_tier', 'Current Tier')}</div>
                                </div>
                            </div>
                            {nextAt && (
                                <div className="text-right">
                                    <div className="text-xs text-tm-muted">{totalReferred} / {nextAt} {t('refer_page.referrals_to_next', 'referrals to next tier')}</div>
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
                                {nextAt - totalReferred} {nextAt - totalReferred !== 1 ? t('refer_page.more_referrals_plural', 'more referrals') : t('refer_page.more_referrals', 'more referral')} {t('refer_page.to_unlock', 'to unlock')} <strong className="text-white">{data.tier.all?.find((tier: any) => tier.tier === currentTier.nextTier)?.name ?? 'next tier'}</strong>
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
                        <div className="text-sm font-bold text-white">{t('refer_page.leaderboard', 'Leaderboard')}</div>
                        <div className="text-[10px] text-tm-muted">{t('refer_page.see_top', 'See top affiliates')}</div>
                    </div>
                </Link>
                <Link href="/creators" className="bg-tm-surface border border-tm-purple/30 hover:border-tm-purple/60 rounded-xl p-4 flex items-center gap-3 transition-all">
                    <Rocket className="w-5 h-5 text-tm-purple" />
                    <div>
                        <div className="text-sm font-bold text-white">{t('refer_page.creator_program', 'Creator Program')}</div>
                        <div className="text-[10px] text-tm-muted">{t('refer_page.creator_apply', 'Apply for 20% rev share')}</div>
                    </div>
                </Link>
            </div>

            {/* How It Works — Collapsible */}
            <div className="bg-tm-surface border border-tm-border rounded-xl overflow-hidden mb-8">
                <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="w-full flex items-center justify-between p-5 hover:bg-white/[0.02] transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <HelpCircle className="w-5 h-5 text-tm-purple" />
                        <h3 className="text-lg font-bold text-white">{t('refer_page.how_it_works', 'How It Works & Rewards')}</h3>
                    </div>
                    <ChevronDown className={`w-5 h-5 text-tm-muted transition-transform duration-300 ${showDetails ? 'rotate-180' : ''}`} />
                </button>
                    
                {showDetails && (
                    <div className="p-5 border-t border-tm-border space-y-8 bg-black/20 animate-in fade-in slide-in-from-top-4 duration-300">
                        <section>
                            <div className="space-y-4">
                                <div className="flex gap-4">
                                    <div className="w-8 h-8 rounded-full bg-tm-purple/20 text-tm-purple font-bold flex items-center justify-center shrink-0">1</div>
                                    <div>
                                        <div className="font-bold text-sm mb-1">{t('refer_page.stage1_title', 'Stage 1 — Friend Signs Up (Both Get $50)')}</div>
                                        <div className="text-xs text-tm-muted leading-relaxed">
                                            <ul className="space-y-1 list-disc list-inside">
                                                <li><strong className="text-white">{t('refer_page.stage1_friend_gets', 'Your friend (referee)')}</strong> {t('refer_page.stage1_friend_desc', 'gets $50 worth of bonus trial days added on top of the 14-day base — no charge until the extended trial ends.')}</li>
                                                <li><strong className="text-white">{t('refer_page.stage1_you', 'You (referrer)')}</strong> {t('refer_page.stage1_you_desc', 'get your subscription extended immediately by the equivalent $50 in free days.')}</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="w-8 h-8 rounded-full bg-green-500/20 text-green-400 font-bold flex items-center justify-center shrink-0">2</div>
                                    <div>
                                        <div className="font-bold text-sm mb-1">{t('refer_page.stage2_title', 'Stage 2 — First Charge (Both Get Another $50)')}</div>
                                        <div className="text-xs text-tm-muted leading-relaxed">
                                            {t('refer_page.stage2_friend_desc', "When your friend's card is first charged after their trial:")}
                                            <ul className="mt-1.5 space-y-1 list-disc list-inside">
                                                <li><strong className="text-white">{t('refer_page.stage2_friend_gets', 'Your friend')}</strong> {t('refer_page.stage2_friend_more', 'gets another $50 in free days added.')}</li>
                                                <li><strong className="text-white">{t('refer_page.stage2_you_more', 'You get another $50 in free days too.')}</strong></li>
                                            </ul>
                                            <p className="mt-1">{t('refer_page.stage2_total', 'Total = $100 each in free subscription days.')}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-500 font-bold flex items-center justify-center shrink-0">★</div>
                                    <div>
                                        <div className="font-bold text-sm text-amber-400 mb-1">{t('refer_page.annual_bonus', 'Annual Plan Bonus')}</div>
                                        <div className="text-xs text-tm-muted leading-relaxed">{t('refer_page.annual_desc', 'Friend subscribes to an annual plan? Both you and your friend receive a larger bonus in free days ($75 each from the $150 annual bonus pool) in one shot.')}</div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Days Table */}
                        <section>
                            <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
                                <CalendarDays className="w-4 h-4 text-tm-purple" /> {t('refer_page.free_days_per_plan', 'Free Days Per Plan')}
                            </h4>
                            <div className="bg-tm-bg border border-tm-border rounded-xl overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-tm-border">
                                            <th className="text-left p-3 text-tm-muted font-semibold text-xs uppercase tracking-wider">{t('refer_page.plan', 'Plan')}</th>
                                            <th className="text-center p-3 text-tm-purple font-semibold text-xs uppercase tracking-wider">{t('refer_page.stage1_col', 'Stage 1 ($50)')}</th>
                                            <th className="text-center p-3 text-green-400 font-semibold text-xs uppercase tracking-wider">{t('refer_page.stage2_col', 'Stage 2 ($50)')}</th>
                                            <th className="text-center p-3 text-white font-semibold text-xs uppercase tracking-wider">{t('refer_page.total_col', 'Total ($100)')}</th>
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
                                    <p className="text-[10px] text-tm-muted text-center">{t('refer_page.days_formula', 'Days = credit ÷ (monthly price ÷ 30). Both referrer and referee receive each stage. Applied automatically.')}</p>
                                </div>
                            </div>
                        </section>
                    </div>
                )}
            </div>

            {/* Referrals List — full width */}
            <section className="mb-8">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-400" /> {t('refer_page.your_referrals', 'Your Referrals')}
                </h3>
                
                <div className="bg-tm-surface border border-tm-border rounded-xl overflow-hidden">
                    {data?.referrals?.length === 0 ? (
                        <div className="p-8 text-center text-tm-muted text-sm">
                            {t('refer_page.no_referrals', 'No referrals yet. Share your link to get started!')}
                        </div>
                    ) : (
                        <div className="divide-y divide-tm-border">
                            {data?.referrals?.map((ref: any) => (
                                <div key={ref.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div>
                                        <div className="font-bold text-sm flex items-center gap-2">
                                            {ref.name}
                                            {ref.annualBonusPaid && <span className="bg-amber-500/20 text-amber-400 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">{t('refer_page.annual_badge', 'Annual')}</span>}
                                        </div>
                                        <div className="text-xs text-tm-muted mt-1">
                                            {t('refer_page.joined', 'Joined')} {new Date(ref.joinedAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1.5 bg-tm-bg p-2 rounded-lg border border-tm-border">
                                            <div className="flex flex-col items-center gap-1 w-14">
                                                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                                                <div className="text-[9px] text-tm-muted uppercase">{t('refer_page.signed_up', 'Signed Up')}</div>
                                            </div>
                                            <div className="w-4 h-[1px] bg-tm-border"></div>
                                            <div className="flex flex-col items-center gap-1 w-14">
                                                <div className={`w-3 h-3 rounded-full ${ref.signupBonusPaid ? 'bg-tm-purple shadow-[0_0_8px_#a855f7]' : 'bg-tm-border'}`}></div>
                                                <div className="text-[9px] text-tm-muted uppercase">{t('refer_page.sent', '+$50 Sent')}</div>
                                            </div>
                                            <div className="w-4 h-[1px] bg-tm-border"></div>
                                            <div className="flex flex-col items-center gap-1 w-14">
                                                <div className={`w-3 h-3 rounded-full ${ref.stage1Paid || ref.annualBonusPaid ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-tm-border'}`}></div>
                                                <div className="text-[9px] text-tm-muted uppercase">{t('refer_page.paid', '+$50 Paid')}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* Recent Activity — full width BELOW referrals */}
            <section>
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-emerald-400" /> {t('refer_page.recent_activity', 'Recent Activity')}
                </h3>
                <div className="bg-tm-surface border border-tm-border rounded-xl p-5">
                    {data?.activity?.length === 0 ? (
                        <div className="text-center text-tm-muted text-sm py-4">
                            {t('refer_page.no_activity', 'No activity yet.')}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {data?.activity?.map((act: any, i: number) => (
                                <div key={i} className="flex items-start gap-3 p-3 bg-tm-bg rounded-lg border border-tm-border/50">
                                    <div className="mt-0.5 shrink-0">
                                        {act.credit_amount > 0 ? (
                                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1" />
                                        ) : (
                                            <div className="w-2.5 h-2.5 rounded-full bg-blue-400 mt-1" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className={`text-xs font-bold ${act.credit_amount > 0 ? 'text-emerald-400' : 'text-white'}`}>
                                                {act.credit_amount > 0 ? `+$${act.credit_amount}` : t('refer_page.update', 'Update')}
                                            </span>
                                            <time className="text-[10px] text-tm-muted font-medium shrink-0">
                                                {new Date(act.created_at).toLocaleDateString()}
                                            </time>
                                        </div>
                                        <div className="text-xs text-tm-muted/90 leading-snug mt-0.5">
                                            {act.description}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>
        </main>
    );
}
