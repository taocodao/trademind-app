'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

interface TastytradeSettings {
    refreshToken: string;
    accounts: any[];
    username?: string;
}

interface AppSettings {
    tastytrade: TastytradeSettings;
    investmentPrincipal: number;
    riskLevel: RiskLevel;
    autoApproval: boolean;
    turboBounceMode: 'MODE_A' | 'MODE_B';
}

interface SettingsContextValue {
    settings: AppSettings;
    updateTastytradeSettings: (settings: Partial<TastytradeSettings>) => void;
    setInvestmentPrincipal: (amount: number) => void;
    setRiskLevel: (level: RiskLevel) => void;
    setAutoApproval: (enabled: boolean) => void;
    setTurboBounceMode: (mode: 'MODE_A' | 'MODE_B') => void;
    clearSettings: () => void;
}

const DEFAULT_SETTINGS: AppSettings = {
    tastytrade: { refreshToken: '', accounts: [] },
    investmentPrincipal: 25000,
    riskLevel: 'MEDIUM',
    autoApproval: false,
    turboBounceMode: 'MODE_B',
};

const SettingsContext = createContext<SettingsContextValue>({
    settings: DEFAULT_SETTINGS,
    updateTastytradeSettings: () => { },
    setInvestmentPrincipal: () => { },
    setRiskLevel: () => { },
    setAutoApproval: () => { },
    setTurboBounceMode: () => { },
    clearSettings: () => { },
});

export function useSettings() {
    return useContext(SettingsContext);
}

export function SettingsProvider({ children }: { children: ReactNode }) {
    const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

    // Load from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem('tm_settings');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
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

    const setInvestmentPrincipal = (amount: number) => {
        persist({ ...settings, investmentPrincipal: amount });
    };

    const setRiskLevel = (level: RiskLevel) => {
        persist({ ...settings, riskLevel: level });
    };

    const setAutoApproval = (enabled: boolean) => {
        persist({ ...settings, autoApproval: enabled });
    };

    const setTurboBounceMode = (mode: 'MODE_A' | 'MODE_B') => {
        persist({ ...settings, turboBounceMode: mode });
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
            clearSettings,
        }}>
            {children}
        </SettingsContext.Provider>
    );
}
