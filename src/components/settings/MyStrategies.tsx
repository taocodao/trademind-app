'use client';

import { STRATEGIES } from '@/lib/strategies';
import { useStrategyContext } from '@/components/providers/StrategyContext';
import { CheckSquare, Square, Lock } from 'lucide-react';

export function MyStrategies() {
    const { userStrategies, setUserStrategies } = useStrategyContext();

    const toggleStrategy = (key: string) => {
        if (userStrategies.includes(key)) {
            setUserStrategies(userStrategies.filter(k => k !== key));
        } else {
            setUserStrategies([...userStrategies, key]);
        }
    };

    return (
        <section className="glass-card p-4">
            <h3 className="font-semibold text-sm mb-3">My Strategies</h3>
            <div className="space-y-2">
                {STRATEGIES.map(strategy => {
                    const isActive = userStrategies.includes(strategy.key);
                    return (
                        <button
                            key={strategy.key}
                            onClick={() => toggleStrategy(strategy.key)}
                            className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                                isActive 
                                    ? 'bg-tm-purple/10 border-tm-purple/30 text-white' 
                                    : 'bg-tm-surface/50 border-white/5 text-tm-muted hover:bg-tm-surface'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                {isActive ? (
                                    <CheckSquare className="w-5 h-5 text-tm-purple shrink-0" />
                                ) : (
                                    <Square className="w-5 h-5 shrink-0" />
                                )}
                                <div className="text-left">
                                    <p className="font-semibold text-sm">{strategy.label}</p>
                                    <p className="text-xs opacity-80">{strategy.description}</p>
                                </div>
                            </div>
                            <div className="shrink-0 text-xs font-semibold px-2 py-1 rounded bg-black/20">
                                {isActive ? 'Active' : 'Enable'}
                            </div>
                        </button>
                    );
                })}

                {/* Coming Soon Strategy Placeholders */}
                <button
                    disabled
                    className="w-full flex items-center justify-between p-3 rounded-xl border border-white/5 bg-tm-surface/30 text-tm-muted opacity-60 cursor-not-allowed"
                >
                    <div className="flex items-center gap-3">
                        <Lock className="w-5 h-5 shrink-0" />
                        <div className="text-left">
                            <p className="font-semibold text-sm">TurboBounce</p>
                            <p className="text-xs">Mean-reversion multi-ticker strategy</p>
                        </div>
                    </div>
                    <div className="shrink-0 text-xs font-semibold px-2 py-1 rounded bg-black/20">
                        Coming Soon
                    </div>
                </button>
            </div>
        </section>
    );
}
