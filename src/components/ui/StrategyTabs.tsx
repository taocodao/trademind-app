import React from 'react';
import { StrategyConfig } from '@/lib/strategies';

interface StrategyTabsProps {
    strategies: StrategyConfig[];
    activeKey: string;
    onChange: (key: string) => void;
    showAll?: boolean;
}

export function StrategyTabs({ strategies, activeKey, onChange, showAll = false }: StrategyTabsProps) {
    if (strategies.length <= 1 && !showAll) return null; // No tabs needed if only one strategy

    return (
        <div className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-hide shrink-0">
            {showAll && (
                <button
                    onClick={() => onChange('ALL')}
                    className={`whitespace-nowrap flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${activeKey === 'ALL'
                            ? 'bg-white/10 border-white/20 text-white font-medium shadow-sm'
                            : 'bg-transparent border-transparent text-tm-muted hover:bg-white/5 hover:text-white/80'
                        }`}
                >
                    <span className="text-sm">All Strategies</span>
                </button>
            )}

            {strategies.map((strategy) => {
                const isActive = activeKey === strategy.key;
                const Icon = strategy.icon;

                return (
                    <button
                        key={strategy.key}
                        onClick={() => onChange(strategy.key)}
                        className={`whitespace-nowrap flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${isActive
                                ? strategy.color + ' font-medium shadow-sm ring-1 ring-inset ring-white/10'
                                : 'bg-transparent border-transparent text-tm-muted hover:bg-white/5 hover:text-white/80'
                            }`}
                    >
                        {Icon && <Icon className={`w-4 h-4 ${isActive ? '' : 'opacity-70'}`} />}
                        <span className="text-sm">{strategy.shortLabel}</span>
                    </button>
                );
            })}
        </div>
    );
}
