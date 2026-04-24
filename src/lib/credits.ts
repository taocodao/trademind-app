/**
 * Credit System
 * =============
 * Issues, queries, and redeems the user_credits ledger.
 *
 * Storage:  INTEGER cents (10000 = $100.00)
 * Redemption: credits → bonus subscription days via Stripe trial_end extension
 *
 * Day conversion is PLAN-SPECIFIC:
 *   bonus_days = floor( credit_cents / 100 × 30 / plan_monthly_price )
 */

import Stripe from 'stripe';
import { query } from '@/lib/db';
import { creditsToBonusDays } from '@/lib/pricing-config';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '');

export type CreditSource =
    | 'loyalty'
    | 'referral'       // referrer side
    | 'referral_bonus' // referred-user side
    | 'trial_bonus';   // $15 trial return credit

// ── Issuance ──────────────────────────────────────────────────────────────────

/** Issue credits (in cents) to a user's ledger */
export async function issueCredits(
    userId: string,
    amountCents: number,
    source: CreditSource,
    expiryDays = 90
): Promise<void> {
    await query(
        `INSERT INTO user_credits (user_id, amount, source, expires_at)
         VALUES ($1, $2, $3, NOW() + ($4 || ' days')::INTERVAL)`,
        [userId, amountCents, source, expiryDays]
    );
    const dollars = (amountCents / 100).toFixed(2);
    console.log(`[Credits] Issued $${dollars} (${source}) to ${userId}`);
}

// ── Balance ───────────────────────────────────────────────────────────────────

/** Get total unredeemed, non-expired credit balance in cents */
export async function getCreditBalance(userId: string): Promise<number> {
    const result = await query(
        `SELECT COALESCE(SUM(amount), 0) AS balance
         FROM user_credits
         WHERE user_id = $1
           AND redeemed_at IS NULL
           AND (expires_at IS NULL OR expires_at > NOW())`,
        [userId]
    );
    return parseInt(result.rows[0]?.balance ?? '0', 10);
}

/** Get credit history for display in the account/referrals page */
export async function getCreditHistory(userId: string, limit = 20): Promise<any[]> {
    const result = await query(
        `SELECT id, amount, source, issued_at, expires_at, redeemed_at, redeemed_against
         FROM user_credits
         WHERE user_id = $1
         ORDER BY issued_at DESC
         LIMIT $2`,
        [userId, limit]
    );
    return result.rows;
}

// ── Stripe Extension ──────────────────────────────────────────────────────────

/**
 * Extend a Stripe subscription by bonusDays using the trial_end mechanism.
 *
 * Stripe docs confirm: setting trial_end on an active subscription pushes the
 * billing_cycle_anchor (= next invoice date) to that timestamp.
 * proration_behavior: 'none' ensures no immediate charge or credit note.
 *
 * Stacking: if trial_end is already set (prior extension), we stack on top of
 * the existing trial_end rather than current_period_end to avoid shrinking
 * a previously granted extension.
 *
 * Reference: https://docs.stripe.com/billing/subscriptions/trials
 */
export async function extendStripeSubscription(
    subscriptionId: string,
    bonusDays: number
): Promise<{ newPeriodEnd: Date; daysAdded: number }> {
    if (bonusDays <= 0) {
        return { newPeriodEnd: new Date(), daysAdded: 0 };
    }

    const sub = await stripe.subscriptions.retrieve(subscriptionId) as any;

    // If there's already a future trial_end (stacked extension), build on that
    const baseTimestamp: number =
        sub.trial_end && sub.trial_end > sub.current_period_end
            ? sub.trial_end
            : sub.current_period_end;

    const newTrialEnd = baseTimestamp + bonusDays * 86400; // seconds

    await stripe.subscriptions.update(subscriptionId, {
        // trial_end accepts Unix timestamp — confirmed in Stripe billing docs
        trial_end: newTrialEnd as any,
        proration_behavior: 'none',
    });

    const newPeriodEnd = new Date(newTrialEnd * 1000);
    console.log(`[Credits] Extended sub ${subscriptionId} by ${bonusDays} days → new end: ${newPeriodEnd.toISOString()}`);
    return { newPeriodEnd, daysAdded: bonusDays };
}

// ── Redemption ────────────────────────────────────────────────────────────────

/**
 * Redeem all available credits for a user as bonus subscription days.
 * Marks credits as redeemed in the ledger and calls Stripe to extend the sub.
 *
 * @param userId            Internal user_id (Privy DID or Whop user ID)
 * @param subscriptionId    Stripe subscription ID (stripe_subscription_id in user_settings)
 * @param planMonthlyPrice  Current plan's monthly price in dollars (e.g. 29 for TurboCore)
 * @param context           Description stored in redeemed_against field
 */
export async function redeemAllCredits(
    userId: string,
    subscriptionId: string,
    planMonthlyPrice: number,
    context = 'auto_renewal'
): Promise<{ bonusDays: number; creditsCents: number }> {
    const balance = await getCreditBalance(userId);
    if (balance <= 0) {
        console.log(`[Credits] No redeemable credits for ${userId}`);
        return { bonusDays: 0, creditsCents: 0 };
    }

    const bonusDays = creditsToBonusDays(balance, planMonthlyPrice);
    if (bonusDays <= 0) {
        console.log(`[Credits] Balance ${balance}¢ too small to yield full day at $${planMonthlyPrice}/mo`);
        return { bonusDays: 0, creditsCents: 0 };
    }

    // Mark credits as redeemed (FIFO — oldest first)
    await query(
        `UPDATE user_credits
         SET redeemed_at = NOW(), redeemed_against = $3
         WHERE id IN (
             SELECT id FROM user_credits
             WHERE user_id = $1
               AND redeemed_at IS NULL
               AND (expires_at IS NULL OR expires_at > NOW())
             ORDER BY issued_at ASC
         )`,
        [userId, balance, context]
    );

    // Extend Stripe subscription
    await extendStripeSubscription(subscriptionId, bonusDays);

    console.log(`[Credits] Redeemed ${balance}¢ → ${bonusDays} days for user ${userId}`);
    return { bonusDays, creditsCents: balance };
}
