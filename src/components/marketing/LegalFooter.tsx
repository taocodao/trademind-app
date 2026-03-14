'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

export function LegalFooter() {
    const { t } = useTranslation();

    return (
        <footer className="w-full bg-[#05050A] py-12 px-6 border-t border-white/10 mt-10 z-20 relative">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-start mb-12 border-b border-white/10 pb-8 gap-8">
                    <div>
                        <h3 className="text-2xl font-black tracking-tighter text-white mb-2">TradeMind<span className="text-tm-purple">@bot</span></h3>
                        <p className="text-white font-semibold text-sm mb-1">{t('footer.tagline') || 'Trade Smarter. Compound Faster.'}</p>
                        <p className="text-tm-muted text-sm">{t('footer.subtitle') || 'AI-powered trading signals for every brokerage.'}</p>
                    </div>
                    <div className="flex gap-16 md:gap-24 text-sm text-left">
                        <div className="flex flex-col gap-3">
                            <span className="text-white font-bold mb-1">{t('footer.company') || 'Company'}</span>
                            <Link href="/about" className="text-tm-muted hover:text-white transition-colors">{t('footer.about') || 'About Us'}</Link>
                            <Link href="/#education" className="text-tm-muted hover:text-white transition-colors">{t('footer.education') || 'Education Center'}</Link>
                            <Link href="/#pricing" className="text-tm-muted hover:text-white transition-colors">{t('footer.pricing') || 'Pricing'}</Link>
                        </div>
                        <div className="flex flex-col gap-3">
                            <span className="text-white font-bold mb-1">{t('footer.legal') || 'Legal'}</span>
                            <Link href="/terms" className="text-tm-muted hover:text-white transition-colors">{t('footer.terms') || 'Terms of Service'}</Link>
                            <Link href="/privacy" className="text-tm-muted hover:text-white transition-colors">{t('footer.privacy') || 'Privacy Policy'}</Link>
                            <Link href="/risk-disclosure" className="text-tm-muted hover:text-white transition-colors">{t('footer.risk') || 'Risk Disclosure'}</Link>
                        </div>
                    </div>
                </div>

                <div className="text-[10px] md:text-xs text-tm-muted/50 leading-relaxed font-mono space-y-4">
                    <p>
                        IMPORTANT DISCLAIMER: TradeMind@bot is a software technology platform, not a registered investment advisor or broker-dealer. All signals are algorithmically generated and are not personalized financial advice. Past performance is not indicative of future results. CFTC Rule 4.41: Simulated or hypothetical performance results do not represent actual trading. Brokerage services are provided by third-party broker-dealers. TradeMind@bot never holds customer funds or executes trades outside of user-authorized broker API configurations.
                    </p>
                    <p className="text-center pt-6 text-tm-muted/70">
                        &copy; {new Date().getFullYear()} TradeMind@bot LLC. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
}
