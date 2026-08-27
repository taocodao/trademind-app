"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    Zap, LayoutList, Activity as ActivityIcon, Settings, Gift,
    ChevronUp, Check, PlusCircle, X,
} from "lucide-react";
import { useAccountContext } from "@/components/providers/AccountContext";
import { getStrategy } from "@/lib/strategies";

export type ConsoleTab = 'signals' | 'positions' | 'activity' | 'account' | 'refer';

const TABS: { key: ConsoleTab; label: string; icon: any }[] = [
    { key: 'signals', label: 'Signals', icon: Zap },
    { key: 'positions', label: 'Positions', icon: LayoutList },
    { key: 'activity', label: 'Activity', icon: ActivityIcon },
    { key: 'account', label: 'Account', icon: Settings },
    { key: 'refer', label: 'Refer', icon: Gift },
];

/**
 * Console navigation: bottom tab bar with a persistent account pill above it.
 * The pill opens a bottom sheet that lists every account. Selecting an account
 * preserves the current tab.
 */
export function ConsoleNav({
    tab,
    onTab,
}: {
    tab: ConsoleTab;
    onTab: (tab: ConsoleTab) => void;
}) {
    const { accounts, activeAccountId, setActiveAccountId } = useAccountContext();
    const [sheetOpen, setSheetOpen] = useState(false);
    const router = useRouter();

    const active = accounts.find((a) => a.id === activeAccountId) || null;
    const cfg = active ? getStrategy(active.strategy) : null;

    useEffect(() => {
        document.body.style.overflow = sheetOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [sheetOpen]);

    const select = (id: number) => {
        setActiveAccountId(id);
        setSheetOpen(false);
        router.push(`/account/${id}?tab=${tab}`);
    };

    return (
        <>
            {/* Account pill, sits just above the tab bar */}
            {active && (
                <div className="fixed left-1/2 -translate-x-1/2 bottom-[72px] z-40">
                    <button
                        onClick={() => setSheetOpen(true)}
                        className="flex items-center gap-2 bg-[#16161a]/95 backdrop-blur border border-white/15 rounded-full pl-4 pr-3 py-2 shadow-xl hover:border-white/30 transition"
                    >
                        <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                        <span className="text-sm font-bold text-white max-w-[140px] truncate">{active.name}</span>
                        {cfg && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${cfg.color}`}>
                                {cfg.shortLabel}
                            </span>
                        )}
                        <ChevronUp className="w-3.5 h-3.5 text-tm-muted" />
                    </button>
                </div>
            )}

            {/* Bottom tab bar */}
            <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0a0a0e]/95 backdrop-blur border-t border-white/10">
                <div className="max-w-lg mx-auto flex">
                    {TABS.map(({ key, label, icon: Icon }) => (
                        <button
                            key={key}
                            onClick={() => onTab(key)}
                            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition ${
                                tab === key ? 'text-tm-purple' : 'text-tm-muted hover:text-white'
                            }`}
                        >
                            <Icon className="w-5 h-5" />
                            <span className="text-[9px] font-bold uppercase tracking-wide">{label}</span>
                        </button>
                    ))}
                </div>
            </nav>

            {/* Account bottom sheet */}
            {sheetOpen && (
                <div className="fixed inset-0 z-50">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSheetOpen(false)} />
                    <div className="absolute bottom-0 left-0 right-0 bg-[#16161a] border-t border-white/15 rounded-t-2xl max-h-[70vh] flex flex-col animate-[slideUp_0.2s_ease-out]">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                            <h3 className="text-sm font-bold text-white">Your accounts</h3>
                            <button onClick={() => setSheetOpen(false)} className="p-1.5 text-tm-muted hover:text-white transition">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="overflow-y-auto flex-1">
                            {accounts.map((a) => {
                                const c = getStrategy(a.strategy);
                                const isActive = a.id === activeAccountId;
                                return (
                                    <button
                                        key={a.id}
                                        onClick={() => select(a.id)}
                                        className={`w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-white/5 transition ${isActive ? 'bg-tm-purple/10' : ''}`}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-sm text-white truncate">{a.name}</p>
                                            <p className="text-[10px] text-tm-muted capitalize">
                                                {c?.label || a.strategy} · {a.risk_level}
                                                {a.membership?.status === 'active' ? ' · active' : a.membership?.status === 'free_month' ? ' · free month' : ''}
                                            </p>
                                        </div>
                                        {isActive && <Check className="w-4 h-4 text-tm-purple shrink-0" />}
                                    </button>
                                );
                            })}
                        </div>
                        <button
                            onClick={() => { setSheetOpen(false); router.push('/accounts'); }}
                            className="flex items-center justify-center gap-2 px-5 py-4 text-xs font-bold text-tm-purple hover:bg-white/5 border-t border-white/10 transition"
                        >
                            <PlusCircle className="w-4 h-4" /> Create account
                        </button>
                    </div>
                </div>
            )}
            <style jsx global>{`
                @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
            `}</style>
        </>
    );
}
