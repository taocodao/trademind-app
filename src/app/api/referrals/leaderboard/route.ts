import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/referrals/leaderboard
 * Returns the top 10 referrers for the current calendar month.
 * Public, no auth required (usernames are display names, not emails or DIDs).
 */
export async function GET(req: NextRequest) {
    try {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

        const result = await query(
            `SELECT
                u.first_name,
                u.referral_code,
                COUNT(e.id) as referral_count,
                COUNT(*) FILTER (WHERE e.status IN ('pending', 'vested')) as converted_count
             FROM referral_events e
             JOIN user_settings u ON u.user_id = e.referrer_id
             WHERE e.converted_at >= $1
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
