import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/ai';
import { query } from '@/lib/db';
import { assignPromoCode, getTierForCount, TIER_CONFIG } from '@/lib/promo-codes';

export const dynamic = 'force-dynamic';

const REFERRAL_FEE = parseInt(process.env.REFERRAL_FEE || '100', 10);
const REFERRAL_HALF = REFERRAL_FEE / 2;
const REFERRAL_ANNUAL_BONUS = parseInt(process.env.REFERRAL_ANNUAL_BONUS || '150', 10);

export async function GET(req: NextRequest) {
    try {
        const user = await getUserFromRequest(req);

        // Auto-assign a short promo code if the user doesn't have one yet
        const settingsRes = await query(
            `SELECT referral_code, first_name, stripe_price_id FROM user_settings WHERE user_id = $1`,
            [user.privyDid]
        );
        let referralCode: string = settingsRes.rows[0]?.referral_code;
        if (!referralCode) {
            referralCode = await assignPromoCode(user.privyDid, settingsRes.rows[0]?.first_name);
        }

        // Get referral stats (as referrer)
        const statsResult = await query(
            `SELECT 
                COUNT(*) as total_referred,
                COUNT(CASE WHEN stage1_paid THEN 1 END) as stage1_count,
                COUNT(CASE WHEN stage2_paid THEN 1 END) as stage2_count,
                COUNT(CASE WHEN annual_bonus_paid THEN 1 END) as annual_count,
                COUNT(CASE WHEN signup_bonus_paid THEN 1 END) as signup_bonus_count
             FROM referrals 
             WHERE referrer_user_id = $1`,
            [user.privyDid]
        );

        const stats = statsResult.rows[0];
        const totalReferred = parseInt(stats.total_referred);
        // Earnings: each signup_bonus = HALF, each stage1 = HALF, annual = ANNUAL_HALF
        const totalEarned =
            (parseInt(stats.signup_bonus_count) * REFERRAL_HALF) +
            (parseInt(stats.stage1_count) * REFERRAL_HALF) +
            (parseInt(stats.annual_count) * (REFERRAL_ANNUAL_BONUS / 2));

        // Compute tier
        const currentTierInfo = getTierForCount(totalReferred);

        // Get list of referred users with their progress
        const referralsResult = await query(
            `SELECT r.id, r.referred_user_id, r.stage1_paid, r.stage2_paid, r.annual_bonus_paid,
                    r.signup_bonus_paid, r.created_at, u.first_name, u.last_name, u.email
             FROM referrals r
             LEFT JOIN user_settings u ON u.user_id = r.referred_user_id
             WHERE r.referrer_user_id = $1
             ORDER BY r.created_at DESC`,
            [user.privyDid]
        );

        // Get activity feed (referrer perspective)
        const activityResult = await query(
            `SELECT ra.event_type, ra.credit_amount, ra.description, ra.created_at
             FROM referral_activity ra
             JOIN referrals r ON r.id = ra.referral_id
             WHERE r.referrer_user_id = $1
               AND ra.event_type IN ('stage1_referrer', 'stage2_referrer', 'subscription_extended', 'fraud_flagged', 'subscribed')
             ORDER BY ra.created_at DESC
             LIMIT 20`,
            [user.privyDid]
        );

        // ── Referee status: was this user referred by someone? ─────────────
        // Returns the benefits the current user earned AS a referee (not as referrer).
        const refereeResult = await query(
            `SELECT r.signup_bonus_paid, r.stage1_paid, r.annual_bonus_paid, r.created_at,
                    us_ref.referral_code as referrer_code, us_ref.first_name as referrer_first_name,
                    us_me.stripe_price_id as my_price_id
             FROM referrals r
             JOIN user_settings us_ref ON us_ref.user_id = r.referrer_user_id
             JOIN user_settings us_me  ON us_me.user_id  = r.referred_user_id
             WHERE r.referred_user_id = $1
             LIMIT 1`,
            [user.privyDid]
        );
        const refereeRow = refereeResult.rows[0] ?? null;

        // Referee activity: credits the current user earned AS a referee
        const refereeActivityResult = refereeRow ? await query(
            `SELECT ra.event_type, ra.credit_amount, ra.description, ra.created_at
             FROM referral_activity ra
             JOIN referrals r ON r.id = ra.referral_id
             WHERE r.referred_user_id = $1
               AND ra.event_type IN ('stage2_referee', 'subscription_extended')
             ORDER BY ra.created_at DESC
             LIMIT 10`,
            [user.privyDid]
        ) : { rows: [] };

        return NextResponse.json({
            referralCode,                           // Short code e.g. "ERIC54"
            shareLink: `https://trademind.bot/?ref=${referralCode}`,
            stats: {
                totalReferred,
                signupBonusPaid: parseInt(stats.signup_bonus_count),
                stage1Paid: parseInt(stats.stage1_count),
                stage2Paid: parseInt(stats.stage2_count),
                annualBonuses: parseInt(stats.annual_count),
                totalEarned,
                referralFee: REFERRAL_FEE,
                referralHalf: REFERRAL_HALF,
            },
            tier: {
                current: currentTierInfo,
                all: TIER_CONFIG,
            },
            referrals: referralsResult.rows.map((r: any) => ({
                id: r.id,
                name: r.first_name ? `${r.first_name} ${(r.last_name?.[0] || '')}.` : r.email ? r.email.split('@')[0] : 'Anonymous',
                signupBonusPaid: r.signup_bonus_paid,
                stage1Paid: r.stage1_paid,
                stage2Paid: r.stage2_paid,
                annualBonusPaid: r.annual_bonus_paid,
                joinedAt: r.created_at,
            })),
            activity: activityResult.rows,
            // Referee perspective — what THIS user earned for being referred
            refereeStatus: refereeRow ? {
                referredBy: refereeRow.referrer_code,
                referredByName: refereeRow.referrer_first_name || null,
                signupBonusPaid: refereeRow.signup_bonus_paid,   // got bonus trial days at signup
                paymentBonusPaid: refereeRow.stage1_paid,         // got $50 extension after first charge
                annualBonusPaid: refereeRow.annual_bonus_paid,
                myPriceId: refereeRow.my_price_id,
                referralFee: REFERRAL_FEE,
                referralHalf: REFERRAL_HALF,
                joinedAt: refereeRow.created_at,
                activity: refereeActivityResult.rows,
            } : null,
        });
    } catch (error: any) {
        if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
