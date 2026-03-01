'use client';

import React from 'react';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import { useLanguage, Language } from './LanguageContext';
import { Languages, Users } from 'lucide-react';

export function MarketingHeader() {
    const { login, authenticated } = usePrivy();
    const { language, setLanguage, t } = useLanguage();

    const toggleLanguage = () => {
        if (language === 'en') setLanguage('es');
        else if (language === 'es') setLanguage('zh');
        else setLanguage('en');
    };

    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-tm-bg/80 backdrop-blur-md border-b border-tm-border h-16">
            <div className="h-full px-6 flex items-center justify-between max-w-7xl mx-auto">
                {/* Left: Refer a friend */}
                <Link href="/refer" className="flex items-center gap-2 text-tm-muted hover:text-tm-purple transition-colors font-semibold text-sm">
                    <Users className="w-5 h-5" />
                    <span className="hidden sm:inline">{t('nav.refer')}</span>
                </Link>

                {/* Center: Language Selector */}
                <button
                    onClick={toggleLanguage}
                    className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-full bg-tm-card border border-tm-border text-tm-muted hover:text-white transition-colors text-sm font-medium"
                >
                    <Languages className="w-4 h-4 text-tm-purple" />
                    {language === 'en' && 'English'}
                    {language === 'es' && 'Español'}
                    {language === 'zh' && '中文'}
                </button>

                {/* Right: Login */}
                {!authenticated ? (
                    <button
                        onClick={login}
                        className="px-5 py-2 rounded-lg bg-tm-purple/10 text-tm-purple border border-tm-purple hover:bg-tm-purple hover:text-white transition-all text-sm font-bold"
                    >
                        {t('nav.login')}
                    </button>
                ) : (
                    <Link href="/dashboard" className="px-5 py-2 rounded-lg bg-tm-green/10 text-tm-green border border-tm-green hover:bg-tm-green hover:text-tm-bg transition-all text-sm font-bold">
                        Dashboard
                    </Link>
                )}
            </div>
        </header>
    );
}
