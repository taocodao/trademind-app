import Stripe from 'stripe';
import pool from '@/lib/db';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-01-27.acacia' as any,
});

// Daily rate per price ID (in USD)
function getDailyRate(priceId: string): number {
    const rates: Record<string, number> = {
        [process.env.NEXT_PUBLIC_STRIPE_TURBOCORE_MONTHLY_PRICE_ID || '']:  29 / 30,
        [process.env.NEXT_PUBLIC_STRIPE_TURBOCORE_ANNUAL_PRICE_ID  || '']:  249 / 365,
        [process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID       || '']:  49 / 30,
        [process.env.NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID        || '']:  399 / 365,
        [process.env.NEXT_PUBLIC_STRIPE_BUNDLE_MONTHLY_PRICE_ID    || '']:  69 / 30,
        [process.env.NEXT_PUBLIC_STRIPE_BUNDLE_ANNUAL_PRICE_ID     || '']:  549 / 365,
    };
    delete rates[''];
    // Default fallback: ~$1/day if plan not found
    return rates[priceId] ?? 1;
}

/**
 * Extends a user's Stripe subscription renewal date by the number of free days
 * equivalent to the given reward amount, based on their current plan's daily rate.
 *
 * @param referrerUserId  - Privy DID of the referrer
 * @param rewardAmountUsd - Dollar value of the reward (e.g. 50 for $50)
 * @param referralId      - DB id of the referral record (for logging)
 * @param description     - Human-readable reason for the extension
 */
export async function extendReferrerSubscription(
    referrerUserId: string,
    rewardAmountUsd: number,
    referralId: number,
    description: string,
): Promise<{ extensionDays: number; newTrialEnd: Date } | null> {
    try {
        // 1. Look up referrer's active Stripe subscription
        const result = await pool.query(
            `SELECT stripe_subscription_id, stripe_price_id FROM user_settings WHERE user_id = $1`,
            [referrerUserId]
        );
        const row = result.rows[0];
        if (!row?.stripe_subscription_id) {
            console.log(`⏭️  extendReferrerSubscription: no active subscription for ${referrerUserId}, skipping.`);
            return null;
        }

        const subscriptionId = row.stripe_subscription_id;
        const priceId = row.stripe_price_id;

        // 2. Fetch live subscription from Stripe
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        if (!['active', 'trialing'].includes(subscription.status)) {
            console.log(`⏭️  extendReferrerSubscription: subscription ${subscriptionId} is ${subscription.status}, skipping.`);
            return null;
        }

        // 3. Calculate extension days from daily rate
        const dailyRate = getDailyRate(priceId);
        const extensionDays = Math.max(1, Math.floor(rewardAmountUsd / dailyRate));

        // 4. Compute new trial_end: extend from current trial_end (if trialing) or current_period_end
        const sub = subscription as any;
        const currentEnd: number = sub.trial_end ?? sub.current_period_end;
        const newTrialEndTimestamp = currentEnd + extensionDays * 24 * 60 * 60;
        const newTrialEnd = new Date(newTrialEndTimestamp * 1000);

        // 5. Update Stripe subscription — push renewal date forward
        await stripe.subscriptions.update(subscriptionId, {
            trial_end: newTrialEndTimestamp,
            proration_behavior: 'none',
        } as any);

        // 6. Log extension in referral_activity
        await pool.query(
            `INSERT INTO referral_activity (referral_id, event_type, credit_amount, description)
             VALUES ($1, 'subscription_extended', $2, $3)`,
            [
                referralId,
                rewardAmountUsd,
                `${description} — +${extensionDays} free days (new renewal: ${newTrialEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})`,
            ]
        );

        console.log(`🎁 Extended subscription for ${referrerUserId}: +${extensionDays} days → new trial_end ${newTrialEnd.toISOString()}`);
        return { extensionDays, newTrialEnd };

    } catch (err) {
        console.error('extendReferrerSubscription error:', err);
        return null;
    }
}
