import { NextRequest } from 'next/server';
import Stripe from 'stripe';
import { getStripe } from '@/lib/stripe-server';
import {
    createMembershipForAccount,
    getMembershipByAccount,
    getMembershipByStripeSubscription,
    type MembershipPlan,
    type MembershipStatus,
    updateMembership,
} from '@/lib/membership';
import { createAccount } from '@/lib/accounts';
import { query } from '@/lib/db';
import { handleReferralFirstPayment } from '@/lib/referrals';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
        return new Response('Webhook secret not configured', { status: 500 });
    }

    const rawBody = await req.text();
    const signature = req.headers.get('stripe-signature');
    if (!signature) return new Response('Missing stripe-signature header', { status: 400 });

    let event: Stripe.Event;
    try {
        event = getStripe().webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Invalid webhook signature';
        console.error('Stripe webhook signature verification failed:', message);
        return new Response(`Webhook Error: ${message}`, { status: 400 });
    }

    try {
        await processWebhookEvent(event);
    } catch (error) {
        // Stripe retries only on a non-2xx response. Log operational failures for follow-up.
        console.error('Stripe webhook processing error:', error);
    }

    return new Response('OK', { status: 200 });
}

function unixToIso(value: number | null | undefined): string | null {
    return value ? new Date(value * 1000).toISOString() : null;
}

function membershipStatusForStripe(status: Stripe.Subscription.Status): MembershipStatus {
    if (status === 'past_due') return 'past_due';
    if (status === 'canceled' || status === 'unpaid') return 'expired';
    // Bonus-day grants can surface as Stripe "trialing" while retaining paid entitlement.
    return 'active';
}

async function processWebhookEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
        case 'checkout.session.completed': {
            const session = event.data.object as Stripe.Checkout.Session;
            const userId = session.metadata?.userId;
            const metadataPlan = session.metadata?.plan;
            const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
            if (!userId || !subscriptionId) return;

            const subscription = await getStripe().subscriptions.retrieve(subscriptionId) as Stripe.Subscription & {
                current_period_end?: number;
            };

            let accountId = Number(session.metadata?.account_id);

            // Plan-first checkout (Sep 2026): payment succeeded before any
            // account existed, so create it now with strategy defaults.
            // Principal defaults: QQQ Basic $10,000, QQQ LEAPS $25,000.
            if (!Number.isInteger(accountId) || accountId <= 0) {
                if (session.metadata?.auto_create !== '1' || !metadataPlan) return;
                const plan = metadataPlan as MembershipPlan;
                const strategy = plan === 'leaps' ? 'QQQ_LEAPS' : 'TQQQ_TURBOCORE_PRO';
                const principal = plan === 'leaps' ? 25000 : 10000;
                const name = plan === 'leaps' ? 'QQQ LEAPS' : 'QQQ Basic';
                const emailRow = await query(
                    `SELECT COALESCE(login_email, email) AS e FROM user_settings WHERE user_id = $1`,
                    [userId]
                );
                // One account per plan: reuse an existing account for this plan
                // if the user managed to create one between checkout and payment.
                const existing = await query(
                    `SELECT a.id FROM accounts a
                     JOIN account_memberships m ON m.account_id = a.id
                     WHERE a.user_id = $1 AND m.plan = $2
                     ORDER BY a.created_at ASC LIMIT 1`,
                    [userId, plan]
                );
                if (existing.rows[0]?.id) {
                    accountId = existing.rows[0].id;
                } else {
                    const account = await createAccount(
                        userId,
                        name,
                        strategy,
                        'moderate',
                        principal,
                        emailRow.rows[0]?.e ?? null
                    );
                    accountId = account.id;
                    // Attach any unattached referral attribution so the referee
                    // and referrer day grants still vest on this first payment.
                    const ref = await query(
                        `SELECT id FROM referral_events
                         WHERE referred_id = $1 AND referred_account_id IS NULL
                         ORDER BY converted_at ASC LIMIT 1`,
                        [userId]
                    );
                    const referralEventId: string | null = ref.rows[0]?.id ?? null;
                    if (referralEventId) {
                        await query(
                            `UPDATE referral_events SET referred_account_id = $2 WHERE id = $1`,
                            [referralEventId, accountId]
                        );
                    }
                    await createMembershipForAccount({
                        accountId,
                        userId,
                        strategy,
                        referredSignup: !!referralEventId,
                        referralEventId,
                    });
                }
            }

            const membership = await getMembershipByAccount(accountId);
            if (!membership || membership.user_id !== userId) {
                console.warn('Stripe checkout could not resolve an owned account membership', { accountId, userId });
                return;
            }

            if (metadataPlan && metadataPlan !== membership.plan) {
                console.warn('Stripe checkout plan metadata does not match membership plan', { accountId, metadataPlan, membershipPlan: membership.plan });
                return;
            }

            await updateMembership(accountId, {
                status: 'active',
                stripe_subscription_id: subscription.id,
                current_period_end: unixToIso(subscription.current_period_end),
                cancel_at_period_end: false,
                pending_bonus_days: membership.pending_bonus_days > 0 ? 0 : membership.pending_bonus_days,
            });

            if (membership.referred_signup) {
                await handleReferralFirstPayment({
                    referredUserId: membership.user_id,
                    accountId,
                    plan: membership.plan,
                    stripeSubscriptionId: subscription.id,
                });
            }

            // Newsletter discount redemption: payment succeeded with the
            // NEWSLETTER30 coupon attached by checkout.
            const nlSubscriberId = session.metadata?.newsletter_subscriber_id;
            if (nlSubscriberId) {
                const { markRedeemed } = await import('@/lib/newsletter/db');
                const { sendRedemptionReceiptEmail } = await import('@/lib/newsletter/email');
                const { query } = await import('@/lib/db');
                const redeemed = await markRedeemed(Number(nlSubscriberId), subscription.id, accountId);
                if (redeemed) {
                    const sub = await query(
                        `SELECT email FROM newsletter_subscribers WHERE id = $1`,
                        [Number(nlSubscriberId)]
                    );
                    const to = sub.rows[0]?.email;
                    if (to) {
                        const renewal = subscription.current_period_end
                            ? new Date(subscription.current_period_end * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                            : undefined;
                        void sendRedemptionReceiptEmail({
                            to,
                            planLabel: metadataPlan === 'leaps' ? 'QQQ LEAPS' : 'QQQ Basic',
                            renewalDate: renewal,
                        });
                    }
                }
            }
            return;
        }

        case 'charge.dispute.created': {
            // Chargeback: revoke the newsletter discount tied to the order.
            const dispute = event.data.object as Stripe.Dispute;
            const chargeId = typeof dispute.charge === 'string' ? dispute.charge : dispute.charge?.id;
            if (!chargeId) return;
            try {
                const charge = await getStripe().charges.retrieve(chargeId);
                const invoiceRef = (charge as Stripe.Charge & { invoice?: string | Stripe.Invoice }).invoice;
                const invoiceId = typeof invoiceRef === 'string' ? invoiceRef : invoiceRef?.id;
                if (!invoiceId) return;
                const invoice = await getStripe().invoices.retrieve(invoiceId);
                const subRef = (invoice as Stripe.Invoice & { subscription?: string | Stripe.Subscription }).subscription;
                const subId = typeof subRef === 'string' ? subRef : subRef?.id;
                if (!subId) return;
                const { query } = await import('@/lib/db');
                const { recordNewsletterEvent } = await import('@/lib/newsletter/db');
                const res = await query(
                    `UPDATE newsletter_discounts
                     SET state = 'revoked', revoked_reason = 'chargeback', updated_at = NOW()
                     WHERE order_id = $1 AND state = 'redeemed'
                     RETURNING subscriber_id`,
                    [subId]
                );
                if (res.rows[0]) {
                    await recordNewsletterEvent('discount_revoked', { reason: 'chargeback', orderId: subId }, res.rows[0].subscriber_id);
                }
            } catch (err) {
                console.error('Newsletter chargeback handling failed:', err);
            }
            return;
        }

        case 'customer.subscription.updated': {
            const subscription = event.data.object as Stripe.Subscription & { current_period_end?: number };
            const membership = await getMembershipByStripeSubscription(subscription.id);
            if (!membership) return;
            await updateMembership(membership.account_id, {
                status: membershipStatusForStripe(subscription.status),
                current_period_end: unixToIso(subscription.current_period_end),
                cancel_at_period_end: subscription.cancel_at_period_end,
            });
            return;
        }

        case 'customer.subscription.deleted': {
            const subscription = event.data.object as Stripe.Subscription;
            const membership = await getMembershipByStripeSubscription(subscription.id);
            if (!membership) return;
            await updateMembership(membership.account_id, {
                status: 'expired',
                stripe_subscription_id: null,
                cancel_at_period_end: false,
            });
            return;
        }

        case 'invoice.payment_failed': {
            const invoice = event.data.object as Stripe.Invoice;
            const subscriptionId = (invoice as Stripe.Invoice & { subscription?: string | Stripe.Subscription }).subscription;
            const normalizedId = typeof subscriptionId === 'string' ? subscriptionId : subscriptionId?.id;
            if (!normalizedId) return;
            const membership = await getMembershipByStripeSubscription(normalizedId);
            if (!membership) return;
            await updateMembership(membership.account_id, { status: 'past_due' });
            return;
        }

        default:
            return;
    }
}
