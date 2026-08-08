"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { usePrivy } from "@privy-io/react-auth";

export interface Account {
    id: number;
    user_id: string;
    name: string;
    strategy: string;
    risk_level: 'conservative' | 'moderate' | 'aggressive';
    initial_principal: number;
    cash_balance: number;
    created_at: string;
    updated_at: string;
}

interface AccountContextType {
    accounts: Account[];
    activeAccount: Account | null;
    activeAccountId: number | null;
    setActiveAccountId: (id: number) => void;
    loading: boolean;
    refreshAccounts: () => Promise<void>;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

const STORAGE_KEY = "tm_active_account_id";

export function AccountProvider({ children }: { children: ReactNode }) {
    const { ready, authenticated } = usePrivy();
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [activeAccountId, _setActiveAccountId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    const refreshAccounts = useCallback(async () => {
        try {
            const res = await fetch('/api/accounts');
            if (res.ok) {
                const data = await res.json();
                setAccounts(data.accounts || []);
            }
        } catch (e) {
            console.error('[AccountContext] fetch failed', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (ready && authenticated) {
            refreshAccounts();
        } else if (ready && !authenticated) {
            setLoading(false);
        }
    }, [ready, authenticated, refreshAccounts]);

    // Restore persisted selection once accounts load
    useEffect(() => {
        if (accounts.length === 0) return;
        const saved = typeof window !== 'undefined' ? Number(localStorage.getItem(STORAGE_KEY)) : NaN;
        _setActiveAccountId((current: number | null): number | null => {
            if (current && accounts.find((a) => a.id === current)) return current;
            if (!isNaN(saved) && accounts.find((a) => a.id === saved)) return saved;
            return accounts[0].id;
        });
    }, [accounts]);

    const setActiveAccountId = (id: number) => {
        _setActiveAccountId(id);
        if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, String(id));
    };

    const activeAccount = accounts.find((a) => a.id === activeAccountId) || null;

    return (
        <AccountContext.Provider
            value={{ accounts, activeAccount, activeAccountId, setActiveAccountId, loading, refreshAccounts }}
        >
            {children}
        </AccountContext.Provider>
    );
}

export function useAccountContext() {
    const ctx = useContext(AccountContext);
    if (!ctx) throw new Error("useAccountContext must be used within AccountProvider");
    return ctx;
}
