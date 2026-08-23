import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/ai';
import { query } from '@/lib/db';
import { ensureReferralCode, getReferralStats } from '@/lib/referrals';
import { getMembershipByAccount } from '@/lib/membership';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const user = await getUserFromRequest(req);
        const settings = await query(
            `SELECT first_name FROM user_settings WHERE user_id = $1`,
            [user.privyDid]
        );
        await ensureReferralCode(user.privyDid, settings.rows[0]?.first_name ?? '');
        return NextResponse.json(await getReferralStats(user.privyDid));
    } catch (error: any) {
        if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        console.error('[referrals] GET failed:', error);
        return NextResponse.json({ error: 'Unable to load referral details' }, { status: 500 });
    }
}

/** Set the owned account that receives vested referrer day grants. */
export async function PUT(req: NextRequest) {
    try {
        const user = await getUserFromRequest(req);
        const { accountId } = await req.json();
        const parsedAccountId = Number(accountId);
        if (!Number.isInteger(parsedAccountId) || parsedAccountId <= 0) {
            return NextResponse.json({ error: 'A valid accountId is required' }, { status: 400 });
        }

        const membership = await getMembershipByAccount(parsedAccountId);
        if (!membership || membership.user_id !== user.privyDid) {
            return NextResponse.json({ error: 'That account does not belong to you' }, { status: 403 });
        }

        await query(
            `UPDATE user_settings
             SET referral_reward_account_id = $2, updated_at = NOW()
             WHERE user_id = $1`,
            [user.privyDid, parsedAccountId]
        );
        return NextResponse.json({
            rewardAccount: {
                accountId: membership.account_id,
                plan: membership.plan,
                status: membership.status,
                hasStripeSubscription: Boolean(membership.stripe_subscription_id),
                pendingBonusDays: membership.pending_bonus_days,
            },
        });
    } catch (error: any) {
        if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        console.error('[referrals] PUT failed:', error);
        return NextResponse.json({ error: 'Unable to save reward account' }, { status: 500 });
    }
}
