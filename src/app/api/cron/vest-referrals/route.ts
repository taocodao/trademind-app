/**
 * GET /api/cron/vest-referrals
 *
 * Daily job, vests due referral rewards. A referral conversion starts as
 * 'pending' and only pays out (referrer +8mo / referee +4mo, as credits priced
 * off each recipient's own plan) after the referee stays active for
 * PRICING.referral.vestingDays (default 75).
 *
 *   - Referee churned before vesting → both sides voided
 *   - Referrer over the trailing-12-month cap → excess months forfeited
 *
 * Scheduled via vercel.json cron: "0 13 * * *" (13:00 UTC = 9 AM ET).
 * Protected by CRON_SECRET header set by Vercel automatically.
 *
 * Idempotent: credit source keys embed the referral event id, and the
 * user_credits (user_id, source) unique index absorbs any double-run.
 */

import { NextRequest, NextResponse } from 'next/server';
import { vestDueReferrals } from '@/lib/referrals';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
    // Vercel sets Authorization: Bearer <CRON_SECRET> automatically
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const result = await vestDueReferrals();
        console.log(
            `[Cron/vest-referrals] vested=${result.vested} voided=${result.voided} capped=${result.capped}`
        );
        return NextResponse.json({ ok: true, ...result });
    } catch (error: any) {
        console.error('[Cron/vest-referrals] Failed:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
