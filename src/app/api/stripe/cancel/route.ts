import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAccount } from '@/lib/accounts';
import { getMembershipByAccount, updateMembership, type AccountMembership } from '@/lib/membership';
import { getStripe } from '@/lib/stripe-server';

export const dynamic = 'force-dynamic';

async function getUserId(req: NextRequest): Promise<string | null> {
    const cookieStore = await cookies();
    const cookieUserId = cookieStore.get('privy-user-id')?.value;
    if (cookieUserId) return cookieUserId;
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return null;
    try {
        const payload = JSON.parse(Buffer.from(authHeader.slice(7).split('.')[1], 'base64url').toString());
        return payload?.sub || payload?.privy_did || null;
    } catch {
        return null;
    }
}

type OwnedSubscriptionResult = { membership: AccountMembership } | { error: NextResponse };

async function ownedSubscription(req: NextRequest): Promise<OwnedSubscriptionResult> {
    const userId = await getUserId(req);
    if (!userId) return { error: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }) };
    const body = await req.json().catch(() => ({}));
    const accountId = Number(body.accountId);
    if (!Number.isInteger(accountId) || accountId <= 0) {
        return { error: NextResponse.json({ error: 'A valid accountId is required' }, { status: 400 }) };
    }
    const account = await getAccount(accountId, userId);
    if (!account) return { error: NextResponse.json({ error: 'Account not found' }, { status: 404 }) };
    const membership = await getMembershipByAccount(account.id);
    if (!membership?.stripe_subscription_id) {
        return { error: NextResponse.json({ error: 'No Stripe subscription found for this account' }, { status: 404 }) };
    }
    return { membership };
}

export async function POST(req: NextRequest) {
    try {
        const result = await ownedSubscription(req);
        if ('error' in result) return result.error;
        const subscriptionId = result.membership.stripe_subscription_id;
        if (!subscriptionId) return NextResponse.json({ error: 'No Stripe subscription found for this account' }, { status: 404 });
        const subscription = await getStripe().subscriptions.update(subscriptionId, {
            cancel_at_period_end: true,
        }) as { cancel_at_period_end: boolean; current_period_end?: number; status: string };
        const currentPeriodEnd = subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : result.membership.current_period_end;
        await updateMembership(result.membership.account_id, {
            status: 'canceled',
            cancel_at_period_end: true,
            current_period_end: currentPeriodEnd,
        });
        return NextResponse.json({ success: true, cancelAt: currentPeriodEnd, status: subscription.status });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to turn off auto renew';
        console.error('Stripe cancel error:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const result = await ownedSubscription(req);
        if ('error' in result) return result.error;
        const subscriptionId = result.membership.stripe_subscription_id;
        if (!subscriptionId) return NextResponse.json({ error: 'No Stripe subscription found for this account' }, { status: 404 });
        const subscription = await getStripe().subscriptions.update(subscriptionId, {
            cancel_at_period_end: false,
        }) as { status: string };
        await updateMembership(result.membership.account_id, {
            status: subscription.status === 'past_due' ? 'past_due' : 'active',
            cancel_at_period_end: false,
        });
        return NextResponse.json({ success: true, cancelAtPeriodEnd: false, status: subscription.status });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to turn on auto renew';
        console.error('Stripe reactivate error:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
