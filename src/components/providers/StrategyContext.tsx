"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { StrategyConfig, STRATEGIES, getStrategy } from '@/lib/strategies';
import { useSignalContext } from './SignalProvider';
import { usePrivy } from '@privy-io/react-auth';

interface StrategyContextType {
    activeStrategy: string;
    setActiveStrategy: (key: string) => void;
    enabledStrategies: StrategyConfig[];
    userStrategies: string[];
    setUserStrategies: (keys: string[]) => void;
}

const StrategyContext = createContext<StrategyContextType | undefined>(undefined);

export function StrategyProvider({ children }: { children: ReactNode }) {
    const { allSignals } = useSignalContext();
    const [activeStrategy, _setActiveStrategy] = useState<string>('TQQQ_TURBOCORE_PRO');
    const [enabledStrategies, setEnabledStrategies] = useState<StrategyConfig[]>([STRATEGIES[0]]); // Default to Turbo Pro
    const [userStrategies, _setUserStrategies] = useState<string[]>([]);
    const [hasLoadedPrefs, setHasLoadedPrefs] = useState(false);
    const [entitledStrategyKeys, setEntitledStrategyKeys] = useState<string[] | null>(null);
    const [accountRevision, setAccountRevision] = useState(0);
    const { getAccessToken, authenticated } = usePrivy();

    useEffect(() => {
        const handleAccountsChanged = () => setAccountRevision(revision => revision + 1);
        window.addEventListener('tm-accounts-changed', handleAccountsChanged);
        return () => window.removeEventListener('tm-accounts-changed', handleAccountsChanged);
    }, []);

    // Account memberships are the entitlement source of truth. Keep saved
    // preferences only for people who are logged out or have no accounts yet.
    useEffect(() => {
        if (!authenticated) {
            setEntitledStrategyKeys(null);
            return;
        }

        let cancelled = false;
        async function loadEntitlements() {
            try {
                const token = await getAccessToken();
                const response = await fetch('/api/accounts', {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                });
                if (!response.ok) throw new Error(`Accounts request failed: ${response.status}`);
                const data = await response.json();
                const accounts = Array.isArray(data.accounts) ? data.accounts : [];
                const entitled = accounts.filter((account: {
                    strategy?: string;
                    membership?: { status?: string } | null;
                }) => ['active', 'past_due', 'free_month'].includes(account.membership?.status || ''));

                if (!cancelled) {
                    // A zero-account login keeps its local saved preferences.
                    setEntitledStrategyKeys(accounts.length === 0
                        ? null
                        : Array.from(new Set(entitled.map((account: { strategy?: string }) => account.strategy).filter(Boolean))));
                }
            } catch (error) {
                console.error('Failed to load account strategy entitlements', error);
                if (!cancelled) setEntitledStrategyKeys(null);
            }
        }

        loadEntitlements();
        return () => { cancelled = true; };
    }, [accountRevision, authenticated, getAccessToken]);

    // Resolve strategy configurations after account entitlement and preference
    // data have loaded. Account owners receive exactly their entitled strategies.
    useEffect(() => {
        if (!hasLoadedPrefs) return;

        if (authenticated && entitledStrategyKeys !== null) {
            setEnabledStrategies(
                entitledStrategyKeys
                    .map(key => getStrategy(key))
                    .filter((config): config is StrategyConfig => config !== undefined)
            );
            return;
        }

        if (userStrategies.length > 0) {
            const savedConfigs = userStrategies
                .map(key => getStrategy(key))
                .filter((config): config is StrategyConfig => config !== undefined);
            setEnabledStrategies(savedConfigs.length > 0 ? savedConfigs : [STRATEGIES[0]]);
            return;
        }

        const signalKeys = new Set<string>();
        allSignals.forEach(signal => {
            if (signal.strategy && getStrategy(signal.strategy)) signalKeys.add(signal.strategy);
        });
        const signalConfigs = Array.from(signalKeys)
            .map(key => getStrategy(key))
            .filter((config): config is StrategyConfig => config !== undefined);
        setEnabledStrategies(signalConfigs.length > 0 ? signalConfigs : [STRATEGIES[0]]);
    }, [allSignals, authenticated, entitledStrategyKeys, hasLoadedPrefs, userStrategies]);

    // Ensure state synchronization
    const setActiveStrategy = (key: string) => {
        _setActiveStrategy(key);
        // Assuming user settings could potentially be persisted in localStorage:
        try {
            localStorage.setItem('trademind_active_strategy', key);
        } catch (e) {
            console.error('Failed to save active strategy', e);
        }
    };

    // Load active strategy from localStorage
    useEffect(() => {
        try {
            const saved = localStorage.getItem('trademind_active_strategy');
            if (saved && getStrategy(saved)) {
                _setActiveStrategy(saved);
            }
            
            const savedUserStrats = localStorage.getItem('trademind_user_strategies');
            if (savedUserStrats) {
                _setUserStrategies(JSON.parse(savedUserStrats));
            }
        } catch (e) {
            console.error('Failed to load active strategy or user strategies', e);
        } finally {
            setHasLoadedPrefs(true);
        }
    }, []);

    const setUserStrategies = (keys: string[]) => {
        _setUserStrategies(keys);
        try {
            localStorage.setItem('trademind_user_strategies', JSON.stringify(keys));
        } catch (e) {}
    };

    // Ensure active strategy is always valid
    useEffect(() => {
        if (enabledStrategies.length > 0 && !enabledStrategies.find(s => s.key === activeStrategy)) {
            _setActiveStrategy(enabledStrategies[0].key);
        }
    }, [enabledStrategies, activeStrategy]);


    return (
        <StrategyContext.Provider value={{
            activeStrategy,
            setActiveStrategy,
            enabledStrategies,
            userStrategies,
            setUserStrategies
        }}>
            {children}
        </StrategyContext.Provider>
    );
}

export function useStrategyContext() {
    const context = useContext(StrategyContext);
    if (context === undefined) {
        throw new Error('useStrategyContext must be used within a StrategyProvider');
    }
    return context;
}
