/**
 * Referral System
 * ===============
 * Generates unique referral codes, tracks conversion events,
 * and issues credits to both referrer and referred user.
 *
 * Credit amount is env-configurable via REFERRAL_CREDIT_CENTS (default: 10000 = $100).
 * Both sides always receive the same amount (flat — no tiers).
 */

import { query } from '@/lib/db';
import { issueCredits } from '@/lib/credits';
import { PRICING } from '@/lib/pricing-config';

// ── Code Generation ───────────────────────────────────────────────────────────

function generateReferralCode(firstName: string): string {
    const name   = (firstName || 'USER').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6);
    const year   = new Date().getFullYear();
    const suffix = Math.random().toString(36).slice(2, 5).toUpperCase();
    return `TM-${name}${year}-${suffix}`;
}

/** Ensure a user has a referral code — creates one if missing */
export async function ensureReferralCode(userId: string, firstName: string): Promise<string> {
    const existing = await query(
        `SELECT referral_code FROM user_settings WHERE user_id = $1`,
        [userId]
    );
    if (existing.rows[0]?.referral_code) return existing.rows[0].referral_code;

    // Generate unique code — retry on collision (max 5 attempts)
    let code = '';
    for (let i = 0; i < 5; i++) {
        code = generateReferralCode(firstName);
        const collision = await query(
            `SELECT 1 FROM user_settings WHERE referral_code = $1`, [code]
        );
        if (collision.rowCount === 0) break;
    }

    await query(
        `UPDATE user_settings SET referral_code = $1 WHERE user_id = $2`,
        [code, userId]
    );
    return code;
}

/** Look up a referrer by their code */
export async function getReferrerByCode(code: string): Promise<{ userId: string } | null> {
    const result = await query(
        `SELECT user_id FROM user_settings WHERE referral_code = $1`,
        [code]
    );
    return result.rows[0] ? { userId: result.rows[0].user_id } : null;
}

// ── Conversion ────────────────────────────────────────────────────────────────

/**
 * Record a referral conversion and issue credits to both sides.
 *
 * Credit amount = PRICING.credits.referralBothSidesCents
 * (env: REFERRAL_CREDIT_CENTS, default $100 = 10000 cents per side)
 *
 * Flat — no tiers. Amount is configurable at any time via env var.
 * Bonus days at redemption depend on the user's plan price (plan-specific).
 *
 * Called from:
 *   - Stripe webhook on first successful payment
 *   - Whop webhook on membership.went_valid (for trial→paid conversions)
 */
export async function recordReferralConversion(
    referrerId: string,
    referredId: string,
    referralCode: string,
    billingSource: 'stripe' | 'whop',
    convertedPlan: string
): Promise<void> {
    const creditCents = PRICING.credits.referralBothSidesCents;

    // Insert event record — UNIQUE(referred_id) prevents double-crediting
    const inserted = await query(
        `INSERT INTO referral_events
            (referrer_id, referred_id, referral_code, converted_plan, converted_at,
             referrer_credit, referred_credit, billing_source)
         VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7)
         ON CONFLICT (referred_id) DO NOTHING
         RETURNING id`,
        [referrerId, referredId, referralCode, convertedPlan,
         creditCents, creditCents, billingSource]
    );

    if (inserted.rowCount === 0) {
        console.log(`[Referral] Skipped duplicate — ${referredId} already has a referral event`);
        return;
    }

    // Issue credits to both sides
    await issueCredits(referrerId, creditCents, 'referral');
    await issueCredits(referredId, creditCents, 'referral_bonus');

    const dollars = (creditCents / 100).toFixed(0);
    console.log(
        `[Referral] ${referrerId} → ${referredId} (${convertedPlan}): ` +
        `both receive $${dollars} in credits (~plan-specific days at redemption)`
    );
}

// ── Stats ─────────────────────────────────────────────────────────────────────

/** Get referral stats for the account/referrals page */
export async function getReferralStats(userId: string): Promise<{
    code: string;
    shareLink: string;
    totalReferrals: number;
    totalEarnedCents: number;
    recentEvents: any[];
    creditPerReferralCents: number;
}> {
    const codeResult = await query(
        `SELECT referral_code FROM user_settings WHERE user_id = $1`, [userId]
    );
    const code = codeResult.rows[0]?.referral_code ?? '';

    const statsResult = await query(
        `SELECT COUNT(*) AS total, COALESCE(SUM(referrer_credit), 0) AS earned
         FROM referral_events WHERE referrer_id = $1`,
        [userId]
    );

    const recentResult = await query(
        `SELECT converted_plan, converted_at, referrer_credit, billing_source
         FROM referral_events WHERE referrer_id = $1
         ORDER BY converted_at DESC LIMIT 10`,
        [userId]
    );

    return {
        code,
        shareLink: `https://trademind.bot/?ref=${code}`,
        totalReferrals:          parseInt(statsResult.rows[0]?.total   ?? '0', 10),
        totalEarnedCents:        parseInt(statsResult.rows[0]?.earned  ?? '0', 10),
        recentEvents:            recentResult.rows,
        creditPerReferralCents:  PRICING.credits.referralBothSidesCents,
    };
}
