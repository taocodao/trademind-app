'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Wallet, Settings, LogOut, Gift } from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';
import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Bottom navigation — account-centric model (Aug 2026 rework).
 *
 * The account is the app: positions, signals, and activity live as tabs
 * inside the account workspace at /account/[id]. The bar only carries the
 * few destinations that are truly global: Accounts (home), Refer, Settings,
 * and Exit.
 */
export function BottomNav() {
    const pathname = usePathname();
    const { authenticated, ready, logout } = usePrivy();
    const [mounted, setMounted] = useState(false);
    const { t } = useTranslation();

    useEffect(() => {
        setMounted(true);
    }, []);

    const navItems = useMemo(() => [
        { name: t('dashboard.nav.accounts', 'Accounts'), href: '/accounts', icon: Wallet, match: ['/accounts', '/account'] },
        { name: t('dashboard.nav.refer', 'Refer'),       href: '/refer',    icon: Gift, highlight: true, match: ['/refer'] },
        { name: t('dashboard.nav.settings', 'Settings'), href: '/settings', icon: Settings, match: ['/settings'] },
    ], [t]);

    if (!mounted || !ready || !authenticated) return null;
    if (pathname.startsWith('/review')) return null;

    // Do not show on public marketing pages (but /refer IS shown when logged in)
    const publicRoutes = ['/', '/how-it-works', '/results', '/family'];
    if (publicRoutes.includes(pathname) || pathname.startsWith('/c/')) return null;

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-tm-surface/90 backdrop-blur-md border-t border-tm-border pb-safe">
            <div className="flex items-center justify-around px-1 py-2">
                {navItems.map((item) => {
                    const isActive = item.match.some((m) => pathname === m || pathname.startsWith(m + '/') || pathname.startsWith(m));
                    const Icon = item.icon;
                    const isHighlight = (item as any).highlight;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`relative flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-all ${
                                isActive
                                    ? 'text-tm-purple'
                                    : isHighlight
                                        ? 'text-zinc-400 hover:text-tm-purple'
                                        : 'text-tm-muted hover:text-white'
                            }`}
                        >
                            {/* Glowing ring for Refer tab */}
                            {isHighlight && !isActive && (
                                <span className="absolute top-1 right-3 w-2 h-2 bg-tm-purple rounded-full shadow-[0_0_6px_rgba(168,85,247,0.8)] animate-pulse" />
                            )}
                            <Icon className={`w-5 h-5 mb-1 transition-all ${
                                isActive && isHighlight
                                    ? 'text-tm-purple drop-shadow-[0_0_6px_rgba(168,85,247,0.8)]'
                                    : ''
                            }`} />
                            <span className={`text-[10px] font-medium ${isHighlight && !isActive ? 'text-tm-purple' : ''}`}>
                                {item.name}
                            </span>
                        </Link>
                    );
                })}
                <button
                    onClick={() => logout()}
                    className="flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-colors text-tm-red/80 hover:text-tm-red"
                >
                    <LogOut className="w-5 h-5 mb-1" />
                    <span className="text-[10px] font-medium">{t('dashboard.nav.exit', 'Exit')}</span>
                </button>
            </div>
        </nav>
    );
}
