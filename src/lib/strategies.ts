import { Brain, Zap, Activity, Layers } from 'lucide-react';

export interface StrategyConfig {
    key: string;                      // DB strategy key, e.g. 'TQQQ_TURBOCORE'
    label: string;                    // Display name, e.g. 'TurboCore'
    shortLabel: string;               // Compact label for tabs
    description: string;
    icon: typeof Brain;               // Lucide icon component
    color: string;                    // Tailwind accent color class
    managedSymbols: string[];         // Symbols this strategy trades
    signalCardType: 'turbocore' | 'turbobounce' | 'theta' | 'calendar' | 'generic' | 'qqq_leaps';
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
        label: 'Turbo Pro',
        shortLabel: 'Pro',
        description: 'IV-Switching composite: CSP, ZEBRA, Bear Call Spreads, Crash Hedge',
        icon: Zap,
        color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
        managedSymbols: ['QQQ', 'QQQM', 'TQQQ', 'SQQQ'],
        signalCardType: 'turbocore',  // routes internally to IVSwitchingSignalCard
    },
    {
        key: 'QQQ_LEAPS',
        label: 'QQQ LEAPS',
        shortLabel: 'LEAPS',
        description: 'ML-powered QQQ LEAPS call strategy — ENTER / EXIT / HOLD signals',
        icon: Layers,
        color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
        managedSymbols: ['QQQ'],
        signalCardType: 'qqq_leaps',
    },
];


export function getStrategy(key: string): StrategyConfig | undefined {
    return STRATEGIES.find(s => s.key.toUpperCase() === key.toUpperCase());
}

// User Subscription Tiers
export type SubscriptionTier = 'TURBOCORE' | 'TURBOCORE_PRO' | 'QQQ_LEAPS' | 'BOTH';

export function getStrategiesForSubscription(tier: SubscriptionTier): string[] {
    switch (tier) {
        case 'TURBOCORE':
            return ['TQQQ_TURBOCORE'];
        case 'TURBOCORE_PRO':
            // Pro tab shows IV-Switching signals (TQQQ_TURBOCORE_PRO)
            return ['TQQQ_TURBOCORE_PRO'];
        case 'QQQ_LEAPS':
            return ['QQQ_LEAPS'];
        case 'BOTH':
            // All Access bundle gets all three strategies
            return ['TQQQ_TURBOCORE', 'TQQQ_TURBOCORE_PRO', 'QQQ_LEAPS'];
        default:
            return [];
    }
}
