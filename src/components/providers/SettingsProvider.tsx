'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface TastytradeSettings {
    refreshToken: string;
    accounts: any[];
    username?: string;
}

interface SettingsContextValue {
    settings: {
        tastytrade: TastytradeSettings;
    };
    updateTastytradeSettings: (settings: Partial<TastytradeSettings>) => void;
    clearSettings: () => void;
}

const SettingsContext = createContext<SettingsContextValue>({
    settings: {
        tastytrade: { refreshToken: '', accounts: [] }
    },
    updateTastytradeSettings: () => { },
    clearSettings: () => { }
});

export function useSettings() {
    return useContext(SettingsContext);
}

export function SettingsProvider({ children }: { children: ReactNode }) {
    const [settings, setSettings] = useState<{ tastytrade: TastytradeSettings }>({
        tastytrade: { refreshToken: '', accounts: [] }
    });

    // Load from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem('tm_settings');
        if (stored) {
            try {
                setSettings(JSON.parse(stored));
            } catch (e) {
                console.error('Failed to parse settings', e);
            }
        }
    }, []);

    const updateTastytradeSettings = (newSettings: Partial<TastytradeSettings>) => {
        setSettings(prev => {
            const updated = {
                ...prev,
                tastytrade: { ...prev.tastytrade, ...newSettings }
            };
            localStorage.setItem('tm_settings', JSON.stringify(updated));
            return updated;
        });
    };

    const clearSettings = () => {
        setSettings({ tastytrade: { refreshToken: '', accounts: [] } });
        localStorage.removeItem('tm_settings');
    };

    return (
        <SettingsContext.Provider value={{ settings, updateTastytradeSettings, clearSettings }}>
            {children}
        </SettingsContext.Provider>
    );
}
