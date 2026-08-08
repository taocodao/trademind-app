import { Zap, Layers } from 'lucide-react';

export interface StrategyConfig {
    key: string;                      // DB strategy key, e.g. 'TQQQ_TURBOCORE_PRO'
    label: string;                    // Display name, e.g. 'TurboCore Pro'
    shortLabel: string;               // Compact label for tabs
    description: string;
    icon: typeof Zap;                 // Lucide icon component
    color: string;                    // Tailwind accent color class
    managedSymbols: string[];         // Symbols this strategy trades
    signalCardType: 'turbocore' | 'qqq_leaps';
}

/**
 * Canonical strategy lineup.
 *
 * TradeMind runs exactly two strategies — see CANONICAL_STRATEGIES.md in
 * taocodao/tastywork-trading. All legacy strategies (TQQQ, TurboBounce,
 * Zebra, Theta, Calendar, Diagonal, DVO, IV-Switching composite) are retired
 * from the product surface.
 */
export const STRATEGIES: StrategyConfig[] = [
    {
        key: 'TQQQ_TURBOCORE_PRO',
        label: 'TurboCore Pro',
        shortLabel: 'Pro',
        description: 'ETF-only regime allocator (QQQ/QLD/TQQQ/SGOV) — v3.3 drawdown-controlled, hourly rebalancing',
        icon: Zap,
        color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
        managedSymbols: ['QQQ', 'QLD', 'TQQQ', 'SGOV'],
        signalCardType: 'turbocore',
    },
    {
        key: 'QQQ_LEAPS',
        label: 'QQQ LEAPS',
        shortLabel: 'LEAPS',
        description: 'Deep-ITM QQQ LEAPS calls after gated pullbacks + PMCC overlay — ENTER / EXIT / HOLD signals',
        icon: Layers,
        color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
        managedSymbols: ['QQQ'],
        signalCardType: 'qqq_leaps',
    },
];

/**
 * Map legacy DB strategy keys onto the canonical lineup so historical
 * signals still render under the right tab/card.
 */
const LEGACY_KEY_MAP: Record<string, string> = {
    'TQQQ_TURBOCORE': 'TQQQ_TURBOCORE_PRO',  // old TQQQ ML allocator → TurboCore Pro tab
};

export function getStrategy(key: string): StrategyConfig | undefined {
    const upper = key.toUpperCase();
    const canonical = LEGACY_KEY_MAP[upper] ?? upper;
    return STRATEGIES.find(s => s.key.toUpperCase() === canonical);
}

// User Subscription Tiers
export type SubscriptionTier = 'TURBOCORE' | 'TURBOCORE_PRO' | 'QQQ_LEAPS' | 'BOTH';

export function getStrategiesForSubscription(tier: SubscriptionTier): string[] {
    switch (tier) {
        case 'TURBOCORE':
            // Legacy tier maps to the canonical ETF allocator
            return ['TQQQ_TURBOCORE_PRO'];
        case 'TURBOCORE_PRO':
            return ['TQQQ_TURBOCORE_PRO'];
        case 'QQQ_LEAPS':
            return ['QQQ_LEAPS'];
        case 'BOTH':
            // All Access bundle gets both canonical strategies
            return ['TQQQ_TURBOCORE_PRO', 'QQQ_LEAPS'];
        default:
            return [];
    }
}
