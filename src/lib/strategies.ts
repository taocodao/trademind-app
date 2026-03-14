import { Brain, Zap, Activity } from 'lucide-react';

export interface StrategyConfig {
    key: string;                      // DB strategy key, e.g. 'TQQQ_TURBOCORE'
    label: string;                    // Display name, e.g. 'TurboCore'
    shortLabel: string;               // Compact label for tabs
    description: string;
    icon: typeof Brain;               // Lucide icon component
    color: string;                    // Tailwind accent color class
    managedSymbols: string[];         // Symbols this strategy trades
    signalCardType: 'turbocore' | 'turbobounce' | 'theta' | 'calendar' | 'generic';
}

export const STRATEGIES: StrategyConfig[] = [
    {
        key: 'TQQQ_TURBOCORE',
        label: 'TurboCore',
        shortLabel: 'Core',
        description: 'ML-powered TQQQ allocation strategy',
        icon: Brain,
        color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
        managedSymbols: ['QQQ', 'QLD', 'TQQQ', 'SGOV'],
        signalCardType: 'turbocore',
    },
    {
        key: 'TQQQ_TURBOCORE_PRO',
        label: 'TurboCore Pro',
        shortLabel: 'Pro',
        description: 'Enhanced allocation with advanced ML regime detection',
        icon: Zap,
        color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
        managedSymbols: ['QQQ', 'QLD', 'TQQQ', 'SGOV'],
        signalCardType: 'turbocore',
    },
    // Future strategies can be added here
];

export function getStrategy(key: string): StrategyConfig | undefined {
    return STRATEGIES.find(s => s.key.toUpperCase() === key.toUpperCase());
}

// User Subscription Tiers
export type SubscriptionTier = 'TURBOCORE' | 'TURBOCORE_PRO' | 'BOTH';

export function getStrategiesForSubscription(tier: SubscriptionTier): string[] {
    switch (tier) {
        case 'TURBOCORE':
            return ['TQQQ_TURBOCORE'];
        case 'TURBOCORE_PRO':
            return ['TQQQ_TURBOCORE_PRO'];
        case 'BOTH':
            return ['TQQQ_TURBOCORE', 'TQQQ_TURBOCORE_PRO'];
        default:
            return [];
    }
}
