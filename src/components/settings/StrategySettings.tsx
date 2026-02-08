'use client';

import { useState, useEffect, useCallback } from 'react';
import { RiskLevelPicker, RiskLevel, RiskPreset, PRESETS } from './RiskLevelPicker';
import { FilterSlider, RangeSlider } from './FilterSlider';
import { Save, Check, ChevronDown, ChevronUp, Target } from 'lucide-react';

export interface StrategySettingsData {
    globalRiskLevel: RiskLevel;

    // Theta Sprint Filters
    thetaEnabled: boolean;
    thetaCapital: number;
    thetaConfidence: number;
    thetaTrailingStop: number;
    thetaDteMin: number;
    thetaDteMax: number;
    thetaDelta: number;
    thetaTradesWeek: number;

    // Diagonal Spread Filters
    diagonalEnabled: boolean;
    diagonalCapital: number;
    diagonalConfidence: number;
    diagonalShortDteMin: number;
    diagonalShortDteMax: number;
    diagonalLongDteMin: number;
    diagonalLongDteMax: number;
}

const DEFAULT_SETTINGS: StrategySettingsData = {
    globalRiskLevel: 'smart',

    // Theta Sprint
    thetaEnabled: true,
    thetaCapital: 15000,
    thetaConfidence: 75,
    thetaTrailingStop: -45,
    thetaDteMin: 21,
    thetaDteMax: 45,
    thetaDelta: 0.20,
    thetaTradesWeek: 3,

    // Diagonal Spread
    diagonalEnabled: true,
    diagonalCapital: 5000,
    diagonalConfidence: 70,
    diagonalShortDteMin: 7,
    diagonalShortDteMax: 21,
    diagonalLongDteMin: 45,
    diagonalLongDteMax: 90,
};

interface StrategySettingsProps {
    buyingPower?: number;
}

export function StrategySettings({ buyingPower = 50000 }: StrategySettingsProps) {
    const [settings, setSettings] = useState<StrategySettingsData>(DEFAULT_SETTINGS);
    const [activeTab, setActiveTab] = useState<'theta' | 'diagonal'>('theta');
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
                        // Merge with defaults to handle new fields
                        setSettings(prev => ({ ...DEFAULT_SETTINGS, ...data.settings }));
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
            // Theta Sprint
            thetaConfidence: preset.thetaConfidence,
            thetaTrailingStop: preset.thetaTrailingStop,
            thetaDteMin: preset.thetaDteMin,
            thetaDteMax: preset.thetaDteMax,
            thetaDelta: preset.thetaDelta,
            thetaTradesWeek: preset.thetaTradesWeek,
            // Diagonal Spread
            diagonalConfidence: preset.diagonalConfidence,
            diagonalShortDteMin: preset.diagonalShortDteMin,
            diagonalShortDteMax: preset.diagonalShortDteMax,
            diagonalLongDteMin: preset.diagonalLongDteMin,
            diagonalLongDteMax: preset.diagonalLongDteMax,
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
                    onClick={() => setActiveTab('diagonal')}
                    className={`flex-1 py-2.5 px-4 rounded-xl font-medium text-sm transition-all ${activeTab === 'diagonal'
                        ? 'bg-tm-green text-white'
                        : 'bg-tm-surface text-tm-muted'
                        }`}
                >
                    💚 Diagonal Spread
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

                        {/* Min Confidence */}
                        <FilterSlider
                            label="Min Confidence"
                            value={settings.thetaConfidence}
                            min={50}
                            max={95}
                            unit="%"
                            onChange={(v) => update('thetaConfidence', v)}
                            color="purple"
                        />

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

                        {/* Trailing Stop */}
                        <FilterSlider
                            label="Trailing Stop"
                            value={settings.thetaTrailingStop}
                            min={-70}
                            max={-20}
                            unit="%"
                            onChange={(v) => update('thetaTrailingStop', v)}
                            color="red"
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
                            <span className="text-sm font-medium">Enable Diagonal Spreads</span>
                            <button
                                onClick={() => update('diagonalEnabled', !settings.diagonalEnabled)}
                                className={`w-12 h-6 rounded-full transition-all ${settings.diagonalEnabled ? 'bg-tm-green' : 'bg-tm-surface'
                                    }`}
                            >
                                <div className={`w-5 h-5 bg-white rounded-full transition-all ${settings.diagonalEnabled ? 'ml-6' : 'ml-0.5'
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
                                    value={settings.diagonalCapital}
                                    onChange={(e) => update('diagonalCapital', Math.min(Number(e.target.value), buyingPower * 0.15))}
                                    className="flex-1 bg-tm-surface rounded-lg px-3 py-2 font-mono text-lg border border-white/10 focus:border-tm-green focus:outline-none"
                                />
                                <span className="text-xs text-tm-muted">of ${buyingPower.toLocaleString()}</span>
                            </div>
                        </div>

                        {/* Min Confidence */}
                        <FilterSlider
                            label="Min Confidence"
                            value={settings.diagonalConfidence}
                            min={50}
                            max={95}
                            unit="%"
                            onChange={(v) => update('diagonalConfidence', v)}
                            color="green"
                        />

                        {/* Short Leg DTE Range */}
                        <RangeSlider
                            label="Short Leg DTE"
                            minValue={settings.diagonalShortDteMin}
                            maxValue={settings.diagonalShortDteMax}
                            rangeMin={2}
                            rangeMax={30}
                            unit="d"
                            onMinChange={(v) => update('diagonalShortDteMin', v)}
                            onMaxChange={(v) => update('diagonalShortDteMax', v)}
                        />

                        {/* Long Leg DTE Range */}
                        <RangeSlider
                            label="Long Leg DTE"
                            minValue={settings.diagonalLongDteMin}
                            maxValue={settings.diagonalLongDteMax}
                            rangeMin={30}
                            rangeMax={120}
                            unit="d"
                            onMinChange={(v) => update('diagonalLongDteMin', v)}
                            onMaxChange={(v) => update('diagonalLongDteMax', v)}
                        />
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
