'use client';

import { useState, useEffect } from 'react';

interface TrailingConfig {
    enabled: boolean;
    profitTarget: number;      // e.g., 0.60 = 60%
    stopLoss: number;          // e.g., -0.45 = -45%
    trailTrigger: number;      // e.g., 0.35 = start trailing at +35%
    trailDistance: number;     // e.g., 0.15 = 15% buffer
}

interface TrailingStopConfigProps {
    positionId: string;
    strategy: string;
    currentPnLPct: number;      // Current P&L as decimal (0.25 = +25%)
    onConfigUpdate?: (config: TrailingConfig) => void;
}

export function TrailingStopConfig({
    positionId,
    strategy,
    currentPnLPct,
    onConfigUpdate
}: TrailingStopConfigProps) {
    // Default config based on strategy type
    const isTheta = strategy?.toLowerCase().includes('theta') ||
        strategy?.toLowerCase().includes('put');

    const [config, setConfig] = useState<TrailingConfig>({
        enabled: false,
        profitTarget: isTheta ? 0.60 : 0.40,
        stopLoss: isTheta ? -0.45 : -0.40,
        trailTrigger: isTheta ? 0.35 : 0.20,
        trailDistance: 0.15
    });

    const [maxPnLSeen, setMaxPnLSeen] = useState(currentPnLPct);
    const [saving, setSaving] = useState(false);

    // Track maximum P&L seen
    useEffect(() => {
        if (currentPnLPct > maxPnLSeen) {
            setMaxPnLSeen(currentPnLPct);
        }
    }, [currentPnLPct, maxPnLSeen]);

    // Calculate current stop level
    const calculateCurrentStop = (): number => {
        if (!config.enabled) return config.stopLoss;

        // If we've hit the trail trigger, calculate trailing stop
        if (maxPnLSeen >= config.trailTrigger) {
            const trailingStop = maxPnLSeen - config.trailDistance;
            return Math.max(trailingStop, config.stopLoss); // Never lower than initial stop
        }

        return config.stopLoss;
    };

    const currentStop = calculateCurrentStop();
    const isTrailing = maxPnLSeen >= config.trailTrigger;

    // Check if stop would be triggered
    const wouldExit = currentPnLPct <= currentStop || currentPnLPct >= config.profitTarget;
    const exitReason = currentPnLPct >= config.profitTarget
        ? 'Profit target reached!'
        : currentPnLPct <= currentStop
            ? 'Stop triggered'
            : '';

    const handleSave = async () => {
        setSaving(true);
        try {
            const response = await fetch(`/api/positions/${positionId}/trailing`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });

            if (response.ok) {
                onConfigUpdate?.(config);
            }
        } catch (error) {
            console.error('Failed to save trailing config:', error);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="border-t border-tm-surface/50 mt-4 pt-4">
            {/* Header with Toggle */}
            <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                    ⚡ Trailing Stop
                    {isTrailing && config.enabled && (
                        <span className="text-xs bg-tm-green/20 text-tm-green px-2 py-0.5 rounded-full">
                            TRAILING
                        </span>
                    )}
                </h4>
                <button
                    onClick={() => setConfig({ ...config, enabled: !config.enabled })}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${config.enabled
                            ? 'bg-tm-green text-black'
                            : 'bg-tm-surface text-tm-muted hover:bg-tm-surface/80'
                        }`}
                >
                    {config.enabled ? 'ON' : 'OFF'}
                </button>
            </div>

            {config.enabled && (
                <div className="space-y-4">
                    {/* Config Sliders */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-tm-muted block mb-1">
                                Profit Target
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="range"
                                    min="20"
                                    max="90"
                                    step="5"
                                    value={config.profitTarget * 100}
                                    onChange={(e) => setConfig({
                                        ...config,
                                        profitTarget: Number(e.target.value) / 100
                                    })}
                                    className="flex-1 accent-tm-green"
                                />
                                <span className="text-sm font-mono w-12 text-right text-tm-green">
                                    +{(config.profitTarget * 100).toFixed(0)}%
                                </span>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs text-tm-muted block mb-1">
                                Initial Stop
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="range"
                                    min="20"
                                    max="60"
                                    step="5"
                                    value={Math.abs(config.stopLoss) * 100}
                                    onChange={(e) => setConfig({
                                        ...config,
                                        stopLoss: -Number(e.target.value) / 100
                                    })}
                                    className="flex-1 accent-tm-red"
                                />
                                <span className="text-sm font-mono w-12 text-right text-tm-red">
                                    {(config.stopLoss * 100).toFixed(0)}%
                                </span>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs text-tm-muted block mb-1">
                                Trail After
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="range"
                                    min="10"
                                    max="50"
                                    step="5"
                                    value={config.trailTrigger * 100}
                                    onChange={(e) => setConfig({
                                        ...config,
                                        trailTrigger: Number(e.target.value) / 100
                                    })}
                                    className="flex-1 accent-tm-purple"
                                />
                                <span className="text-sm font-mono w-12 text-right">
                                    +{(config.trailTrigger * 100).toFixed(0)}%
                                </span>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs text-tm-muted block mb-1">
                                Trail Distance
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="range"
                                    min="5"
                                    max="25"
                                    step="5"
                                    value={config.trailDistance * 100}
                                    onChange={(e) => setConfig({
                                        ...config,
                                        trailDistance: Number(e.target.value) / 100
                                    })}
                                    className="flex-1 accent-tm-purple"
                                />
                                <span className="text-sm font-mono w-12 text-right">
                                    {(config.trailDistance * 100).toFixed(0)}%
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Current Status */}
                    <div className="bg-tm-surface/50 rounded-lg p-3 grid grid-cols-3 gap-2 text-center">
                        <div>
                            <p className="text-xs text-tm-muted">Current P&L</p>
                            <p className={`text-lg font-bold ${currentPnLPct >= 0 ? 'text-tm-green' : 'text-tm-red'
                                }`}>
                                {currentPnLPct >= 0 ? '+' : ''}{(currentPnLPct * 100).toFixed(1)}%
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-tm-muted">Max Seen</p>
                            <p className="text-lg font-bold">
                                +{(maxPnLSeen * 100).toFixed(1)}%
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-tm-muted">Current Stop</p>
                            <p className={`text-lg font-bold ${isTrailing ? 'text-tm-green' : 'text-tm-red'
                                }`}>
                                {currentStop >= 0 ? '+' : ''}{(currentStop * 100).toFixed(1)}%
                            </p>
                        </div>
                    </div>

                    {/* Exit Warning */}
                    {wouldExit && (
                        <div className={`text-sm p-2 rounded-lg text-center font-semibold ${currentPnLPct >= config.profitTarget
                                ? 'bg-tm-green/20 text-tm-green'
                                : 'bg-tm-red/20 text-tm-red'
                            }`}>
                            {exitReason}
                        </div>
                    )}

                    {/* Save Button */}
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full bg-tm-purple hover:bg-tm-purple/80 rounded-lg py-2 text-sm font-semibold transition-all disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : 'Save Trailing Config'}
                    </button>
                </div>
            )}
        </div>
    );
}
