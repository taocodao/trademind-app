'use client';

import { useState, useEffect, useCallback } from 'react';
import { RiskLevelPicker, RiskLevel, RiskPreset, PRESETS } from './RiskLevelPicker';
import { FilterSlider, RangeSlider } from './FilterSlider';
import { Save, Check, ChevronDown, ChevronUp, Zap, Target } from 'lucide-react';

export interface StrategySettingsData {
    globalRiskLevel: RiskLevel;
    // Common Filters
    confidence: number;
    trailingStop: number;
    maxHeat: number;
    // Theta Sprint
    thetaEnabled: boolean;
    thetaCapital: number;
    thetaDteMin: number;
    thetaDteMax: number;
    thetaDelta: number;
    thetaTradesWeek: number;
    // Calendar Spread
    calendarEnabled: boolean;
    calendarCapital: number;
    calendarDteMin: number;
    calendarDteMax: number;
    calendarTradesWeek: number;
}

const DEFAULT_SETTINGS: StrategySettingsData = {
    globalRiskLevel: 'smart',
    confidence: 75,
    trailingStop: -45,
    maxHeat: 15,
    thetaEnabled: true,
    thetaCapital: 15000,
    thetaDteMin: 21,
    thetaDteMax: 45,
    thetaDelta: 0.20,
    thetaTradesWeek: 3,
    calendarEnabled: true,
    calendarCapital: 5000,
    calendarDteMin: 5,
    calendarDteMax: 14,
    calendarTradesWeek: 5,
};

interface StrategySettingsProps {
    buyingPower?: number;
}

export function StrategySettings({ buyingPower = 50000 }: StrategySettingsProps) {
    const [settings, setSettings] = useState<StrategySettingsData>(DEFAULT_SETTINGS);
    const [activeTab, setActiveTab] = useState<'theta' | 'calendar'>('theta');
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [loading, setLoading] = useState(true);

    // Load settings on mount
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const response = await fetch('/api/settings/strategy');
                if (response.ok) {
                    const data = await response.json();
                    if (data.settings) {
                        setSettings(data.settings);
                    }
                }
            } catch (err) {
                console.error('Error loading strategy settings:', err);
            } finally {
                setLoading(false);
            }
        };
        loadSettings();
    }, []);

    // Apply preset when risk level changes
    const handlePresetApply = (preset: RiskPreset) => {
        setSettings(prev => ({
            ...prev,
            confidence: preset.confidence,
            trailingStop: preset.trailingStop,
            maxHeat: preset.maxHeat,
            thetaDteMin: preset.thetaDteMin,
            thetaDteMax: preset.thetaDteMax,
            thetaDelta: preset.thetaDelta,
            thetaTradesWeek: preset.thetaTradesWeek,
            calendarDteMin: preset.calendarDteMin,
            calendarDteMax: preset.calendarDteMax,
            calendarTradesWeek: preset.calendarTradesWeek,
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const response = await fetch('/api/settings/strategy', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings),
            });
            if (response.ok) {
                setSaved(true);
                setTimeout(() => setSaved(false), 2000);
            }
        } catch (err) {
            console.error('Error saving settings:', err);
        } finally {
            setSaving(false);
        }
    };

    const update = <K extends keyof StrategySettingsData>(key: K, value: StrategySettingsData[K]) => {
        setSettings(prev => ({ ...prev, [key]: value }));
        setSaved(false);
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
        <div className="space-y-4">
            {/* Risk Level Picker */}
            <div className="glass-card p-4">
                <RiskLevelPicker
                    value={settings.globalRiskLevel}
                    onChange={(level) => update('globalRiskLevel', level)}
                    onPresetApply={handlePresetApply}
                />
            </div>

            {/* Common Filters */}
            <div className="glass-card p-4">
                <div className="flex items-center gap-2 mb-4">
                    <Zap className="w-4 h-4 text-tm-purple" />
                    <h3 className="font-semibold text-sm">Common Filters</h3>
                </div>
                <div className="space-y-4">
                    <FilterSlider
                        label="Min Confidence"
                        value={settings.confidence}
                        min={50}
                        max={95}
                        unit="%"
                        onChange={(v) => update('confidence', v)}
                        color="purple"
                    />
                    <FilterSlider
                        label="Trailing Stop"
                        value={settings.trailingStop}
                        min={-70}
                        max={-20}
                        unit="%"
                        onChange={(v) => update('trailingStop', v)}
                        color="red"
                    />
                    <FilterSlider
                        label="Max Heat"
                        value={settings.maxHeat}
                        min={5}
                        max={30}
                        unit="%"
                        onChange={(v) => update('maxHeat', v)}
                        color="yellow"
                    />
                </div>
            </div>

            {/* Product Tabs */}
            <div className="flex gap-2">
                <button
                    onClick={() => setActiveTab('theta')}
                    className={`flex-1 py-2.5 px-4 rounded-xl font-medium text-sm transition-all ${activeTab === 'theta'
                            ? 'bg-tm-purple text-white'
                            : 'bg-tm-surface text-tm-muted'
                        }`}
                >
                    💜 Theta Sprint
                </button>
                <button
                    onClick={() => setActiveTab('calendar')}
                    className={`flex-1 py-2.5 px-4 rounded-xl font-medium text-sm transition-all ${activeTab === 'calendar'
                            ? 'bg-tm-green text-white'
                            : 'bg-tm-surface text-tm-muted'
                        }`}
                >
                    💚 Calendar
                </button>
            </div>

            {/* Product Settings */}
            <div className="glass-card p-4">
                {activeTab === 'theta' ? (
                    <div className="space-y-4">
                        {/* Enable Toggle */}
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Enable Theta Sprint</span>
                            <button
                                onClick={() => update('thetaEnabled', !settings.thetaEnabled)}
                                className={`w-12 h-6 rounded-full transition-all ${settings.thetaEnabled ? 'bg-tm-purple' : 'bg-tm-surface'
                                    }`}
                            >
                                <div className={`w-5 h-5 bg-white rounded-full transition-all ${settings.thetaEnabled ? 'ml-6' : 'ml-0.5'
                                    }`} />
                            </button>
                        </div>

                        {/* Capital Allocation */}
                        <div>
                            <label className="text-sm text-tm-muted mb-2 block">Capital Allocation</label>
                            <div className="flex items-center gap-2">
                                <span className="text-tm-muted">$</span>
                                <input
                                    type="number"
                                    value={settings.thetaCapital}
                                    onChange={(e) => update('thetaCapital', Math.min(Number(e.target.value), buyingPower * 0.3))}
                                    className="flex-1 bg-tm-surface rounded-lg px-3 py-2 font-mono text-lg border border-white/10 focus:border-tm-purple focus:outline-none"
                                />
                                <span className="text-xs text-tm-muted">of ${buyingPower.toLocaleString()}</span>
                            </div>
                        </div>

                        {/* DTE Range */}
                        <RangeSlider
                            label="DTE Range"
                            minValue={settings.thetaDteMin}
                            maxValue={settings.thetaDteMax}
                            rangeMin={7}
                            rangeMax={60}
                            unit="d"
                            onMinChange={(v) => update('thetaDteMin', v)}
                            onMaxChange={(v) => update('thetaDteMax', v)}
                        />

                        {/* Advanced Options */}
                        <button
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="flex items-center gap-2 text-sm text-tm-muted"
                        >
                            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            Advanced Options
                        </button>

                        {showAdvanced && (
                            <div className="space-y-4 pt-2">
                                <FilterSlider
                                    label="Delta Target"
                                    value={settings.thetaDelta}
                                    min={0.10}
                                    max={0.35}
                                    step={0.01}
                                    formatValue={(v) => v.toFixed(2)}
                                    onChange={(v) => update('thetaDelta', v)}
                                    color="purple"
                                />
                                <FilterSlider
                                    label="Max Trades/Week"
                                    value={settings.thetaTradesWeek}
                                    min={1}
                                    max={10}
                                    onChange={(v) => update('thetaTradesWeek', v)}
                                    color="purple"
                                />
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Enable Toggle */}
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Enable Calendar Spreads</span>
                            <button
                                onClick={() => update('calendarEnabled', !settings.calendarEnabled)}
                                className={`w-12 h-6 rounded-full transition-all ${settings.calendarEnabled ? 'bg-tm-green' : 'bg-tm-surface'
                                    }`}
                            >
                                <div className={`w-5 h-5 bg-white rounded-full transition-all ${settings.calendarEnabled ? 'ml-6' : 'ml-0.5'
                                    }`} />
                            </button>
                        </div>

                        {/* Capital Allocation */}
                        <div>
                            <label className="text-sm text-tm-muted mb-2 block">Capital Allocation</label>
                            <div className="flex items-center gap-2">
                                <span className="text-tm-muted">$</span>
                                <input
                                    type="number"
                                    value={settings.calendarCapital}
                                    onChange={(e) => update('calendarCapital', Math.min(Number(e.target.value), buyingPower * 0.15))}
                                    className="flex-1 bg-tm-surface rounded-lg px-3 py-2 font-mono text-lg border border-white/10 focus:border-tm-green focus:outline-none"
                                />
                                <span className="text-xs text-tm-muted">of ${buyingPower.toLocaleString()}</span>
                            </div>
                        </div>

                        {/* DTE Range */}
                        <RangeSlider
                            label="DTE Range"
                            minValue={settings.calendarDteMin}
                            maxValue={settings.calendarDteMax}
                            rangeMin={2}
                            rangeMax={21}
                            unit="d"
                            onMinChange={(v) => update('calendarDteMin', v)}
                            onMaxChange={(v) => update('calendarDteMax', v)}
                        />

                        {/* Advanced Options */}
                        <button
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="flex items-center gap-2 text-sm text-tm-muted"
                        >
                            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            Advanced Options
                        </button>

                        {showAdvanced && (
                            <div className="space-y-4 pt-2">
                                <FilterSlider
                                    label="Max Trades/Week"
                                    value={settings.calendarTradesWeek}
                                    min={1}
                                    max={15}
                                    onChange={(v) => update('calendarTradesWeek', v)}
                                    color="green"
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Save Button */}
            <button
                onClick={handleSave}
                disabled={saving || saved}
                className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${saved
                        ? 'bg-tm-green text-white'
                        : 'bg-tm-purple text-white hover:bg-tm-purple/80'
                    }`}
            >
                {saving ? (
                    <>Saving...</>
                ) : saved ? (
                    <><Check className="w-5 h-5" /> Saved!</>
                ) : (
                    <><Save className="w-5 h-5" /> Save Settings</>
                )}
            </button>
        </div>
    );
}
