'use client';

import React from 'react';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import { useTranslation } from 'react-i18next';
import { Languages, Zap } from 'lucide-react';

export function MarketingHeader() {
    const { login, authenticated } = usePrivy();
    const { t, i18n } = useTranslation();

    const activeLanguage = i18n.language ? i18n.language.split('-')[0] : 'en';

    const setLang = (lang: string) => {
        i18n.changeLanguage(lang);
    };

    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-tm-bg/80 backdrop-blur-md border-b border-tm-border h-16">
            <div className="h-full px-6 flex items-center justify-between max-w-7xl mx-auto">
                {/* Left: Demo tour */}
                <Link href="/demo" className="flex items-center gap-2 text-tm-purple hover:text-white transition-colors font-semibold text-sm border border-tm-purple/40 hover:border-tm-purple px-3 py-1.5 rounded-full hover:bg-tm-purple/10">
                    <Zap className="w-4 h-4" />
                    <span className="hidden sm:inline">Demo</span>
                </Link>

                {/* Center: Language Selector */}
                <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5 p-1 rounded-full bg-tm-card border border-tm-border/50 shadow-inner">
                    <button
                        onClick={() => setLang('en')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${activeLanguage === 'en' ? 'bg-tm-purple text-white shadow-md' : 'text-tm-muted hover:text-white/80 hover:bg-white/5'}`}
                    >
                        EN
                    </button>
                    <button
                        onClick={() => setLang('es')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${activeLanguage === 'es' ? 'bg-tm-purple text-white shadow-md' : 'text-tm-muted hover:text-white/80 hover:bg-white/5'}`}
                    >
                        ES
                    </button>
                    <button
                        onClick={() => setLang('zh')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${activeLanguage === 'zh' ? 'bg-tm-purple text-white shadow-md' : 'text-tm-muted hover:text-white/80 hover:bg-white/5'}`}
                    >
                        中文
                    </button>
                </div>

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
