import React from 'react';
import Link from 'next/link';
import { Gift, ArrowRight, CalendarDays, DollarSign, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function ReferralPromoSection() {
    const { t } = useTranslation();
    return (
        <section className="w-full max-w-5xl mx-auto py-12 px-6 relative z-10 text-center">
            <div className="bg-gradient-to-r from-tm-purple/10 to-tm-blue/10 border border-white/10 rounded-2xl p-10 flex flex-col items-center shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-tm-purple/20 blur-[100px] rounded-full pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-tm-blue/20 blur-[100px] rounded-full pointer-events-none"></div>

                <div className="w-16 h-16 bg-tm-purple/20 rounded-full flex items-center justify-center mb-6 border border-tm-purple/30 z-10">
                    <Gift className="w-8 h-8 text-tm-purple" />
                </div>

                <h2 className="text-3xl font-bold text-white mb-3 z-10">{t('referral.title', 'Invite Friends — Earn Cash & Free Days')}</h2>
                <p className="text-tm-muted max-w-2xl mx-auto mb-2 z-10">
                    {t('referral.desc', 'Share your unique link. When a friend converts from their free trial to a paid plan, you earn both a cash account credit and free subscription extension days automatically.')}
                </p>
                <p className="text-xs text-tm-muted mb-8 z-10">
                    e.g. on TurboCore Monthly ($29/mo), a $50 reward = <strong className="text-white">~52 extra free days</strong> before your next charge.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left mb-8 w-full z-10">
                    <div className="bg-white/5 p-5 rounded-xl border border-white/10 flex flex-col gap-2">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-7 h-7 rounded-full bg-tm-purple/20 flex items-center justify-center text-tm-purple font-bold text-sm shrink-0">1</div>
                            <h4 className="font-bold text-white text-sm">{t('referral.stage1_title', 'Stage 1 — Trial Conversion')}</h4>
                        </div>
                        <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span className="text-xs text-tm-muted"><strong className="text-white">$50 cash credit</strong> on your next invoice</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CalendarDays className="w-4 h-4 text-tm-purple shrink-0" />
                            <span className="text-xs text-tm-muted"><strong className="text-tm-purple">Free days added</strong> to your renewal date (≈52 days on TurboCore)</span>
                        </div>
                    </div>
                    <div className="bg-white/5 p-5 rounded-xl border border-white/10 flex flex-col gap-2">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-7 h-7 rounded-full bg-tm-purple/20 flex items-center justify-center text-tm-purple font-bold text-sm shrink-0">2</div>
                            <h4 className="font-bold text-white text-sm">{t('referral.stage2_title', 'Stage 2 — Second Month')}</h4>
                        </div>
                        <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span className="text-xs text-tm-muted">Another <strong className="text-white">$50 cash credit</strong> when month 2 completes</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CalendarDays className="w-4 h-4 text-tm-purple shrink-0" />
                            <span className="text-xs text-tm-muted">More <strong className="text-tm-purple">free days</strong> stacked on top automatically</span>
                        </div>
                    </div>
                    <div className="bg-tm-purple/10 p-5 rounded-xl border border-tm-purple/30 flex flex-col gap-2">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-sm shrink-0">★</div>
                            <h4 className="font-bold text-tm-purple text-sm">{t('referral.annual_title', 'Annual Bonus Bypass')}</h4>
                        </div>
                        <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-amber-400 shrink-0" />
                            <span className="text-xs text-tm-muted"><strong className="text-white">$150 instant credit</strong> if friend goes annual</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CalendarDays className="w-4 h-4 text-amber-400 shrink-0" />
                            <span className="text-xs text-tm-muted"><strong className="text-amber-400">Up to 155+ free days</strong> depending on your plan</span>
                        </div>
                    </div>
                </div>

                <Link href="/refer" className="inline-flex items-center gap-2 bg-white text-[#0A0A0F] hover:bg-gray-200 px-8 py-3 rounded-full font-bold transition-all z-10 shadow-lg shadow-white/10 hover:shadow-white/20">
                    {t('referral.btn', 'Go to Referral Dashboard')} <ArrowRight className="w-5 h-5" />
                </Link>
            </div>
        </section>
    );
}

