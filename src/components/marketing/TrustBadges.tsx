import React from 'react';
import { useTranslation } from 'react-i18next';

export function TrustBadges() {
    const { t } = useTranslation();
    return (
        <section className="w-full max-w-5xl mx-auto py-12 px-6 text-center border-t border-white/5 mt-10">
            <p className="text-xs uppercase tracking-widest text-tm-muted font-bold mb-8">{t('trust.title')}</p>
            <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
                {/* Simulated Logos using styled text */}
                <div className="text-xl font-black tracking-tighter text-white font-sans flex items-center gap-1">
                    <span className="text-red-500">tasty</span>trade
                </div>
                <div className="text-xl font-bold text-white tracking-widest flexitems-center gap-1">
                    <span className="text-purple-500">E*TRADE</span>
                </div>
                <div className="text-xl font-bold text-blue-400 tracking-tight">
                    stripe
                </div>
                <div className="text-xl font-bold text-white tracking-tight flex items-center">
                    <span className="text-green-500 mr-1 text-2xl">•</span> PLAID
                </div>
                <div className="text-xl font-bold text-gray-200 tracking-tight flex items-center">
                    <span className="text-blue-500 mr-1 font-serif text-2xl">O</span>Auth2
                </div>
            </div>
        </section>
    );
}
