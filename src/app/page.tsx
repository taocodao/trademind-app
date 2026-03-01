'use client';

import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { InteractiveTimeline } from '@/components/marketing/InteractiveTimeline';
import { useLanguage } from '@/components/marketing/LanguageContext';
import { useState, useEffect } from 'react';
import { ArrowRight, TrendingUp } from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import CompoundingCalculator from '@/components/ui/CompoundingCalculator';

export default function SinglePageMarketing() {
    const { t } = useLanguage();
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
            <section className="relative px-6 py-12 lg:py-24 flex flex-col items-center justify-center min-h-[90vh] max-w-7xl mx-auto w-full">

                {/* Background Glows */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-tm-purple/10 blur-[120px] rounded-full pointer-events-none"></div>

                {/* Hero Headers */}
                <div className="text-center z-10 mb-12">
                    <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tight mb-6">
                        {t('hero.title').split(' ').map((word, i, arr) => (
                            i >= arr.length - 2 ?
                                <span key={i} className="text-transparent bg-clip-text bg-gradient-to-r from-tm-purple to-[#9d63f5]"> {word} </span>
                                : <span key={i}>{word} </span>
                        ))}
                    </h1>
                    <p className="text-lg md:text-xl text-tm-muted max-w-2xl mx-auto">
                        {t('hero.subtitle')}
                    </p>
                </div>

                {/* Interactive Backtest Player */}
                <div className="w-full max-w-4xl z-10">
                    <InteractiveTimeline data={curveData} />
                </div>

                {/* Calculator Integration */}
                <div className="w-full max-w-4xl z-10 mt-24">
                    <div className="text-center mb-8">
                        <TrendingUp className="w-10 h-10 text-tm-purple mx-auto mb-4" />
                        <h2 className="text-3xl font-bold text-white">{t('calculator.title')}</h2>
                        <p className="text-tm-muted mt-2">The math of 20% annualized growth.</p>
                    </div>
                    <CompoundingCalculator />
                </div>

                {/* Bottom CTA */}
                <div className="z-10 mt-32 mb-16">
                    <button
                        onClick={login}
                        className="btn-primary px-10 py-5 text-xl font-bold flex items-center gap-3 shadow-[0_0_30px_rgba(124,58,237,0.5)] hover:shadow-[0_0_50px_rgba(124,58,237,0.7)] transition-all mx-auto"
                    >
                        {t('hero.cta')} <ArrowRight className="w-6 h-6" />
                    </button>
                </div>
            </section>
        </main>
    );
}
