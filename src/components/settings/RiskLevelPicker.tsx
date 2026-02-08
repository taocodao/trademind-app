'use client';

import { useState } from 'react';

type RiskLevel = 'safe' | 'smart' | 'bold';

interface RiskLevelPickerProps {
    value: RiskLevel;
    onChange: (level: RiskLevel) => void;
    onPresetApply?: (preset: RiskPreset) => void;
}

export interface RiskPreset {
    // Theta Sprint
    thetaConfidence: number;
    thetaTrailingStop: number;
    thetaDteMin: number;
    thetaDteMax: number;
    thetaDelta: number;
    thetaTradesWeek: number;
    // Diagonal Spread
    diagonalConfidence: number;
    diagonalShortDteMin: number;
    diagonalShortDteMax: number;
    diagonalLongDteMin: number;
    diagonalLongDteMax: number;
}

const PRESETS: Record<RiskLevel, RiskPreset> = {
    safe: {
        // Theta Sprint - Conservative
        thetaConfidence: 85,
        thetaTrailingStop: -30,
        thetaDteMin: 28,
        thetaDteMax: 45,
        thetaDelta: 0.15,
        thetaTradesWeek: 2,
        // Diagonal Spread - Conservative
        diagonalConfidence: 85,
        diagonalShortDteMin: 7,
        diagonalShortDteMax: 14,
        diagonalLongDteMin: 45,
        diagonalLongDteMax: 90,
    },
    smart: {
        // Theta Sprint - Balanced
        thetaConfidence: 75,
        thetaTrailingStop: -45,
        thetaDteMin: 21,
        thetaDteMax: 45,
        thetaDelta: 0.20,
        thetaTradesWeek: 3,
        // Diagonal Spread - Balanced
        diagonalConfidence: 70,
        diagonalShortDteMin: 5,
        diagonalShortDteMax: 14,
        diagonalLongDteMin: 30,
        diagonalLongDteMax: 60,
    },
    bold: {
        // Theta Sprint - Aggressive
        thetaConfidence: 60,
        thetaTrailingStop: -60,
        thetaDteMin: 14,
        thetaDteMax: 45,
        thetaDelta: 0.30,
        thetaTradesWeek: 5,
        // Diagonal Spread - Aggressive
        diagonalConfidence: 60,
        diagonalShortDteMin: 3,
        diagonalShortDteMax: 14,
        diagonalLongDteMin: 21,
        diagonalLongDteMax: 45,
    },
};

const LEVEL_CONFIG = {
    safe: {
        label: '🟢 Safe',
        description: 'Lower risk, fewer trades',
        bgColor: 'bg-green-500/20',
        borderColor: 'border-green-500',
        textColor: 'text-green-400',
    },
    smart: {
        label: '🟡 Smart',
        description: 'Balanced approach',
        bgColor: 'bg-yellow-500/20',
        borderColor: 'border-yellow-500',
        textColor: 'text-yellow-400',
    },
    bold: {
        label: '🔴 Bold',
        description: 'Higher risk, more trades',
        bgColor: 'bg-red-500/20',
        borderColor: 'border-red-500',
        textColor: 'text-red-400',
    },
};

export function RiskLevelPicker({ value, onChange, onPresetApply }: RiskLevelPickerProps) {
    const handleSelect = (level: RiskLevel) => {
        onChange(level);
        if (onPresetApply) {
            onPresetApply(PRESETS[level]);
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">🎚️</span>
                <h3 className="font-semibold">Global Risk Level</h3>
            </div>

            <div className="grid grid-cols-3 gap-2">
                {(Object.keys(LEVEL_CONFIG) as RiskLevel[]).map((level) => {
                    const config = LEVEL_CONFIG[level];
                    const isSelected = value === level;

                    return (
                        <button
                            key={level}
                            onClick={() => handleSelect(level)}
                            className={`
                                p-3 rounded-xl border-2 transition-all duration-200
                                ${isSelected
                                    ? `${config.bgColor} ${config.borderColor}`
                                    : 'border-white/10 hover:border-white/30'
                                }
                            `}
                        >
                            <p className={`font-bold text-sm ${isSelected ? config.textColor : 'text-white'}`}>
                                {config.label}
                            </p>
                            <p className="text-xs text-tm-muted mt-1 hidden sm:block">
                                {config.description}
                            </p>
                        </button>
                    );
                })}
            </div>

            {/* Current Preset Summary */}
            <div className="bg-tm-surface/50 rounded-lg p-3 text-xs text-tm-muted">
                <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                        <p className="font-medium text-white">{PRESETS[value].thetaConfidence}%+</p>
                        <p>Theta Conf</p>
                    </div>
                    <div>
                        <p className="font-medium text-white">{PRESETS[value].thetaTrailingStop}%</p>
                        <p>Trail Stop</p>
                    </div>
                    <div>
                        <p className="font-medium text-white">{PRESETS[value].diagonalConfidence}%+</p>
                        <p>Diag Conf</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export { PRESETS };
export type { RiskLevel };
