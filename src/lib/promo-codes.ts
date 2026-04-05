/**
 * Promo Code Utilities
 * Generates and resolves short, memorable referral promo codes (e.g. "ERIC5", "BULL7")
 */

import pool from '@/lib/db';

// ── Code Generation ───────────────────────────────────────────────────────────

const ADJECTIVES = ['ACE', 'ALPHA', 'BULL', 'APEX', 'EDGE', 'FLUX', 'NOVA', 'PEAK', 'VOLT', 'ZINC'];
const CONSONANTS = 'BCDFGHJKLMNPQRSTVWXYZ';

/**
 * Generate a short unique promo code from a user's name or a random word.
 * Priority: first 4 chars of firstName + random digit → fallback to random 5-char code.
 */
export function generatePromoCode(firstName?: string | null): string {
    const base = firstName
        ? firstName.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5).padEnd(3, 'X')
        : ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const suffix = Math.floor(Math.random() * 90 + 10); // 10–99
    return `${base}${suffix}`;
}

/**
 * Persist a promo code to the user's record.
 * Handles collisions by appending a new suffix until unique.
 */
export async function assignPromoCode(userId: string, firstName?: string | null): Promise<string> {
    const MAX_ATTEMPTS = 10;
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
        const code = generatePromoCode(firstName);
        try {
            await pool.query(
                `UPDATE user_settings SET referral_code = $1, updated_at = NOW() WHERE user_id = $2`,
                [code, userId]
            );
            return code;
        } catch (err: any) {
            // unique constraint violation → try again
            if (err.code !== '23505') throw err;
        }
    }
    // Last resort: use random 6-char alphanum
    const fallback = Math.random().toString(36).slice(2, 8).toUpperCase();
    await pool.query(
        `UPDATE user_settings SET referral_code = $1, updated_at = NOW() WHERE user_id = $2`,
        [fallback, userId]
    );
    return fallback;
}

/**
 * Resolve a promo code string to the referrer's user_id.
 * Returns null if code is not found.
 */
export async function resolvePromoCode(code: string): Promise<string | null> {
    if (!code || code.trim().length < 3) return null;
    const normalized = code.trim().toUpperCase();
    const result = await pool.query(
        `SELECT user_id FROM user_settings WHERE UPPER(referral_code) = $1`,
        [normalized]
    );
    return result.rows[0]?.user_id ?? null;
}

// ── Referral Tier Logic ───────────────────────────────────────────────────────

export type ReferralTier = 'bronze' | 'silver' | 'gold' | 'diamond';

export interface TierInfo {
    tier: ReferralTier;
    name: string;
    emoji: string;
    minReferrals: number;
    nextTier: ReferralTier | null;
    nextTierAt: number | null;
    referrerReward: string;
    newUserReward: string;
}

export const TIER_CONFIG: TierInfo[] = [
    {
        tier: 'bronze',
        name: 'Signal Scout',
        emoji: '🥉',
        minReferrals: 1,
        nextTier: 'silver',
        nextTierAt: 3,
        referrerReward: '30 days free',
        newUserReward: '14 days free',
    },
    {
        tier: 'silver',
        name: 'Alpha Trader',
        emoji: '🥈',
        minReferrals: 3,
        nextTier: 'gold',
        nextTierAt: 7,
        referrerReward: '90 days free + $15 credit',
        newUserReward: '30 days free',
    },
    {
        tier: 'gold',
        name: 'Market Maker',
        emoji: '🥇',
        minReferrals: 7,
        nextTier: 'diamond',
        nextTierAt: 15,
        referrerReward: '6 months free + Discord VIP',
        newUserReward: '30 days free + $10',
    },
    {
        tier: 'diamond',
        name: 'TradeMind Pro',
        emoji: '💎',
        minReferrals: 15,
        nextTier: null,
        nextTierAt: null,
        referrerReward: '1 year free + 20% revenue share',
        newUserReward: '30 days free + $15',
    },
];

export function getTierForCount(referralCount: number): TierInfo {
    const tiers = [...TIER_CONFIG].reverse();
    return tiers.find(t => referralCount >= t.minReferrals) ?? {
        tier: 'bronze' as ReferralTier,
        name: 'Signal Scout',
        emoji: '🥉',
        minReferrals: 1,
        nextTier: 'bronze',
        nextTierAt: 1,
        referrerReward: '30 days free',
        newUserReward: '14 days free',
    };
}
