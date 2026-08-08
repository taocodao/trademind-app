'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Bot, Activity, Bell, Settings, LogOut, Gift } from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';
import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAccountContext } from '@/components/providers/AccountContext';

export function BottomNav() {
    const pathname = usePathname();
    const { authenticated, ready, logout } = usePrivy();
    const [mounted, setMounted] = useState(false);
    const { t } = useTranslation();
    const { activeAccountId } = useAccountContext();

    useEffect(() => {
        setMounted(true);
    }, []);

    // useMemo MUST be called before any early returns (Rules of Hooks)
    // Positions & Activity route through the ACTIVE ACCOUNT. Without an account,
    // both fall back to /accounts so the user can create/select one first.
    const positionsHref = activeAccountId ? `/account/${activeAccountId}` : '/accounts';
    const activityHref = activeAccountId ? `/account/${activeAccountId}?tab=activity` : '/accounts';

    const navItems = useMemo(() => [
        { name: t('dashboard.nav.home', 'Home'),    href: '/dashboard', icon: Home },
        { name: t('dashboard.nav.ai', 'AI'),        href: '/ai',        icon: Bot },
        { name: t('dashboard.nav.positions'),       href: positionsHref, icon: Activity, match: '/account' },
        { name: t('dashboard.nav.activity'),        href: activityHref,  icon: Bell, match: '/account' },
        { name: t('dashboard.nav.refer', 'Refer'),  href: '/refer',     icon: Gift, highlight: true },
        { name: t('dashboard.nav.settings'),        href: '/settings',  icon: Settings },
    ], [t, positionsHref, activityHref]);

    if (!mounted || !ready || !authenticated) return null;
    if (pathname.startsWith('/review')) return null;

    // Do not show on public marketing pages (but /refer IS shown when logged in)
    const publicRoutes = ['/', '/how-it-works', '/results', '/family'];
    if (publicRoutes.includes(pathname) || pathname.startsWith('/c/')) return null;

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-tm-surface/90 backdrop-blur-md border-t border-tm-border pb-safe">
            <div className="flex items-center justify-around px-1 py-2">
                {navItems.map((item) => {
                    const itemPath = item.href.split('?')[0];
                    let isActive: boolean;
                    if (item.href === '/dashboard') {
                        isActive = pathname === '/dashboard';
                    } else if ((item as any).match === '/account') {
                        // Account-routed items: highlight only when on an /account page
                        // AND (for Activity) the activity tab is requested. Positions is
                        // the default tab, so it highlights unless ?tab=activity.
                        const onAccountPage = pathname.startsWith('/account');
                        const wantsActivity = item.href.includes('tab=activity');
                        if (typeof window !== 'undefined') {
                            const tabParam = new URLSearchParams(window.location.search).get('tab');
                            isActive = onAccountPage && (wantsActivity ? tabParam === 'activity' : tabParam !== 'activity');
                        } else {
                            isActive = onAccountPage && !wantsActivity;
                        }
                    } else {
                        isActive = pathname === itemPath || pathname.startsWith(itemPath);
                    }
                    const Icon = item.icon;
                    const isHighlight = (item as any).highlight;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`relative flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all ${
                                isActive
                                    ? isHighlight
                                        ? 'text-tm-purple'
                                        : 'text-tm-purple'
                                    : isHighlight
                                        ? 'text-zinc-400 hover:text-tm-purple'
                                        : 'text-tm-muted hover:text-white'
                            }`}
                        >
                            {/* Glowing ring for Refer tab */}
                            {isHighlight && !isActive && (
                                <span className="absolute top-1 right-1.5 w-2 h-2 bg-tm-purple rounded-full shadow-[0_0_6px_rgba(168,85,247,0.8)] animate-pulse" />
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
                    className="flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-colors text-tm-red/80 hover:text-tm-red"
                >
                    <LogOut className="w-5 h-5 mb-1" />
                    <span className="text-[10px] font-medium">{t('dashboard.nav.exit', 'Exit')}</span>
                </button>
            </div>
        </nav>
    );
}
