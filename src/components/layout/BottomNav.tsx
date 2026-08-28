'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Wallet, Settings, LogOut, Gift, Zap, LayoutList, Check, X, PlusCircle, Plus } from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';
import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAccountContext } from '@/components/providers/AccountContext';
import { getStrategy } from '@/lib/strategies';

type SheetKind = null | 'accounts' | 'positions' | 'signals';

/**
 * Global bottom navigation (Aug 2026 rework, v2 menu model).
 * Accounts is an in-bar menu: opens a sheet listing every account (each row
 * carries its key details) plus Create Account. Positions and Signals do not
 * leave the current page - they open sheets that deep-link into the console.
 */
export function BottomNav() {
    const pathname = usePathname();
    const router = useRouter();
    const { authenticated, ready, logout } = usePrivy();
    const { accounts, activeAccountId, setActiveAccountId, refreshAccounts } = useAccountContext();
    const [mounted, setMounted] = useState(false);
    const [sheet, setSheet] = useState<SheetKind>(null);
    const { t } = useTranslation();

    useEffect(() => { setMounted(true); }, []);
    useEffect(() => { if (mounted && ready && authenticated && accounts.length === 0) refreshAccounts(); }, [mounted, ready, authenticated, accounts.length, refreshAccounts]);

    const active = useMemo(() => accounts.find((a) => a.id === activeAccountId) || accounts[0] || null, [accounts, activeAccountId]);

    useEffect(() => {
        document.body.style.overflow = sheet ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [sheet]);

    const openConsoleTab = (accountId: number, tab: string) => {
        setActiveAccountId(accountId);
        setSheet(null);
        router.push(`/account/${accountId}?tab=${tab}`);
    };

    if (!mounted || !ready || !authenticated) return null;
    if (pathname.startsWith('/review')) return null;
    const publicRoutes = ['/', '/how-it-works', '/results', '/family'];
    if (publicRoutes.includes(pathname) || pathname.startsWith('/c/')) return null;

    const settingsActive = pathname.startsWith('/settings');
    const referActive = pathname.startsWith('/refer');

    return (
        <>
            <nav className="fixed bottom-0 left-0 right-0 z-50 bg-tm-surface/90 backdrop-blur-md border-t border-tm-border pb-safe">
                <div className="flex items-center justify-around px-1 py-2">
                    <button onClick={() => setSheet(sheet === 'accounts' ? null : 'accounts')}
                        className={`relative flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-all ${sheet === 'accounts' || pathname.startsWith('/account') ? 'text-tm-purple' : 'text-tm-muted hover:text-white'}`}>
                        <Wallet className="w-5 h-5 mb-1" />
                        <span className="text-[10px] font-medium">{t('dashboard.nav.accounts', 'Accounts')}</span>
                    </button>

                    <button
                        onClick={() => {
                            if (!active) { setSheet('accounts'); return; }
                            if (pathname.startsWith('/account/')) { router.push(`/account/${active.id}?tab=positions`); return; }
                            setSheet(sheet === 'positions' ? null : 'positions');
                        }}
                        className={`flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-all ${sheet === 'positions' ? 'text-tm-purple' : 'text-tm-muted hover:text-white'}`}>
                        <LayoutList className="w-5 h-5 mb-1" />
                        <span className="text-[10px] font-medium">{t('dashboard.nav.positions', 'Positions')}</span>
                    </button>

                    <button
                        onClick={() => {
                            if (!active) { setSheet('accounts'); return; }
                            if (pathname.startsWith('/account/')) { router.push(`/account/${active.id}?tab=signals`); return; }
                            setSheet(sheet === 'signals' ? null : 'signals');
                        }}
                        className={`flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-all ${sheet === 'signals' ? 'text-tm-purple' : 'text-tm-muted hover:text-white'}`}>
                        <Zap className="w-5 h-5 mb-1" />
                        <span className="text-[10px] font-medium">{t('dashboard.nav.signals', 'Signals')}</span>
                    </button>

                    <button onClick={() => { setSheet(null); router.push('/refer'); }}
                        className={`relative flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-all ${referActive ? 'text-tm-purple' : 'text-tm-muted hover:text-white'}`}>
                        {!referActive && <span className="absolute top-1 right-3 w-2 h-2 bg-tm-purple rounded-full shadow-[0_0_6px_rgba(168,85,247,0.8)] animate-pulse" />}
                        <Gift className="w-5 h-5 mb-1" />
                        <span className="text-[10px] font-medium text-tm-purple/90">{t('dashboard.nav.refer', 'Refer')}</span>
                    </button>

                    <button onClick={() => { setSheet(null); router.push('/settings'); }}
                        className={`flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-all ${settingsActive ? 'text-tm-purple' : 'text-tm-muted hover:text-white'}`}>
                        <Settings className="w-5 h-5 mb-1" />
                        <span className="text-[10px] font-medium">{t('dashboard.nav.settings', 'Settings')}</span>
                    </button>

                    <button onClick={() => logout()}
                        className="flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-colors text-tm-red/80 hover:text-tm-red">
                        <LogOut className="w-5 h-5 mb-1" />
                        <span className="text-[10px] font-medium">{t('dashboard.nav.exit', 'Exit')}</span>
                    </button>
                </div>
            </nav>

            {/* Sheets */}
            {sheet && (
                <div className="fixed inset-0 z-[60]">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSheet(null)} />
                    <div className="absolute bottom-0 left-0 right-0 bg-[#16161a] border-t border-white/15 rounded-t-2xl max-h-[70vh] flex flex-col animate-[slideUp_0.2s_ease-out]">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                            <h3 className="text-sm font-bold text-white">
                                {sheet === 'accounts' ? t('dashboard.nav.accounts', 'Accounts')
                                    : sheet === 'positions' ? t('dashboard.nav.positions', 'Positions')
                                    : t('dashboard.nav.signals', 'Signals')}
                            </h3>
                            <button onClick={() => setSheet(null)} className="p-1.5 text-tm-muted hover:text-white transition">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="overflow-y-auto flex-1">
                            {accounts.length === 0 ? (
                                <div className="p-6 text-center">
                                    <p className="text-xs text-tm-muted mb-4">No accounts yet</p>
                                    <button onClick={() => { setSheet(null); router.push('/accounts'); }}
                                        className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-tm-purple text-white text-xs font-bold w-full">
                                        <Plus className="w-4 h-4" /> Create account
                                    </button>
                                </div>
                            ) : accounts.map((a) => {
                                const c = getStrategy(a.strategy);
                                const isActive = a.id === activeAccountId;
                                return (
                                    <button key={a.id}
                                        onClick={() => {
                                            if (sheet === 'accounts') {
                                                setActiveAccountId(a.id);
                                                setSheet(null);
                                                router.push(`/account/${a.id}`);
                                            } else {
                                                openConsoleTab(a.id, sheet);
                                            }
                                        }}
                                        className={`w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-white/5 transition ${isActive ? 'bg-tm-purple/10' : ''}`}>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-sm text-white truncate">{a.name}</p>
                                            <p className="text-[10px] text-tm-muted capitalize">
                                                {c?.label || a.strategy} · {a.risk_level}{a.membership?.status === 'free_month' ? ' · free month' : ''}
                                            </p>
                                        </div>
                                        {sheet === 'accounts' && isActive && <Check className="w-4 h-4 text-tm-purple shrink-0" />}
                                    </button>
                                );
                            })}
                            {sheet === 'accounts' && accounts.length > 0 && (
                                <button onClick={() => { setSheet(null); router.push('/accounts'); }}
                                    className="w-full flex items-center justify-center gap-2 px-5 py-4 text-xs font-bold text-tm-purple hover:bg-white/5 border-t border-white/10 transition">
                                    <PlusCircle className="w-4 h-4" /> Create account
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
            <style jsx global>{`
                @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
            `}</style>
        </>
    );
}
