'use client';

/* MarketingHeader — floating header for the landing surface. The Demo and
   Login pills sit on a dark hero photo, so both need enough contrast on
   their own to pass WCAG AA at 14 px. Login is a solid pill (accent purple
   fill, near-black text); Demo is an outlined pill (lighter violet border
   and text). Focus-visible rings are inherited from the same accent so
   keyboard users see the same handoff shoulder we ship in the deck. */

import React from 'react';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import { useTranslation } from 'react-i18next';
import { Zap } from 'lucide-react';

export function MarketingHeader() {
    const { login, authenticated } = usePrivy();
    const { t, i18n } = useTranslation();

    const activeLanguage = i18n.language ? i18n.language.split('-')[0] : 'en';
    const setLang = (lang: string) => { i18n.changeLanguage(lang); };

    /* Inline styles keep the accent hex out of the Tailwind purge cycle so a
       missing config entry never silently downgrades the header contrast. */
    const HEADER_BG = 'rgba(10,13,18,0.92)';
    const BORDER = '1px solid rgba(255,255,255,0.06)';
    const ACCENT = '#A78BFA';
    const ACCENT_STRONG = '#8B5CF6';
    const INK_ON_ACCENT = '#0A0D12';
    const INACTIVE_LANG = '#9AA3B5';

    return (
        <header
            className="fixed top-0 left-0 right-0 z-50 h-16 backdrop-blur-md tm-marketing-header"
            style={{ background: HEADER_BG, borderBottom: BORDER }}
        >
            <div className="h-full px-6 flex items-center justify-between max-w-7xl mx-auto">
                {/* Left, Demo tour. Outlined pill on top of a dark hero. */}
                <Link
                    href="/demo"
                    className="tm-mh-btn tm-mh-demo"
                    style={{
                        border: `1.5px solid ${ACCENT}`,
                        color: '#C4B5FD',
                        background: 'transparent',
                    }}
                >
                    <Zap className="w-4 h-4" style={{ color: ACCENT }} />
                    <span className="hidden sm:inline">Demo</span>
                </Link>

                {/* Center, language selector. Inactive labels lift to #9AA3B5
                    so they read clearly on the hero photo. */}
                <div
                    className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1 p-1 rounded-full"
                    style={{
                        background: 'rgba(20,20,31,0.85)',
                        border: '1px solid rgba(255,255,255,0.10)',
                    }}
                >
                    {(['en', 'es', 'zh'] as const).map(code => {
                        const label = code === 'en' ? 'EN' : code === 'es' ? 'ES' : '中文';
                        const active = activeLanguage === code;
                        return (
                            <button
                                key={code}
                                onClick={() => setLang(code)}
                                className="tm-mh-lang"
                                style={{
                                    padding: '0.35rem 0.85rem',
                                    borderRadius: 999,
                                    fontSize: 12,
                                    fontWeight: 700,
                                    background: active ? ACCENT_STRONG : 'transparent',
                                    color: active ? '#FFFFFF' : INACTIVE_LANG,
                                    border: 'none',
                                    transition: 'background .18s ease, color .18s ease',
                                }}
                            >
                                {label}
                            </button>
                        );
                    })}
                </div>

                {/* Right, Login or Dashboard. Solid accent pill for real
                    contrast against the hero photo. */}
                {!authenticated ? (
                    <button
                        onClick={login}
                        className="tm-mh-btn tm-mh-login"
                        style={{
                            background: ACCENT_STRONG,
                            color: INK_ON_ACCENT,
                            border: `1px solid ${ACCENT_STRONG}`,
                        }}
                    >
                        {t('nav.login')}
                    </button>
                ) : (
                    <Link
                        href="/dashboard"
                        className="tm-mh-btn tm-mh-login"
                        style={{
                            background: '#22C55E',
                            color: '#08130B',
                            border: '1px solid #22C55E',
                        }}
                    >
                        Dashboard
                    </Link>
                )}
            </div>
        </header>
    );
}
