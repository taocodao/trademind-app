"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { StrategyConfig, STRATEGIES, getStrategy } from '@/lib/strategies';
import { useSignalContext } from './SignalProvider';

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

    // Parse signals to figure out which strategies are active for this user
    useEffect(() => {
        if (!hasLoadedPrefs) return;
        
        let activeConfigs: StrategyConfig[] = [];

        // Condition 1: User has explicit subscriptions saved
        if (userStrategies.length > 0) {
            activeConfigs = userStrategies
                .map(key => getStrategy(key))
                .filter((config): config is StrategyConfig => config !== undefined);
        } else {
            // Condition 2: Fallback to active signals from DB
            const activeKeys = new Set<string>();
            allSignals.forEach(signal => {
                if (signal.strategy) {
                    // Check if strategy matches any in our registry
                    const strategyConf = getStrategy(signal.strategy);
                    if (strategyConf) {
                        activeKeys.add(strategyConf.key);
                    }
                }
            });

            activeConfigs = Array.from(activeKeys)
                .map(key => getStrategy(key))
                .filter((config): config is StrategyConfig => config !== undefined);
        }

        // Fallback to default if no signals found and no user strategies
        if (activeConfigs.length > 0) {
            setEnabledStrategies(activeConfigs);
        } else {
            setEnabledStrategies([STRATEGIES[0]]);
        }
    }, [allSignals, userStrategies, hasLoadedPrefs]);

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
