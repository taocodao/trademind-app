import { getPrivyUserId } from '@/lib/auth-helpers';
import { NextRequest, NextResponse } from 'next/server';
import { getAccount } from '@/lib/accounts';
import { getMembershipByAccount, updateMembership } from '@/lib/membership';
import { getStripe } from '@/lib/stripe-server';

export const dynamic = 'force-dynamic';

async function getUserId(req: NextRequest): Promise<string | null> {
    // Verified identity only: the sign-in token signature is checked; unverified token contents are never trusted.
    return getPrivyUserId(req);
}

export async function POST(req: NextRequest) {
    try {
        const userId = await getUserId(req);
        if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        const body = await req.json().catch(() => ({}));
        const accountId = Number(body.accountId);
        if (!Number.isInteger(accountId) || accountId <= 0) {
            return NextResponse.json({ error: 'A valid accountId is required' }, { status: 400 });
        }
        const account = await getAccount(accountId, userId);
        if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 });
        const membership = await getMembershipByAccount(account.id);
        if (!membership?.stripe_subscription_id) {
            return NextResponse.json({ error: 'No Stripe subscription found for this account' }, { status: 404 });
        }
        const subscription = await getStripe().subscriptions.update(membership.stripe_subscription_id, {
            cancel_at_period_end: false,
        });
        await updateMembership(account.id, {
            status: subscription.status === 'past_due' ? 'past_due' : 'active',
            cancel_at_period_end: false,
        });
        return NextResponse.json({ success: true, status: subscription.status });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to turn on auto renew';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
