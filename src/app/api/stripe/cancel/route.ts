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
    const privyToken = cookieStore.get('privy-token')?.value;
    if (privyToken) {
        try {
            const payload = JSON.parse(Buffer.from(privyToken.split('.')[1], 'base64url').toString());
            const id = payload?.sub || payload?.privy_did || null;
            if (id) return id;
        } catch { /* fall through */ }
    }
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
    const body = (req as NextRequest & { _cancelBody?: Record<string, unknown> })._cancelBody ?? await req.json().catch(() => ({}));
    (req as NextRequest & { _cancelBody?: Record<string, unknown> })._cancelBody = body;
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

        // First month is a real Stripe trial: nothing is charged until day
        // 30. Turning auto renew OFF during the trial never cuts access early:
        // the subscription ends at the trial end and no charge ever happens.
        // After the first charge, cancelling within 31 days of that charge
        // refunds it in full and ends access immediately; later cancellations
        // just stop the next renewal.
        const stripe = getStripe();
        const full = await stripe.subscriptions.retrieve(subscriptionId, { expand: ['latest_invoice'] });

        // Toggle path: only turn auto renew off. Never refunds and never ends
        // access early. During the free month this also means no charge.
        const body = (req as NextRequest & { _cancelBody?: Record<string, unknown> })._cancelBody ?? {};
        if (body.autoRenewOnly === true || full.status === 'trialing') {
            const trialEnd = (full as { trial_end?: number }).trial_end;
            const periodEnd = (full as { current_period_end?: number }).current_period_end;
            const accessUntil = trialEnd && full.status === 'trialing'
                ? new Date(trialEnd * 1000).toISOString()
                : periodEnd
                    ? new Date(periodEnd * 1000).toISOString()
                    : result.membership.current_period_end;
            await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true });
            await updateMembership(result.membership.account_id, {
                status: 'canceled',
                cancel_at_period_end: true,
                current_period_end: accessUntil,
            });
            return NextResponse.json({ success: true, cancelAt: accessUntil, status: full.status });
        }

        const invoice = (full as { latest_invoice?: unknown }).latest_invoice;
        const invoiceObj = invoice && typeof invoice === 'object' ? invoice as { id?: string; payment_intent?: unknown; status?: string; status_transitions?: { paid_at?: number }; created?: number } : null;
        const paidAt = invoiceObj?.status_transitions?.paid_at ?? invoiceObj?.created ?? 0;
        const withinRefundWindow = paidAt > 0 && (Date.now() / 1000 - paidAt) <= 31 * 24 * 60 * 60;

        if (withinRefundWindow && invoiceObj?.status === 'paid') {
            const piRef = invoiceObj.payment_intent;
            const paymentIntentId = typeof piRef === 'string' ? piRef : (piRef as { id?: string } | null)?.id;
            let refunded = false;
            if (paymentIntentId) {
                try {
                    await stripe.refunds.create({ payment_intent: paymentIntentId });
                    refunded = true;
                } catch (refundError) {
                    console.error('Stripe first-month refund failed:', refundError);
                }
            }
            await stripe.subscriptions.cancel(subscriptionId);
            await updateMembership(result.membership.account_id, {
                status: 'expired',
                stripe_subscription_id: null,
                cancel_at_period_end: false,
                current_period_end: new Date().toISOString(),
            });
            return NextResponse.json({ success: true, refunded, status: 'canceled' });
        }

        const subscription = await stripe.subscriptions.update(subscriptionId, {
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
