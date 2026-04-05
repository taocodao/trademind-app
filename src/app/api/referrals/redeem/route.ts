/**
 * POST /api/referrals/redeem
 *
 * Called at signup/post-auth when a user has a referral code stored in localStorage.
 * Resolves the short promo code to the referrer's user_id and links the referral.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/ai';
import pool from '@/lib/db';
import { resolvePromoCode } from '@/lib/promo-codes';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const user = await getUserFromRequest(req);
        const { code, hdyhau, utmSource, utmMedium, utmCampaign, utmContent } = await req.json();

        // Store attribution data regardless of whether referral code is present
        if (hdyhau || utmSource) {
            await pool.query(
                `UPDATE user_settings 
                 SET hdyhau = COALESCE(hdyhau, $2),
                     utm_source = COALESCE(utm_source, $3),
                     utm_medium = COALESCE(utm_medium, $4),
                     utm_campaign = COALESCE(utm_campaign, $5),
                     utm_content = COALESCE(utm_content, $6),
                     updated_at = NOW()
                 WHERE user_id = $1`,
                [user.privyDid, hdyhau || null, utmSource || null, utmMedium || null, utmCampaign || null, utmContent || null]
            );
        }

        if (!code) {
            return NextResponse.json({ success: true, message: 'No referral code provided' });
        }

        // Resolve short promo code → referrer user_id
        const referrerUserId = await resolvePromoCode(code);
        if (!referrerUserId) {
            return NextResponse.json({ success: false, message: 'Invalid referral code' });
        }

        // Prevent self-referral
        if (referrerUserId === user.privyDid) {
            return NextResponse.json({ success: false, message: 'Cannot refer yourself' });
        }

        // Check if this user was already referred by someone (prevent overwrite)
        const existing = await pool.query(
            `SELECT id FROM referrals WHERE referred_user_id = $1`,
            [user.privyDid]
        );
        if (existing.rows.length > 0) {
            return NextResponse.json({ success: true, message: 'Already linked to a referral' });
        }

        // Look up referred user's Stripe customer ID (may be null at this point)
        const userRow = await pool.query(
            `SELECT stripe_customer_id FROM user_settings WHERE user_id = $1`,
            [user.privyDid]
        );
        const referredCustomerId = userRow.rows[0]?.stripe_customer_id || null;

        // Create the referral record
        await pool.query(
            `INSERT INTO referrals (referrer_user_id, referred_user_id, referred_stripe_customer_id)
             VALUES ($1, $2, $3)
             ON CONFLICT DO NOTHING`,
            [referrerUserId, user.privyDid, referredCustomerId]
        );

        // Log the signup event
        const newRef = await pool.query(
            `SELECT id FROM referrals WHERE referred_user_id = $1`,
            [user.privyDid]
        );
        if (newRef.rows.length) {
            await pool.query(
                `INSERT INTO referral_activity (referral_id, event_type, description)
                 VALUES ($1, 'signed_up', $2)`,
                [newRef.rows[0].id, `Friend signed up using code "${code.toUpperCase()}"${hdyhau ? ` via ${hdyhau}` : ''}`]
            );
        }

        return NextResponse.json({ success: true, message: 'Referral linked successfully' });
    } catch (error: any) {
        if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        console.error('Referral redeem error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
