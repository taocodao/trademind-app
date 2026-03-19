import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/ai';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const user = await getUserFromRequest(req);

        // Get referral stats
        const statsResult = await query(
            `SELECT 
                COUNT(*) as total_referred,
                COUNT(CASE WHEN stage1_paid THEN 1 END) as stage1_count,
                COUNT(CASE WHEN stage2_paid THEN 1 END) as stage2_count,
                COUNT(CASE WHEN annual_bonus_paid THEN 1 END) as annual_count
             FROM referrals 
             WHERE referrer_user_id = $1`,
            [user.privyDid]
        );

        const stats = statsResult.rows[0];
        const totalEarned = (parseInt(stats.stage1_count) * 50) +
                           (parseInt(stats.stage2_count) * 50) +
                           (parseInt(stats.annual_count) * 150);

        // Get list of referred users with their progress
        const referralsResult = await query(
            `SELECT r.id, r.referred_user_id, r.stage1_paid, r.stage2_paid, r.annual_bonus_paid, r.created_at,
                    u.first_name, u.last_name
             FROM referrals r
             LEFT JOIN user_settings u ON u.user_id = r.referred_user_id
             WHERE r.referrer_user_id = $1
             ORDER BY r.created_at DESC`,
            [user.privyDid]
        );

        // Get activity feed
        const activityResult = await query(
            `SELECT ra.event_type, ra.credit_amount, ra.description, ra.created_at
             FROM referral_activity ra
             JOIN referrals r ON r.id = ra.referral_id
             WHERE r.referrer_user_id = $1
             ORDER BY ra.created_at DESC
             LIMIT 20`,
            [user.privyDid]
        );

        return NextResponse.json({
            referralCode: user.privyDid,  // The referral code IS the user's privy DID
            stats: {
                totalReferred: parseInt(stats.total_referred),
                stage1Paid: parseInt(stats.stage1_count),
                stage2Paid: parseInt(stats.stage2_count),
                annualBonuses: parseInt(stats.annual_count),
                totalEarned,
            },
            referrals: referralsResult.rows.map((r: any) => ({
                id: r.id,
                name: r.first_name ? `${r.first_name} ${(r.last_name?.[0] || '')}.` : 'Anonymous',
                stage1Paid: r.stage1_paid,
                stage2Paid: r.stage2_paid,
                annualBonusPaid: r.annual_bonus_paid,
                joinedAt: r.created_at,
            })),
            activity: activityResult.rows,
        });
    } catch (error: any) {
        if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
