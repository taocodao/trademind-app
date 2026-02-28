'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, TrendingUp, Activity, Bell, Settings } from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';
import { useEffect, useState } from 'react';

export function BottomNav() {
    const pathname = usePathname();
    const { authenticated, ready } = usePrivy();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted || !ready || !authenticated) return null;

    // Do not show on public marketing pages
    const publicRoutes = ['/', '/how-it-works', '/results', '/refer', '/family'];
    if (publicRoutes.includes(pathname)) return null;

    const navItems = [
        { name: 'Home', href: '/dashboard', icon: Home },
        { name: 'Signals', href: '/signals', icon: TrendingUp },
        { name: 'Positions', href: '/positions', icon: Activity },
        { name: 'Activity', href: '/activity', icon: Bell },
        { name: 'Settings', href: '/settings', icon: Settings },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-tm-surface/90 backdrop-blur-md border-t border-tm-border pb-safe md:hidden">
            <div className="flex items-center justify-around px-2 py-2">
                {navItems.map((item) => {
                    const isActive = pathname.startsWith(item.href);
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-colors ${isActive ? 'text-tm-purple' : 'text-tm-muted hover:text-white'
                                }`}
                        >
                            <Icon className={`w-5 h-5 mb-1 ${isActive ? 'fill-tm-purple/20' : ''}`} />
                            <span className="text-[10px] font-medium">{item.name}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
