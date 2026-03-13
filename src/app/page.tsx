'use client';

import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { InteractiveTimeline } from '@/components/marketing/InteractiveTimeline';
import { EducationCenter } from '@/components/marketing/EducationCenter';
import { StatisticsPanel } from '@/components/marketing/StatisticsPanel';
import { PricingSection } from '@/components/marketing/PricingSection';
import { ReferralPromoSection } from '@/components/marketing/ReferralPromoSection';
import { TrustBadges } from '@/components/marketing/TrustBadges';
import { LegalFooter } from '@/components/marketing/LegalFooter';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';

export default function SinglePageMarketing() {
    const { t, i18n } = useTranslation();
    const { login, authenticated, ready } = usePrivy();
    const router = useRouter();
    const [curveData, setCurveData] = useState([]);

    useEffect(() => {
        if (ready && authenticated) {
            router.push('/dashboard');
        }
    }, [ready, authenticated, router]);

    useEffect(() => {
        fetch('/turbobounce_5k_curve.json')
            .then(res => res.json())
            .then(data => setCurveData(data))
            .catch(err => console.error("Failed to load curve data:", err));
    }, []);

    if (!ready) {
        return (
            <main className="min-h-screen flex items-center justify-center bg-tm-bg">
                <div className="w-12 h-12 rounded-full border-4 border-tm-border border-t-tm-purple animate-spin" />
            </main>
        );
    }

    if (authenticated) return null;

    return (
        <main className="min-h-screen flex flex-col bg-[#0A0A0F] overflow-x-hidden pt-16">
            <MarketingHeader />

            {/* Main Interactive Stage */}
            <section className="relative px-6 py-4 lg:py-8 flex flex-col items-center justify-center min-h-[90vh] max-w-7xl mx-auto w-full">

                {/* Background Glows */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-tm-purple/10 blur-[120px] rounded-full pointer-events-none"></div>

                {/* Hero Headers */}
                <div className="text-center z-10 mb-12 transform transition-all duration-1000 hover:scale-[1.01]">
                    <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight mb-4">
                        {t('hero.title').split(' ').map((word: string, i: number, arr: string[]) => (
                            i >= arr.length - 2 ?
                                <span key={i} className="text-transparent bg-clip-text bg-gradient-to-r from-tm-purple to-[#9d63f5] animate-pulse"> {word} </span>
                                : <span key={i}>{word} </span>
                        ))}
                    </h1>
                    <p className="text-sm md:text-lg text-tm-muted max-w-2xl mx-auto">
                        {t('hero.subtitle')}
                    </p>
                </div>

                {/* Video Showcase Section */}
                <div className="w-full max-w-4xl z-10 mb-16 mx-auto group">
                    <div className="relative rounded-2xl p-1 bg-gradient-to-b from-tm-purple/20 to-transparent shadow-[0_0_50px_rgba(124,58,237,0.15)] group-hover:shadow-[0_0_70px_rgba(124,58,237,0.3)] transition-all duration-500">
                        <video
                            key={i18n.language || 'en'}
                            src={{
                                en: 'https://2axcssbne03i2gdo.public.blob.vercel-storage.com/AI-Powered_Investing.mp4',
                                es: 'https://2axcssbne03i2gdo.public.blob.vercel-storage.com/IA__Estrategias_TurboCore.mp4',
                                zh: 'https://2axcssbne03i2gdo.public.blob.vercel-storage.com/AI%E6%8A%95%E8%B5%84%EF%BC%9A%E6%88%98%E8%83%9C%E5%B8%82%E5%9C%BA%E5%B4%A9%E7%9B%98.mp4',
                            }[i18n.language || 'en'] || 'https://2axcssbne03i2gdo.public.blob.vercel-storage.com/AI-Powered_Investing.mp4'}
                            className="w-full rounded-xl border border-white/10 object-cover bg-tm-card/80"
                            controls
                            playsInline
                        />
                    </div>
                </div>

                {/* Interactive Backtest Player */}
                <div className="w-full max-w-5xl z-10 flex flex-col gap-8 mx-auto" id="about">
                    <div className="w-full">
                        <StatisticsPanel />
                    </div>
                    <div className="w-full flex flex-col gap-8">
                        <InteractiveTimeline data={curveData} />


                        {/* Education Center Dropdown */}
                        <div className="w-full z-10" id="education">
                            <EducationCenter />
                        </div>
                    </div>
                </div>

                {/* Conversion & Scaling Layouts */}
                <div className="w-full flex flex-col items-center justify-center mt-20 z-10">
                    <PricingSection />
                    <ReferralPromoSection />
                </div>

                {/* Bottom CTA & Trust Section */}
                <div className="z-10 mt-20 mb-10 w-full flex flex-col items-center">
                    <button
                        onClick={login}
                        className="btn-primary px-10 py-5 text-xl font-bold flex items-center gap-3 shadow-[0_0_30px_rgba(124,58,237,0.5)] hover:shadow-[0_0_50px_rgba(124,58,237,0.7)] hover:scale-[1.02] transition-all mx-auto"
                    >
                        {t('hero.cta')} <ArrowRight className="w-6 h-6" />
                    </button>
                    <TrustBadges />
                </div>
            </section>

            {/* Regulatory Disclaimers */}
            <LegalFooter />
        </main>
    );
}
