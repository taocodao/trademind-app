import { getPrivyUserId } from '@/lib/auth-helpers';
import { NextRequest, NextResponse } from 'next/server';
import { getAccount } from '@/lib/accounts';
import { getMembershipByAccount, updateMembership, type AccountMembership } from '@/lib/membership';
import { getStripe } from '@/lib/stripe-server';
import { query } from '@/lib/db';
import { sendRefundEmail } from '@/lib/newsletter/email';

export const dynamic = 'force-dynamic';

async function getUserId(req: NextRequest): Promise<string | null> {
    // Verified identity only: the sign-in token signature is checked; unverified token contents are never trusted.
    return getPrivyUserId(req);
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

/** Stripe no longer knows this subscription (deleted, refunded, or from another Stripe account): reset the membership instead of failing. */
async function handleMissingSubscription(req: NextRequest, error: unknown): Promise<NextResponse | null> {
    const message = error instanceof Error ? error.message : '';
    if (!/^No such subscription/i.test(message)) return null;
    const body = (req as NextRequest & { _cancelBody?: Record<string, unknown> })._cancelBody ?? {};
    const accountId = Number(body.accountId);
    if (Number.isInteger(accountId) && accountId > 0) {
        await updateMembership(accountId, { status: 'expired', stripe_subscription_id: null, cancel_at_period_end: false, current_period_end: new Date().toISOString() });
    }
    return NextResponse.json({
        error: 'This subscription no longer exists at our payment provider, so there is nothing left to cancel. The account is now shown as not subscribed. If you were charged, contact support@trademind.bot with your payment email.',
        reset: true,
    }, { status: 410 });
}

export async function POST(req: NextRequest) {
    try {
        const result = await ownedSubscription(req);
        if ('error' in result) return result.error;
        const subscriptionId = result.membership.stripe_subscription_id;
        if (!subscriptionId) return NextResponse.json({ error: 'No Stripe subscription found for this account' }, { status: 404 });

        // The card is charged at checkout. Cancel within 31 days of that first
        // charge: full refund, access ends immediately. Later cancels, and the
        // auto-renew toggle, only stop the next renewal.
        const stripe = getStripe();
        const full = await stripe.subscriptions.retrieve(subscriptionId, { expand: ['latest_invoice'] });

        // Toggle path: only turn auto renew off. Never refunds and never ends
        // access early. During the free month this also means no charge.
        const body = (req as NextRequest & { _cancelBody?: Record<string, unknown> })._cancelBody ?? {};
        if (body.autoRenewOnly === true) {
            const periodEnd = (full as { current_period_end?: number }).current_period_end;
            const accessUntil = periodEnd ? new Date(periodEnd * 1000).toISOString() : result.membership.current_period_end;
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
            let refundAmount = 0;
            let refundCurrency = 'usd';
            if (paymentIntentId) {
                try {
                    const refund = await stripe.refunds.create({ payment_intent: paymentIntentId });
                    refunded = true;
                    refundAmount = refund.amount;
                    refundCurrency = refund.currency || 'usd';
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
            if (refunded) {
                try {
                    let to = '';
                    const ls = await query('SELECT login_email FROM user_settings WHERE user_id = $1', [result.membership.user_id]);
                    to = (ls.rows[0]?.login_email || '').trim();
                    if (!to) {
                        const custRef = (full as { customer?: unknown }).customer;
                        const custId = typeof custRef === 'string' ? custRef : (custRef as { id?: string } | null)?.id;
                        if (custId) {
                            const cust = await stripe.customers.retrieve(custId);
                            if (!('deleted' in cust && cust.deleted)) to = (cust.email || '').trim();
                        }
                    }
                    if (to) {
                        const planMeta = result.membership.plan === 'leaps' ? 'QQQ LEAPS' : 'QQQ Defensive';
                        await sendRefundEmail({
                            to,
                            planLabel: planMeta,
                            amount: (refundAmount / 100).toLocaleString('en-US', { style: 'currency', currency: refundCurrency.toUpperCase() }),
                            refundedOn: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' }),
                            invoiceNumber: (invoiceObj as { number?: string | null } | null)?.number ?? null,
                        });
                    }
                } catch (mailErr) {
                    console.warn('[refund-email] failed', mailErr);
                }
            }
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
        const missing = await handleMissingSubscription(req, error);
        if (missing) return missing;
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
        const missing = await handleMissingSubscription(req, error);
        if (missing) return missing;
        const message = error instanceof Error ? error.message : 'Failed to turn on auto renew';
        console.error('Stripe reactivate error:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
