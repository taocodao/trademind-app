"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Check, PlusCircle } from "lucide-react";
import { useAccountContext } from "@/components/providers/AccountContext";
import { getStrategy } from "@/lib/strategies";

/**
 * Dropdown account switcher. Shows the current account; tapping opens a list of
 * all the user's accounts. Selecting one updates the shared active account
 * (AccountContext + persisted), so the bottom-nav Positions/Activity follow.
 * Optionally navigates to the selected account's page (used on /account/[id]).
 */
export function AccountSwitcher({ navigateOnSelect = false, tab }: { navigateOnSelect?: boolean; tab?: 'positions' | 'signals' | 'activity' }) {
    const { accounts, activeAccountId, setActiveAccountId } = useAccountContext();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const router = useRouter();

    const active = accounts.find((a) => a.id === activeAccountId) || null;

    // Close on outside click
    useEffect(() => {
        function onClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        }
        if (open) document.addEventListener('mousedown', onClick);
        return () => document.removeEventListener('mousedown', onClick);
    }, [open]);

    const select = (id: number) => {
        setActiveAccountId(id);
        setOpen(false);
        if (navigateOnSelect) {
            router.push(`/account/${id}${tab && tab !== 'positions' ? `?tab=${tab}` : ''}`);
        }
    };

    if (accounts.length === 0) {
        return (
            <button
                onClick={() => router.push('/accounts')}
                className="flex items-center gap-1.5 text-xs font-bold text-tm-purple hover:text-white transition"
            >
                <PlusCircle className="w-4 h-4" /> Create Account
            </button>
        );
    }

    const cfg = active ? getStrategy(active.strategy) : null;

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen((o) => !o)}
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-3 py-1.5 transition"
            >
                <span className="text-sm font-bold max-w-[120px] truncate">{active?.name || 'Select account'}</span>
                {cfg && (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${cfg.color}`}>
                        {cfg.shortLabel}
                    </span>
                )}
                <ChevronDown className={`w-4 h-4 text-tm-muted transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="absolute right-0 mt-2 w-64 bg-[#16161a] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                    <div className="max-h-72 overflow-y-auto">
                        {accounts.map((a) => {
                            const c = getStrategy(a.strategy);
                            const isActive = a.id === activeAccountId;
                            return (
                                <button
                                    key={a.id}
                                    onClick={() => select(a.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition ${isActive ? 'bg-tm-purple/10' : ''}`}
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-sm truncate">{a.name}</p>
                                        <p className="text-[10px] text-tm-muted capitalize">
                                            {c?.label || a.strategy} · {a.risk_level}
                                        </p>
                                    </div>
                                    {isActive && <Check className="w-4 h-4 text-tm-purple shrink-0" />}
                                </button>
                            );
                        })}
                    </div>
                    <button
                        onClick={() => { setOpen(false); router.push('/accounts?list=1'); }}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 text-xs font-bold text-tm-purple hover:bg-white/5 border-t border-white/10 transition"
                    >
                        <PlusCircle className="w-4 h-4" /> Manage Accounts
                    </button>
                </div>
            )}
        </div>
    );
}
