import Stripe from 'stripe';
import pool, { query } from '@/lib/db';
import { getStripe } from '@/lib/stripe-server';
import { createAccount } from '@/lib/accounts';
import {
    createMembershipForAccount,
    getMembershipByStripeSubscription,
    updateMembership,
} from '@/lib/membership';
import { PRODUCT_ACCOUNTS, type ProductV2 } from '@/lib/pricing-v2';

/**
 * Pricing v2 provisioning. A paid v2 Checkout Session (metadata.v2 = '1') always creates NEW virtual account(s):
 * one for Defensive or LEAPS, or one of each for Both strategies. A login may buy again to hold more accounts,
 * so unlike the v1 path this never reuses an existing account. All memberships created by one session share the
 * session's Stripe subscription, so a bundle is billed, renewed, canceled and refunded as one.
 * Idempotent: if the subscription already has memberships, nothing is created.
 */
const PRINCIPAL: Record<'basic' | 'leaps', number> = { basic: 10000, leaps: 25000 };
const STRATEGY: Record<'basic' | 'leaps', string> = { basic: 'TQQQ_TURBOCORE_PRO', leaps: 'QQQ_LEAPS' };
const BASE_NAME: Record<'basic' | 'leaps', string> = { basic: 'QQQ Defensive', leaps: 'QQQ LEAPS' };

async function freeName(userId: string, base: string): Promise<string> {
    const r = await query(`SELECT name FROM accounts WHERE user_id = $1`, [userId]);
    const taken = new Set(r.rows.map((x: { name: string }) => String(x.name).toLowerCase()));
    if (!taken.has(base.toLowerCase())) return base;
    for (let i = 2; i < 100; i++) {
        const n = `${base} ${i}`;
        if (!taken.has(n.toLowerCase())) return n;
    }
    return `${base} ${Date.now()}`;
}

export function isV2Session(session: Stripe.Checkout.Session): boolean {
    return session.metadata?.v2 === '1';
}

/** Returns the first created (or already linked) account id, or null when the session is not paid or not ours. */
export async function provisionV2Session(session: Stripe.Checkout.Session, opts?: { userId?: string }): Promise<number | null> {
    const userId = opts?.userId ?? session.metadata?.userId;
    const product = session.metadata?.product as ProductV2 | undefined;
    const interval = session.metadata?.interval;
    const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
    if (!userId || !subscriptionId || !product || !PRODUCT_ACCOUNTS[product]) return null;
    if (session.status !== 'complete') return null;
    if (session.payment_status !== 'paid' && session.payment_status !== 'no_payment_required') return null;

    const already = await getMembershipByStripeSubscription(subscriptionId);
    if (already) return already.account_id;

    const lock = await pool.connect();
    try {
        await lock.query('SELECT pg_advisory_lock(hashtext($1))', [`provision:${userId}`]);
        const again = await getMembershipByStripeSubscription(subscriptionId);
        if (again) return again.account_id;

        const subscription = await getStripe().subscriptions.retrieve(subscriptionId) as Stripe.Subscription & { current_period_end?: number };
        const periodEnd = subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null;
        const emailRow = await query(`SELECT COALESCE(login_email, email) AS e FROM user_settings WHERE user_id = $1`, [userId]);
        const alertEmail = emailRow.rows[0]?.e ?? session.customer_details?.email ?? null;

        let first: number | null = null;
        for (const plan of PRODUCT_ACCOUNTS[product]) {
            const name = await freeName(userId, BASE_NAME[plan]);
            const account = await createAccount(userId, name, STRATEGY[plan], 'moderate', PRINCIPAL[plan], alertEmail);
            await createMembershipForAccount({ accountId: account.id, userId, strategy: STRATEGY[plan], referredSignup: false });
            await updateMembership(account.id, {
                status: 'active',
                stripe_subscription_id: subscription.id,
                current_period_end: periodEnd,
                cancel_at_period_end: false,
            });
            await query(
                `UPDATE account_memberships SET billing_interval = $2, pricing_version = 2 WHERE account_id = $1`,
                [account.id, interval === 'year' ? 'year' : 'month']
            );
            if (first === null) first = account.id;
        }
        return first;
    } finally {
        try { await lock.query('SELECT pg_advisory_unlock(hashtext($1))', [`provision:${userId}`]); } catch { /* ignore */ }
        lock.release();
    }
}
