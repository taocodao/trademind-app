'use client';

import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { Loader2, Check } from 'lucide-react';

type RiskLevel = 'conservative' | 'moderate' | 'aggressive';
type Strategy = 'TQQQ_TURBOCORE_PRO' | 'QQQ_LEAPS';

interface StrategyConfig {
    strategy: Strategy;
    label: string;
    description: string;
    defaultPrincipal: number;
}

const STRATEGIES: StrategyConfig[] = [
    {
        strategy: 'TQQQ_TURBOCORE_PRO',
        label: 'TurboCore Pro',
        description: 'Multi-asset momentum rotation (QQQ/QLD/TQQQ/SGOV)',
        defaultPrincipal: 25000,
    },
    {
        strategy: 'QQQ_LEAPS',
        label: 'QQQ LEAPS',
        description: 'Deep-ITM LEAPS calls with PMCC overlay',
        defaultPrincipal: 30000,
    },
];

const RISK_LEVELS: { value: RiskLevel; label: string; description: string }[] = [
    { value: 'conservative', label: 'Conservative', description: 'Lower drawdown, smaller positions, higher conviction entries' },
    { value: 'moderate', label: 'Moderate', description: 'Balanced risk/reward (canonical strategy defaults)' },
    { value: 'aggressive', label: 'Aggressive', description: 'Higher CAGR target, larger positions, more entries' },
];

interface StrategyState {
    riskLevel: RiskLevel;
    principal: string;
    isConfigured: boolean;
    loading: boolean;
    saving: boolean;
    saved: boolean;
}

export function StrategyRiskSettings() {
    const { getAccessToken } = usePrivy();
    const [states, setStates] = useState<Record<Strategy, StrategyState>>({
        TQQQ_TURBOCORE_PRO: { riskLevel: 'moderate', principal: '25000', isConfigured: false, loading: true, saving: false, saved: false },
        QQQ_LEAPS: { riskLevel: 'moderate', principal: '30000', isConfigured: false, loading: true, saving: false, saved: false },
    });

    useEffect(() => {
        const loadSettings = async () => {
            const token = await getAccessToken();
            for (const cfg of STRATEGIES) {
                try {
                    const res = await fetch(`/api/settings/strategy-risk?strategy=${cfg.strategy}`, {
                        headers: token ? { Authorization: `Bearer ${token}` } : {},
                    });
                    if (res.ok) {
                        const data = await res.json();
                        setStates(prev => ({
                            ...prev,
                            [cfg.strategy]: {
                                riskLevel: data.riskLevel || 'moderate',
                                principal: data.initialPrincipal?.toString() || cfg.defaultPrincipal.toString(),
                                isConfigured: data.isConfigured || false,
                                loading: false,
                                saving: false,
                                saved: false,
                            },
                        }));
                    }
                } catch (e) {
                    console.error(`Failed to load ${cfg.strategy} settings:`, e);
                    setStates(prev => ({
                        ...prev,
                        [cfg.strategy]: { ...prev[cfg.strategy], loading: false },
                    }));
                }
            }
        };
        loadSettings();
    }, [getAccessToken]);

    const handleSave = async (strategy: Strategy) => {
        const state = states[strategy];
        setStates(prev => ({ ...prev, [strategy]: { ...state, saving: true, saved: false } }));

        try {
            const token = await getAccessToken();
            const res = await fetch('/api/settings/strategy-risk', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    strategy,
                    riskLevel: state.riskLevel,
                    initialPrincipal: parseFloat(state.principal),
                }),
            });

            if (res.ok) {
                setStates(prev => ({
                    ...prev,
                    [strategy]: { ...prev[strategy], saving: false, saved: true, isConfigured: true },
                }));
                setTimeout(() => {
                    setStates(prev => ({ ...prev, [strategy]: { ...prev[strategy], saved: false } }));
                }, 3000);
            } else {
                throw new Error('Save failed');
            }
        } catch (e) {
            console.error(`Failed to save ${strategy} settings:`, e);
            setStates(prev => ({ ...prev, [strategy]: { ...prev[strategy], saving: false } }));
        }
    };

    return (
        <div className="space-y-6">
            {STRATEGIES.map(cfg => {
                const state = states[cfg.strategy];
                return (
                    <div key={cfg.strategy} className="border border-white/10 rounded-lg p-4 bg-black/20">
                        <div className="flex items-start justify-between mb-3">
                            <div>
                                <h4 className="font-semibold text-white">{cfg.label}</h4>
                                <p className="text-xs text-zinc-400 mt-0.5">{cfg.description}</p>
                            </div>
                            {state.isConfigured && (
                                <span className="text-xs text-green-400 flex items-center gap-1">
                                    <Check className="w-3 h-3" /> Configured
                                </span>
                            )}
                        </div>

                        {state.loading ? (
                            <div className="flex items-center justify-center py-4">
                                <Loader2 className="w-5 h-5 animate-spin text-tm-purple" />
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {/* Risk Level */}
                                <div>
                                    <label className="block text-xs font-medium text-zinc-300 mb-2">Risk Level</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {RISK_LEVELS.map(rl => (
                                            <button
                                                key={rl.value}
                                                onClick={() => setStates(prev => ({
                                                    ...prev,
                                                    [cfg.strategy]: { ...prev[cfg.strategy], riskLevel: rl.value },
                                                }))}
                                                className={`px-3 py-2 rounded-md text-xs font-medium transition-all ${
                                                    state.riskLevel === rl.value
                                                        ? 'bg-tm-purple text-white border border-tm-purple'
                                                        : 'bg-white/5 text-zinc-300 border border-white/10 hover:bg-white/10'
                                                }`}
                                                title={rl.description}
                                            >
                                                {rl.label}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-xs text-zinc-500 mt-1.5">
                                        {RISK_LEVELS.find(r => r.value === state.riskLevel)?.description}
                                    </p>
                                </div>

                                {/* Initial Principal */}
                                <div>
                                    <label className="block text-xs font-medium text-zinc-300 mb-2">
                                        Initial Principal (USD)
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">$</span>
                                        <input
                                            type="number"
                                            value={state.principal}
                                            onChange={e => setStates(prev => ({
                                                ...prev,
                                                [cfg.strategy]: { ...prev[cfg.strategy], principal: e.target.value },
                                            }))}
                                            className="w-full pl-7 pr-3 py-2 bg-white/5 border border-white/10 rounded-md text-sm text-white focus:outline-none focus:border-tm-purple/50 focus:ring-1 focus:ring-tm-purple/50"
                                            placeholder={cfg.defaultPrincipal.toString()}
                                            min="1000"
                                            step="1000"
                                        />
                                    </div>
                                    <p className="text-xs text-zinc-500 mt-1.5">
                                        Starting capital for your virtual account. P&L will be tracked against this amount.
                                    </p>
                                </div>

                                {/* Save Button */}
                                <button
                                    onClick={() => handleSave(cfg.strategy)}
                                    disabled={state.saving || !state.principal || parseFloat(state.principal) <= 0}
                                    className="w-full px-4 py-2 bg-tm-purple hover:bg-tm-purple/90 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-2"
                                >
                                    {state.saving ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : state.saved ? (
                                        <>
                                            <Check className="w-4 h-4" />
                                            Saved
                                        </>
                                    ) : (
                                        'Save Configuration'
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
