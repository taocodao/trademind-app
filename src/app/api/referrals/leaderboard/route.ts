import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/referrals/leaderboard
 * Returns the top 10 referrers for the current calendar month.
 * Public — no auth required (usernames are display names, not emails or DIDs).
 */
export async function GET(req: NextRequest) {
    try {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

        const result = await query(
            `SELECT 
                u.first_name,
                u.referral_code,
                COUNT(r.id) as referral_count,
                COUNT(CASE WHEN r.stage1_paid OR r.annual_bonus_paid THEN 1 END) as converted_count
             FROM referrals r
             JOIN user_settings u ON u.user_id = r.referrer_user_id
             WHERE r.created_at >= $1
             GROUP BY u.user_id, u.first_name, u.referral_code
             ORDER BY referral_count DESC
             LIMIT 10`,
            [monthStart]
        );

        const leaders = result.rows.map((row: any, idx: number) => ({
            rank: idx + 1,
            displayName: row.first_name ? `${row.first_name.slice(0, 1)}***` : 'Anonymous',
            code: row.referral_code,
            referralCount: parseInt(row.referral_count),
            convertedCount: parseInt(row.converted_count),
        }));

        return NextResponse.json({
            month: now.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
            leaders,
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
