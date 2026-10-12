import { priceKeyForPlan } from '@/lib/membership';

// Live annual price IDs (the charged prices are the 30% subscriber prices: $252 Basic, $336 LEAPS).
const LIVE_PRICE_IDS = {
    qqq_leaps: 'price_1U6Zkv2NdQtWmZJRpVRQBHT3',
    turbocore_pro_bundle: 'price_1U6Zkm2NdQtWmZJRJ6pueESx',
} as const;

export function stripePriceIdForPlan(plan: 'basic' | 'leaps'): string | null {
    const priceKey = priceKeyForPlan(plan);
    const priceId = priceKey === 'qqq_leaps'
        ? process.env.NEXT_PUBLIC_STRIPE_QQQ_LEAPS_ANNUAL_PRICE_ID
        : process.env.NEXT_PUBLIC_STRIPE_TURBOCORE_PRO_BUNDLE_ANNUAL_PRICE_ID;
    return priceId || LIVE_PRICE_IDS[priceKey as keyof typeof LIVE_PRICE_IDS] || null;
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
