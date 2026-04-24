/**
 * GET /api/whop/trial-status
 * Returns trial end date and conversion status for /upgrade countdown timer.
 * Called client-side with ?user=<userId>
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: NextRequest): Promise<NextResponse> {
    const userId = req.nextUrl.searchParams.get('user');
    if (!userId) {
        return NextResponse.json({ error: 'Missing user param' }, { status: 400 });
    }

    const result = await query(
        `SELECT trial_started_at, trial_ended_at, converted, converted_plan, converted_at
         FROM trial_conversions WHERE user_id = $1`,
        [userId]
    );

    if (result.rowCount === 0) {
        return NextResponse.json({ trialEndsAt: null, converted: false });
    }

    const row = result.rows[0];
    // Trial end = started_at + 30 days
    const endsAt = row.trial_started_at
        ? new Date(new Date(row.trial_started_at).getTime() + 30 * 86400000).toISOString()
        : null;

    return NextResponse.json({
        trialEndsAt:   endsAt,
        converted:     row.converted ?? false,
        convertedPlan: row.converted_plan ?? null,
        convertedAt:   row.converted_at ?? null,
    });
}
