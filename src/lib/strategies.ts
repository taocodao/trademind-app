import { Brain, Zap, Activity, Layers } from 'lucide-react';

export interface StrategyConfig {
    key: string;                      // DB strategy key, e.g. 'TQQQ_TURBOCORE_PRO'
    label: string;                    // Display name, e.g. 'QQQ Basic'
    shortLabel: string;               // Compact label for tabs
    description: string;
    icon: typeof Brain;               // Lucide icon component
    color: string;                    // Tailwind accent color class
    managedSymbols: string[];         // Symbols this strategy trades
    signalCardType: 'turbocore' | 'turbobounce' | 'theta' | 'calendar' | 'generic' | 'qqq_leaps';
}

export const STRATEGIES: StrategyConfig[] = [
    {
        key: 'TQQQ_TURBOCORE_PRO',
        label: 'QQQ Basic',
        shortLabel: 'Basic',
        description: 'ETF-only regime allocator: rotates QQQ / QLD / TQQQ / SGOV by trend, momentum, regime, and ML confidence, with stress guards for drawdown control',
        icon: Zap,
        color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
        managedSymbols: ['QQQ', 'QLD', 'TQQQ', 'SGOV'],
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
            // Legacy base-TurboCore tier now maps to Turbo Pro (base strategy removed)
            return ['TQQQ_TURBOCORE_PRO'];
        case 'TURBOCORE_PRO':
            // Pro tab shows IV-Switching signals (TQQQ_TURBOCORE_PRO)
            return ['TQQQ_TURBOCORE_PRO'];
        case 'QQQ_LEAPS':
            return ['QQQ_LEAPS'];
        case 'BOTH':
            // All Access bundle gets both remaining strategies
            return ['TQQQ_TURBOCORE_PRO', 'QQQ_LEAPS'];
        default:
            return [];
    }
}
