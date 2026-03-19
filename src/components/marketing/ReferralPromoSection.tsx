import React from 'react';
import Link from 'next/link';
import { Gift, ArrowRight } from 'lucide-react';
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

                <h2 className="text-3xl font-bold text-white mb-3 z-10">{t('referral.title', 'Invite Friends, Earn Credits')}</h2>
                <div className="text-tm-muted max-w-2xl mx-auto mb-8 z-10 space-y-4">
                    <p>
                        {t('referral.desc', 'Share your unique link. When a friend signs up for a paid plan after their trial, you earn account credits automatically applied to your next bill.')}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left mt-6">
                        <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                            <h4 className="font-bold text-white mb-1">{t('referral.stage1_title', 'Stage 1: The Trial Conversion')}</h4>
                            <p className="text-sm" dangerouslySetInnerHTML={{ __html: t('referral.stage1_desc', 'Get $50 credit when they pay for their first month after the 14-day trial.') }} />
                        </div>
                        <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                            <h4 className="font-bold text-white mb-1">{t('referral.stage2_title', 'Stage 2: The Second Month')}</h4>
                            <p className="text-sm" dangerouslySetInnerHTML={{ __html: t('referral.stage2_desc', 'Get another $50 credit when they complete their second paid month.') }} />
                        </div>
                        <div className="bg-tm-purple/10 p-4 rounded-xl border border-tm-purple/30">
                            <h4 className="font-bold text-tm-purple mb-1">{t('referral.annual_title', 'Annual Bonus Bypass')}</h4>
                            <p className="text-sm" dangerouslySetInnerHTML={{ __html: t('referral.annual_desc', 'Get a <strong>$150 credit instantly</strong> if they bypass monthly and sign up for an Annual Plan!') }} />
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
