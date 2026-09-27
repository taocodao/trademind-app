import Stripe from 'stripe';
import pool, { query } from '@/lib/db';
import { getStripe } from '@/lib/stripe-server';
import {
    createMembershipForAccount,
    getMembershipByAccount,
    getMembershipByStripeSubscription,
    updateMembership,
    type MembershipPlan,
} from '@/lib/membership';
import { createAccount } from '@/lib/accounts';
import { handleReferralFirstPayment } from '@/lib/referrals';

/**
 * Provision the virtual account + membership for a completed Checkout
 * Session. Idempotent: safe to call from the Stripe webhook AND from the
 * post-checkout confirm endpoint (whichever lands first wins; the other is a
 * no-op). Returns the account id, or null if the session is not ours / not
 * paid.
 *
 * Why both paths: the success redirect must never depend on the webhook
 * alone. If the webhook is delayed or misconfigured, the confirm endpoint
 * still turns a paid session into an account, so the user lands on their
 * account instead of being bounced back to pricing and checkout.
 */
export async function provisionCheckoutSession(session: Stripe.Checkout.Session): Promise<number | null> {
    const userId = session.metadata?.userId;
    const metadataPlan = session.metadata?.plan;
    const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
    if (!userId || !subscriptionId) return null;
    if (session.status !== 'complete') return null;
    if (session.payment_status !== 'paid' && session.payment_status !== 'no_payment_required') return null;

    // Already provisioned for this subscription: nothing to do.
    const already = await getMembershipByStripeSubscription(subscriptionId);
    if (already) return already.account_id;

    // Serialize concurrent provisioning for the same user (webhook + confirm
    // can arrive together) so we never create two accounts for one payment.
    const lockClient = await pool.connect();
    try {
        await lockClient.query('SELECT pg_advisory_lock(hashtext($1))', [`provision:${userId}`]);

        const again = await getMembershipByStripeSubscription(subscriptionId);
        if (again) return again.account_id;

        const subscription = await getStripe().subscriptions.retrieve(subscriptionId) as Stripe.Subscription & {
            current_period_end?: number;
        };

        let accountId = Number(session.metadata?.account_id);

        // Plan-first checkout: payment succeeded before any account existed,
        // so create it now with strategy defaults.
        // Principal defaults: QQQ Basic $10,000, QQQ LEAPS $25,000.
        if (!Number.isInteger(accountId) || accountId <= 0) {
            if (session.metadata?.auto_create !== '1' || !metadataPlan) return null;
            const plan = metadataPlan as MembershipPlan;
            const strategy = plan === 'leaps' ? 'QQQ_LEAPS' : 'TQQQ_TURBOCORE_PRO';
            const principal = plan === 'leaps' ? 25000 : 10000;
            const name = plan === 'leaps' ? 'QQQ LEAPS' : 'QQQ Basic';
            const emailRow = await query(
                `SELECT COALESCE(login_email, email) AS e FROM user_settings WHERE user_id = $1`,
                [userId]
            );
            // One account per plan per login.
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
                    emailRow.rows[0]?.e ?? session.customer_details?.email ?? null
                );
                accountId = account.id;
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
            return null;
        }
        if (metadataPlan && metadataPlan !== membership.plan) {
            console.warn('Stripe checkout plan metadata does not match membership plan', { accountId, metadataPlan, membershipPlan: membership.plan });
            return null;
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

        const nlSubscriberId = session.metadata?.newsletter_subscriber_id;
        if (nlSubscriberId) {
            try {
                const { markRedeemed } = await import('@/lib/newsletter/db');
                const { sendRedemptionReceiptEmail } = await import('@/lib/newsletter/email');
                const redeemed = await markRedeemed(Number(nlSubscriberId), subscription.id, accountId);
                if (redeemed) {
                    const sub = await query(`SELECT email FROM newsletter_subscribers WHERE id = $1`, [Number(nlSubscriberId)]);
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
            } catch (err) {
                console.error('Newsletter redemption marking failed:', err);
            }
        }

        return accountId;
    } finally {
        try { await lockClient.query('SELECT pg_advisory_unlock(hashtext($1))', [`provision:${userId}`]); } catch { /* ignore */ }
        lockClient.release();
    }
}

/**
 * Recover any paid-but-unprovisioned checkouts for a user by listing the
 * customer's completed Checkout Sessions. Covers a payment whose webhook
 * never arrived and whose success redirect was lost (tab closed, etc).
 */
export async function reconcileUserCheckouts(userId: string): Promise<number[]> {
    const row = await query('SELECT stripe_customer_id FROM user_settings WHERE user_id = $1', [userId]);
    const customerId: string | undefined = row.rows[0]?.stripe_customer_id;
    if (!customerId) return [];
    const sessions = await getStripe().checkout.sessions.list({ customer: customerId, status: 'complete', limit: 20 });
    const out: number[] = [];
    for (const s of sessions.data) {
        if (s.metadata?.userId !== userId) continue;
        const id = await provisionCheckoutSession(s);
        if (id) out.push(id);
    }
    return out;
}

function unixToIso(value: number | null | undefined): string | null {
    return value ? new Date(value * 1000).toISOString() : null;
}

/**
 * Stripe Checkout shows the Product name and description on the left of the
 * payment page. Keep them in sync with the current product copy (the old
 * product was still named "TurboCore Pro" with a CAGR claim). Runs at most
 * once per server instance per price; failures never block checkout.
 */
const PRODUCT_COPY: Record<'basic' | 'leaps', { name: string; description: string }> = {
    basic: {
        name: 'TradeMind QQQ Basic (annual)',
        description: 'Signal service only, no auto trading. Signals are processed at 3:30 PM ET each trading day; when one fires you get emailed order instructions to enter at your own broker, and your TradeMind virtual account mirrors the order. No options approval needed. Cancel within your first month for a full refund.',
    },
    leaps: {
        name: 'TradeMind QQQ LEAPS (annual)',
        description: 'Signal service only, no auto trading. Signals are processed at 3:30 PM ET each trading day; when one fires you get emailed order instructions for long dated QQQ call options to enter at your own broker, and your TradeMind virtual account mirrors the order. Requires options approval at your broker. Cancel within your first month for a full refund.',
    },
};
const productSynced = new Set<string>();

export async function ensureStripeProductCopy(plan: 'basic' | 'leaps', priceId: string): Promise<void> {
    if (productSynced.has(priceId)) return;
    try {
        const price = await getStripe().prices.retrieve(priceId, { expand: ['product'] });
        const product = price.product as Stripe.Product;
        const want = PRODUCT_COPY[plan];
        if (product && typeof product === 'object' && (product.name !== want.name || product.description !== want.description)) {
            await getStripe().products.update(product.id, { name: want.name, description: want.description });
        }
        productSynced.add(priceId);
    } catch (err) {
        console.error('Stripe product copy sync failed:', err);
    }
}
