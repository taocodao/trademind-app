'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { usePrivy } from '@privy-io/react-auth';

type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

interface TastytradeSettings {
    refreshToken: string;
    accounts: any[];
    username?: string;
}

interface ShadowLedger {
    balance: number;
    positions: Record<string, number>;
}

interface AppSettings {
    tastytrade: TastytradeSettings;
    investmentPrincipal: Record<string, number>; // strategy key -> amount
    riskLevel: RiskLevel;
    autoApproval: boolean;
    turboBounceMode: 'MODE_A' | 'MODE_B';
    shadowLedger: Record<string, ShadowLedger>; // strategy key -> shadow ledger
    subscription_tier?: string;
}

interface SettingsContextValue {
    settings: AppSettings;
    updateTastytradeSettings: (settings: Partial<TastytradeSettings>) => void;
    setInvestmentPrincipal: (strategy: string, amount: number) => void;
    setRiskLevel: (level: RiskLevel) => void;
    setAutoApproval: (enabled: boolean) => void;
    setTurboBounceMode: (mode: 'MODE_A' | 'MODE_B') => void;
    updateShadowLedger: (strategy: string, updates: Partial<ShadowLedger>) => void;
    clearSettings: () => void;
}

const DEFAULT_SETTINGS: AppSettings = {
    tastytrade: { refreshToken: '', accounts: [] },
    investmentPrincipal: {},
    riskLevel: 'MEDIUM',
    autoApproval: false,
    turboBounceMode: 'MODE_B',
    shadowLedger: {},
};

const SettingsContext = createContext<SettingsContextValue>({
    settings: DEFAULT_SETTINGS,
    updateTastytradeSettings: (_s: Partial<TastytradeSettings>) => { },
    setInvestmentPrincipal: (_strategy: string, _amount: number) => { },
    setRiskLevel: (_level: RiskLevel) => { },
    setAutoApproval: (_enabled: boolean) => { },
    setTurboBounceMode: (_mode: 'MODE_A' | 'MODE_B') => { },
    updateShadowLedger: (_strategy: string, _updates: Partial<ShadowLedger>) => { },
    clearSettings: () => { },
});

export function useSettings() {
    return useContext(SettingsContext);
}

export function SettingsProvider({ children }: { children: ReactNode }) {
    const { getAccessToken } = usePrivy();
    const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

    // Load from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem('tm_settings');
        if (stored) {
            try {
                let parsed = JSON.parse(stored);
                // Migrate old global scalar values to objects if needed
                if (typeof parsed.investmentPrincipal === 'number') {
                    parsed.investmentPrincipal = { 'default': parsed.investmentPrincipal };
                }
                if (parsed.shadowLedger && typeof parsed.shadowLedger.balance === 'number') {
                    parsed.shadowLedger = { 'default': parsed.shadowLedger };
                }
                setSettings({ ...DEFAULT_SETTINGS, ...parsed });
            } catch (e) {
                console.error('Failed to parse settings', e);
            }
        }
    }, []);

    const persist = (updated: AppSettings) => {
        localStorage.setItem('tm_settings', JSON.stringify(updated));
        setSettings(updated);
    };

    const updateTastytradeSettings = (newSettings: Partial<TastytradeSettings>) => {
        persist({
            ...settings,
            tastytrade: { ...settings.tastytrade, ...newSettings },
        });
    };

    const setInvestmentPrincipal = (strategy: string, amount: number) => {
        persist({ 
            ...settings, 
            investmentPrincipal: {
                ...settings.investmentPrincipal,
                [strategy]: amount
            } 
        });
    };

    const setRiskLevel = (level: RiskLevel) => {
        persist({ ...settings, riskLevel: level });
    };

    // Sync with DB
    useEffect(() => {
        const fetchRemoteSync = async () => {
            const token = await getAccessToken();
            fetch('/api/settings/tier', {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            })
                .then(res => res.json())
                .then(data => {
                    if (data.globalAutoApprove !== undefined) {
                        setSettings(prev => {
                            // Only update if it actually changed to avoid unnecessary renders
                            if (prev.autoApproval === data.globalAutoApprove) return prev;
                            const updated = { ...prev, autoApproval: data.globalAutoApprove };
                            localStorage.setItem('tm_settings', JSON.stringify(updated));
                            return updated;
                        });
                    }
                })
                .catch(() => {});
        };

        fetchRemoteSync();
        window.addEventListener('focus', fetchRemoteSync);
        return () => window.removeEventListener('focus', fetchRemoteSync);
    }, [getAccessToken]);

    const setAutoApproval = async (enabled: boolean) => {
        persist({ ...settings, autoApproval: enabled });
        // Push state to backend
        try {
            const token = await getAccessToken();
            await fetch('/api/settings/notifications', {
                method: 'PATCH',
                headers: { 
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ global_auto_approve: enabled }),
            });
        } catch (err) {
            console.error('Failed to sync auto config', err);
        }
    };

    const setTurboBounceMode = (mode: 'MODE_A' | 'MODE_B') => {
        persist({ ...settings, turboBounceMode: mode });
    };

    const updateShadowLedger = (strategy: string, updates: Partial<ShadowLedger>) => {
        const currentLedger = settings.shadowLedger[strategy] || { balance: 0, positions: {} };
        persist({
            ...settings,
            shadowLedger: { 
                ...settings.shadowLedger, 
                [strategy]: { ...currentLedger, ...updates }
            }
        });
    };

    const clearSettings = () => {
        setSettings(DEFAULT_SETTINGS);
        localStorage.removeItem('tm_settings');
    };

    return (
        <SettingsContext.Provider value={{
            settings,
            updateTastytradeSettings,
            setInvestmentPrincipal,
            setRiskLevel,
            setAutoApproval,
            setTurboBounceMode,
            updateShadowLedger,
            clearSettings,
        }}>
            {children}
        </SettingsContext.Provider>
    );
}
