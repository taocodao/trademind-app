"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { StrategyConfig, STRATEGIES, getStrategy, getStrategiesForSubscription } from '@/lib/strategies';
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
    const [activeStrategy, _setActiveStrategy] = useState<string>('TQQQ_TURBOCORE');
    const [enabledStrategies, setEnabledStrategies] = useState<StrategyConfig[]>([STRATEGIES[0]]); // Default to TurboCore
    const [userStrategies, _setUserStrategies] = useState<string[]>([]);
    const [hasLoadedPrefs, setHasLoadedPrefs] = useState(false);
    const { getAccessToken, authenticated } = usePrivy();

    // Parse signals to figure out which strategies are active for this user
    useEffect(() => {
        if (!hasLoadedPrefs) return;
        
        // Always try to sync with subscription tier for bundle holders
        if (authenticated) {
            getAccessToken().then(token => {
                fetch('/api/settings/tier', {
                    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
                })
                    .then(r => r.json())
                    .then(d => {
                        const tierKeys = getStrategiesForSubscription(
                            d.tier === 'turbocore'     ? 'TURBOCORE'     :
                            d.tier === 'turbocore_pro' ? 'TURBOCORE_PRO' :
                            d.tier === 'qqq_leaps'     ? 'QQQ_LEAPS'     :
                            d.tier === 'both_bundle'   ? 'BOTH'          : '' as any
                        );
                        
                        // If user is a bundle holder, ensure ALL THREE strategies are enabled
                        if (d.tier === 'both_bundle') {
                            const current = new Set(userStrategies);
                            let changed = false;
                            tierKeys.forEach(k => {
                                if (!current.has(k)) {
                                    current.add(k);
                                    changed = true;
                                }
                            });
                            if (changed) {
                                console.log('🔄 StrategyContext: Auto-enabling all three strategies for All Access user');
                                setUserStrategies(Array.from(current));
                                return; // setUserStrategies will trigger a re-run of this hook
                            }
                        }
                        
                        // If no explicitly saved strategies, use the tier default
                        if (userStrategies.length === 0 && tierKeys.length > 0) {
                            setUserStrategies(tierKeys);
                        } else {
                            updateEnabledStrategies();
                        }
                    })
                    .catch(e => {
                        console.error('Failed to parse tier for strategy init', e);
                        updateEnabledStrategies();
                    });
            });
        } else {
            updateEnabledStrategies();
        }

        function updateEnabledStrategies() {
            let activeConfigs: StrategyConfig[] = [];

            if (userStrategies.length > 0) {
                activeConfigs = userStrategies
                    .map(key => getStrategy(key))
                    .filter((config): config is StrategyConfig => config !== undefined);
            } else {
                // Fallback to scanning signals
                const activeKeys = new Set<string>();
                allSignals.forEach(signal => {
                    if (signal.strategy) {
                        const strategyConf = getStrategy(signal.strategy);
                        if (strategyConf) activeKeys.add(strategyConf.key);
                    }
                });

                activeConfigs = Array.from(activeKeys)
                    .map(key => getStrategy(key))
                    .filter((config): config is StrategyConfig => config !== undefined);
            }

            if (activeConfigs.length > 0) {
                setEnabledStrategies(activeConfigs);
            } else {
                setEnabledStrategies([STRATEGIES[0]]);
            }
        }
    }, [allSignals, userStrategies, hasLoadedPrefs, authenticated, getAccessToken]);

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
