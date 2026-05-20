'use client';

import { STRATEGIES } from '@/lib/strategies';
import { useStrategyContext } from '@/components/providers/StrategyContext';
import { CheckSquare, Square, Lock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';

export function MyStrategies() {
    const { userStrategies, setUserStrategies } = useStrategyContext();
    const { getAccessToken } = usePrivy();
    const [isFullAccess, setIsFullAccess] = useState(false);

    // Check if the user has full access (Whop trial or bundle) — strategies are locked on
    useEffect(() => {
        getAccessToken().then(token => {
            fetch('/api/settings/tier', {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            })
                .then(r => r.json())
                .then(d => {
                    const fullAccessTiers = ['full_access', 'both_bundle', 'turbocore_pro_bundle'];
                    setIsFullAccess(fullAccessTiers.includes(d.tier));
                })
                .catch(() => {});
        });
    }, [getAccessToken]);

    const toggleStrategy = (key: string) => {
        if (isFullAccess) return; // locked for full access users
        if (userStrategies.includes(key)) {
            setUserStrategies(userStrategies.filter(k => k !== key));
        } else {
            setUserStrategies([...userStrategies, key]);
        }
    };

    return (
        <section className="glass-card p-4">
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">My Strategies</h3>
                {isFullAccess && (
                    <span className="text-[10px] font-bold text-tm-purple bg-tm-purple/10 border border-tm-purple/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" /> Full Access — All Included
                    </span>
                )}
            </div>
            <div className="space-y-2">
                {STRATEGIES.map(strategy => {
                    const isActive = isFullAccess || userStrategies.includes(strategy.key);
                    return (
                        <button
                            key={strategy.key}
                            onClick={() => toggleStrategy(strategy.key)}
                            disabled={isFullAccess}
                            className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                                isActive
                                    ? 'bg-tm-purple/10 border-tm-purple/30 text-white'
                                    : 'bg-tm-surface/50 border-white/5 text-tm-muted hover:bg-tm-surface'
                            } ${isFullAccess ? 'cursor-default' : ''}`}
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
                            <div className="shrink-0 text-xs font-semibold px-2 py-1 rounded bg-black/20 flex items-center gap-1">
                                {isFullAccess ? (
                                    <><Lock className="w-3 h-3 text-tm-purple" /> <span className="text-tm-purple">Included</span></>
                                ) : isActive ? 'Active' : 'Enable'}
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

