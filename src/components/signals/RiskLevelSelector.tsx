'use client';

import { useState, useEffect } from 'react';

interface RiskProfile {
    level: string;
    name: string;
    icon: string;
    description: string;
    highlights: {
        max_positions: number;
        capital_deployed: string;
        cash_reserve: string;
        vix_close_all: string;
        expected_roi: string;
        max_loss: string;
        recovery: string;
    };
}

interface RiskLevelSelectorProps {
    apiBase?: string;
    onLevelChange?: (level: string) => void;
}

export function RiskLevelSelector({
    apiBase = 'http://localhost:8002',
    onLevelChange
}: RiskLevelSelectorProps) {
    const [currentLevel, setCurrentLevel] = useState<string>('MEDIUM');
    const [profiles, setProfiles] = useState<RiskProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchRiskProfiles();
        fetchCurrentLevel();
    }, []);

    async function fetchRiskProfiles() {
        try {
            const res = await fetch(`${apiBase}/api/settings/risk-profiles`);
            const data = await res.json();
            if (data.profiles) {
                setProfiles(data.profiles);
            }
        } catch (err) {
            console.error('Failed to fetch profiles:', err);
        }
    }

    async function fetchCurrentLevel() {
        try {
            const res = await fetch(`${apiBase}/api/settings/risk-level`);
            const data = await res.json();
            if (data.current_level) {
                setCurrentLevel(data.current_level);
            }
        } catch (err) {
            console.error('Failed to fetch current level:', err);
        } finally {
            setLoading(false);
        }
    }

    async function handleSelectLevel(level: string) {
        if (level === currentLevel) return;

        setSaving(true);
        setError(null);

        try {
            const res = await fetch(`${apiBase}/api/settings/risk-level`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ level })
            });

            const data = await res.json();

            if (data.status === 'success') {
                setCurrentLevel(level);
                onLevelChange?.(level);
            } else {
                setError(data.error || 'Failed to update risk level');
            }
        } catch (err) {
            setError('Network error - please try again');
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center p-6">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Risk Level
                </h2>
                <span className="px-3 py-1 text-sm font-medium rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                    Current: {currentLevel}
                </span>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {profiles.map((profile) => (
                    <div
                        key={profile.level}
                        onClick={() => !saving && handleSelectLevel(profile.level)}
                        className={`
                            relative cursor-pointer rounded-xl p-5 transition-all duration-200
                            ${currentLevel === profile.level
                                ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }
                            ${saving ? 'opacity-50 cursor-wait' : ''}
                        `}
                    >
                        {/* Selection indicator */}
                        {currentLevel === profile.level && (
                            <div className="absolute top-3 right-3">
                                <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                            </div>
                        )}

                        {/* Header */}
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-2xl">{profile.icon}</span>
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white">
                                    {profile.name}
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {profile.level}
                                </p>
                            </div>
                        </div>

                        {/* Description */}
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                            {profile.description}
                        </p>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-white dark:bg-gray-800 rounded p-2">
                                <p className="text-gray-500 dark:text-gray-400">Max Positions</p>
                                <p className="font-semibold text-gray-900 dark:text-white">
                                    {profile.highlights.max_positions}
                                </p>
                            </div>
                            <div className="bg-white dark:bg-gray-800 rounded p-2">
                                <p className="text-gray-500 dark:text-gray-400">Capital</p>
                                <p className="font-semibold text-gray-900 dark:text-white">
                                    {profile.highlights.capital_deployed}
                                </p>
                            </div>
                            <div className="bg-white dark:bg-gray-800 rounded p-2">
                                <p className="text-gray-500 dark:text-gray-400">Expected ROI</p>
                                <p className="font-semibold text-green-600 dark:text-green-400">
                                    {profile.highlights.expected_roi}
                                </p>
                            </div>
                            <div className="bg-white dark:bg-gray-800 rounded p-2">
                                <p className="text-gray-500 dark:text-gray-400">Max Loss</p>
                                <p className="font-semibold text-red-600 dark:text-red-400">
                                    {profile.highlights.max_loss}
                                </p>
                            </div>
                        </div>

                        {/* VIX threshold */}
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                VIX Close All: <span className="font-medium">{profile.highlights.vix_close_all}</span>
                                {' · '}
                                Recovery: <span className="font-medium">{profile.highlights.recovery} mo</span>
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Info text */}
            <p className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
                Changes take effect on the next scheduler run. Uses 3-day trailing defensive exits.
            </p>
        </div>
    );
}
