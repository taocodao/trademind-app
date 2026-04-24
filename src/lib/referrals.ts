/**
 * Referral System
 * ===============
 * Generates unique referral codes, tracks events, and issues credits.
 */

import { query } from '@/lib/db';
import { issueCredits } from '@/lib/credits';
import { PRICING } from '@/lib/pricing-config';

/** Generate a unique referral code like TM-ERIC2026 */
function generateReferralCode(firstName: string): string {
    const name = (firstName || 'USER').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6);
    const year = new Date().getFullYear();
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

    // Generate unique code — retry on collision
    let code = '';
    for (let attempts = 0; attempts < 5; attempts++) {
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

/** Look up a user by their referral code */
export async function getReferrerByCode(code: string): Promise<{ userId: string } | null> {
    const result = await query(
        `SELECT user_id FROM user_settings WHERE referral_code = $1`,
        [code]
    );
    return result.rows[0] ? { userId: result.rows[0].user_id } : null;
}

type ConversionType = 'trial' | 'monthly' | 'annual';

/**
 * Record a referral conversion and issue credits to both sides.
 * Called from webhook handlers on successful payment.
 */
export async function recordReferralConversion(
    referrerId: string,
    referredId: string,
    referralCode: string,
    conversionType: ConversionType,
    billingSource: 'stripe' | 'whop',
    convertedPlan: string
): Promise<void> {
    const c = PRICING.credits;

    let referrerCredit = 0;
    let referredCredit = 0;

    switch (conversionType) {
        case 'trial':
            referrerCredit = c.referralTrial;
            referredCredit = c.referralTrial;
            break;
        case 'monthly':
            referrerCredit = c.referralMonthly;
            referredCredit = c.referralMonthly;
            break;
        case 'annual':
            referrerCredit = c.referralAnnualReferrer;
            referredCredit = c.referralAnnualReferred;
            break;
    }

    // Insert event record
    await query(
        `INSERT INTO referral_events
            (referrer_id, referred_id, referral_code, converted_plan, converted_at,
             referrer_credit, referred_credit, billing_source)
         VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7)
         ON CONFLICT DO NOTHING`,
        [referrerId, referredId, referralCode, convertedPlan, referrerCredit, referredCredit, billingSource]
    );

    // Issue credits to both
    const source = conversionType === 'trial' ? 'referral_trial'
        : conversionType === 'annual' ? 'referral_annual'
        : 'referral_monthly';

    await issueCredits(referrerId, referrerCredit, source);
    await issueCredits(referredId, referredCredit, source);

    console.log(`[Referral] ${referrerId} → ${referredId} (${conversionType}): referrer +${referrerCredit}¢, referred +${referredCredit}¢`);
}

/** Get referral stats for the account/referrals page */
export async function getReferralStats(userId: string): Promise<{
    code: string;
    totalReferrals: number;
    totalEarnedCents: number;
    recentEvents: any[];
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
        `SELECT converted_plan, converted_at, referrer_credit
         FROM referral_events WHERE referrer_id = $1
         ORDER BY converted_at DESC LIMIT 10`,
        [userId]
    );

    return {
        code,
        totalReferrals: parseInt(statsResult.rows[0]?.total ?? '0', 10),
        totalEarnedCents: parseInt(statsResult.rows[0]?.earned ?? '0', 10),
        recentEvents: recentResult.rows,
    };
}
