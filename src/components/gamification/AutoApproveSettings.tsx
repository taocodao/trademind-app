"use client";

import { useState, useEffect } from "react";
import {
    Bot,
    ToggleLeft,
    ToggleRight,
    Sliders,
    DollarSign,
    CheckCircle,
    XCircle,
    Loader2
} from "lucide-react";

interface AutoApproveSettings {
    enabled: boolean;
    minConfidence: number;
    maxCapital: number;
    strategies: string[];
}

export function AutoApproveSettings() {
    const [settings, setSettings] = useState<AutoApproveSettings>({
        enabled: false,
        minConfidence: 80,
        maxCapital: 500,
        strategies: ['theta']
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const response = await fetch('/api/settings/auto-approve');
            if (response.ok) {
                const data = await response.json();
                setSettings(data);
            }
        } catch (error) {
            console.error('Failed to fetch auto-approve settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const saveSettings = async (newSettings: AutoApproveSettings) => {
        setSaving(true);
        setSaved(false);
        try {
            const response = await fetch('/api/settings/auto-approve', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newSettings)
            });
            if (response.ok) {
                setSaved(true);
                setTimeout(() => setSaved(false), 2000);
            }
        } catch (error) {
            console.error('Failed to save settings:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleToggle = () => {
        const newSettings = { ...settings, enabled: !settings.enabled };
        setSettings(newSettings);
        saveSettings(newSettings);
    };

    const handleConfidenceChange = (value: number) => {
        const newSettings = { ...settings, minConfidence: value };
        setSettings(newSettings);
    };

    const handleCapitalChange = (value: number) => {
        const newSettings = { ...settings, maxCapital: value };
        setSettings(newSettings);
    };

    const handleStrategyToggle = (strategy: string) => {
        const newStrategies = settings.strategies.includes(strategy)
            ? settings.strategies.filter(s => s !== strategy)
            : [...settings.strategies, strategy];
        const newSettings = { ...settings, strategies: newStrategies };
        setSettings(newSettings);
        saveSettings(newSettings);
    };

    const handleBlur = () => {
        saveSettings(settings);
    };

    if (loading) {
        return (
            <div className="glass-card p-6 animate-pulse">
                <div className="h-6 bg-tm-surface rounded w-1/3 mb-4" />
                <div className="h-20 bg-tm-surface rounded" />
            </div>
        );
    }

    return (
        <div className="glass-card p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-tm-purple/20 flex items-center justify-center">
                        <Bot className="w-5 h-5 text-tm-purple" />
                    </div>
                    <div>
                        <h3 className="font-semibold">AI Autopilot</h3>
                        <p className="text-sm text-tm-muted">Let AI execute trades automatically</p>
                    </div>
                </div>

                {/* Toggle */}
                <button
                    onClick={handleToggle}
                    className={`relative w-14 h-8 rounded-full transition-colors ${settings.enabled ? 'bg-tm-green' : 'bg-tm-surface'
                        }`}
                >
                    <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${settings.enabled ? 'left-7' : 'left-1'
                        }`} />
                </button>
            </div>

            {/* Settings (only show when enabled) */}
            {settings.enabled && (
                <div className="space-y-6 pt-4 border-t border-white/10">
                    {/* Minimum Confidence */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm flex items-center gap-2">
                                <Sliders className="w-4 h-4 text-tm-muted" />
                                Minimum Confidence
                            </label>
                            <span className="text-sm font-mono text-tm-purple">
                                {settings.minConfidence}%
                            </span>
                        </div>
                        <input
                            type="range"
                            min="70"
                            max="95"
                            step="5"
                            value={settings.minConfidence}
                            onChange={(e) => handleConfidenceChange(parseInt(e.target.value))}
                            onMouseUp={handleBlur}
                            onTouchEnd={handleBlur}
                            className="w-full h-2 bg-tm-surface rounded-full appearance-none cursor-pointer
                                       [&::-webkit-slider-thumb]:appearance-none
                                       [&::-webkit-slider-thumb]:w-4
                                       [&::-webkit-slider-thumb]:h-4
                                       [&::-webkit-slider-thumb]:rounded-full
                                       [&::-webkit-slider-thumb]:bg-tm-purple
                                       [&::-webkit-slider-thumb]:cursor-pointer"
                        />
                        <div className="flex justify-between text-xs text-tm-muted mt-1">
                            <span>70%</span>
                            <span>95%</span>
                        </div>
                    </div>

                    {/* Max Capital */}
                    <div>
                        <label className="text-sm flex items-center gap-2 mb-2">
                            <DollarSign className="w-4 h-4 text-tm-muted" />
                            Max Capital Per Trade
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-tm-muted">$</span>
                            <input
                                type="number"
                                min="100"
                                max="10000"
                                step="100"
                                value={settings.maxCapital}
                                onChange={(e) => handleCapitalChange(parseInt(e.target.value) || 500)}
                                onBlur={handleBlur}
                                className="w-full bg-tm-surface rounded-xl px-8 py-3 font-mono
                                           focus:outline-none focus:ring-2 focus:ring-tm-purple/50"
                            />
                        </div>
                        <p className="text-xs text-tm-muted mt-1">
                            Trades requiring more capital will need manual approval
                        </p>
                    </div>

                    {/* Strategies */}
                    <div>
                        <label className="text-sm flex items-center gap-2 mb-3">
                            <CheckCircle className="w-4 h-4 text-tm-muted" />
                            Auto-Approve Strategies
                        </label>
                        <div className="flex gap-3">
                            <button
                                onClick={() => handleStrategyToggle('theta')}
                                className={`flex-1 p-3 rounded-xl border transition-all ${settings.strategies.includes('theta')
                                        ? 'bg-tm-purple/20 border-tm-purple/50'
                                        : 'bg-tm-surface border-white/10'
                                    }`}
                            >
                                <p className="font-semibold">Theta Sprint</p>
                                <p className="text-xs text-tm-muted">Cash-secured puts</p>
                            </button>
                            <button
                                onClick={() => handleStrategyToggle('calendar')}
                                className={`flex-1 p-3 rounded-xl border transition-all ${settings.strategies.includes('calendar')
                                        ? 'bg-tm-purple/20 border-tm-purple/50'
                                        : 'bg-tm-surface border-white/10'
                                    }`}
                            >
                                <p className="font-semibold">Calendar Spread</p>
                                <p className="text-xs text-tm-muted">Time decay spreads</p>
                            </button>
                        </div>
                    </div>

                    {/* Warning */}
                    <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                        <p className="text-sm text-yellow-400">
                            ⚠️ When enabled, qualifying signals will be executed automatically without confirmation.
                            Make sure you're comfortable with the risk settings above.
                        </p>
                    </div>
                </div>
            )}

            {/* Save Status */}
            {(saving || saved) && (
                <div className="mt-4 flex items-center justify-center gap-2 text-sm">
                    {saving ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin text-tm-muted" />
                            <span className="text-tm-muted">Saving...</span>
                        </>
                    ) : (
                        <>
                            <CheckCircle className="w-4 h-4 text-tm-green" />
                            <span className="text-tm-green">Settings saved</span>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
