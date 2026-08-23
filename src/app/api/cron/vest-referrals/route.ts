/**
 * GET /api/cron/vest-referrals
 *
 * Daily job, vests due referrer day grants. A referral conversion starts as
 * 'pending' after the referee's first paid account and pays the referrer only
 * after the referee stays active for 75 days.
 *
 *   - Referee churned before vesting means the referrer grant is void
 *   - Referrer rewards are capped at 12 per trailing 12 months
 *
 * Scheduled via vercel.json cron: "0 13 * * *" (13:00 UTC = 9 AM ET).
 * Protected by CRON_SECRET header set by Vercel automatically.
 *
 * The vesting implementation resolves the current designated reward account
 * and either extends its Stripe subscription or parks days for checkout.
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
