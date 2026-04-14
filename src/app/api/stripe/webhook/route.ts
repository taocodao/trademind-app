import { NextRequest } from "next/server";
import Stripe from "stripe";
import pool from "@/lib/db";
import { extendReferrerSubscription } from "@/lib/stripe-extend";
import { resolvePromoCode } from "@/lib/promo-codes";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs'; // Required for raw body access in App Router

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-01-27.acacia" as any,
});

// ── Config ─────────────────────────────────────────────────────────────────
// REFERRAL_FEE: total bilateral credit per referral (default $100)
// Split in half: $50 at signup, $50 at first charge — both referrer AND referee
const REFERRAL_FEE = parseInt(process.env.REFERRAL_FEE || '100', 10);
const REFERRAL_HALF = REFERRAL_FEE / 2;
const REFERRAL_ANNUAL_BONUS = parseInt(process.env.REFERRAL_ANNUAL_BONUS || '150', 10);
const REFERRAL_ANNUAL_HALF = REFERRAL_ANNUAL_BONUS / 2;

export async function POST(req: NextRequest) {
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
        return new Response("Webhook secret not configured", { status: 500 });
    }

    // Must use req.text() — App Router auto-parses JSON which corrupts Stripe signature
    const rawBody = await req.text();
    const sig = req.headers.get("stripe-signature");

    if (!sig) {
        return new Response("Missing stripe-signature header", { status: 400 });
    }

    let event: Stripe.Event;
    try {
        event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!);
    } catch (err: any) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    // Process async — always return 200 quickly to prevent Stripe retries
    try {
        await processWebhookEvent(event);
    } catch (err) {
        console.error("Webhook processing error:", err);
        // Return 200 regardless — log separately. Non-200 causes Stripe to retry.
    }

    return new Response("OK", { status: 200 });
}

async function processWebhookEvent(event: Stripe.Event) {
    const isLive = event.livemode;

    switch (event.type) {

        // ── New subscription created via Checkout ──────────────────────────
        case "checkout.session.completed": {
            const session = event.data.object as Stripe.Checkout.Session;
            const userId = session.metadata?.userId;
            const customerId = session.customer as string;
            const subscriptionId = session.subscription as string;
            const referralCode = session.metadata?.referralCode;
            const isReferralSignup = session.metadata?.isReferralSignup === "true";

            if (!userId || !subscriptionId) break;

            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            const priceId = subscription.items.data[0].price.id;
            const tier = determineTierFromPrice(priceId);
            const billingInterval = subscription.items.data[0].price.recurring?.interval ?? "month";
            const email = session.customer_details?.email || null;

            // ── FAILSAFE: Prevent Orphaned Subscriptions ──
            const existingUserRes = await pool.query(
                `SELECT stripe_subscription_id FROM user_settings WHERE user_id = $1`,
                [userId]
            );
            const existingSubscriptionId = existingUserRes.rows[0]?.stripe_subscription_id;
            
            if (existingSubscriptionId && existingSubscriptionId !== subscriptionId) {
                console.log(`⚠️ User ${userId} completed new checkout session but already has subscription ${existingSubscriptionId}. Canceling orphaned subscription.`);
                try {
                    await stripe.subscriptions.cancel(existingSubscriptionId);
                } catch (cancelErr: any) {
                    if (cancelErr.code !== 'resource_missing') {
                        console.error(`Failed to cancel orphaned subscription ${existingSubscriptionId}:`, cancelErr);
                    }
                }
            }

            const sub = subscription as any;
            await pool.query(
                `INSERT INTO user_settings (
                    user_id, subscription_tier, stripe_customer_id, stripe_subscription_id, 
                    stripe_price_id, subscription_status, billing_interval, current_period_end, trial_end, livemode, updated_at, email, email_signal_alerts
                 ) VALUES ($10, $1, $2, $3, $4, $5, $6, to_timestamp($7), $8, $9, NOW(), $11, false)
                 ON CONFLICT (user_id) DO UPDATE 
                 SET subscription_tier = EXCLUDED.subscription_tier,
                     stripe_customer_id = EXCLUDED.stripe_customer_id,
                     stripe_subscription_id = EXCLUDED.stripe_subscription_id,
                     stripe_price_id = EXCLUDED.stripe_price_id,
                     subscription_status = EXCLUDED.subscription_status,
                     billing_interval = EXCLUDED.billing_interval,
                     current_period_end = EXCLUDED.current_period_end,
                     trial_end = EXCLUDED.trial_end,
                     livemode = EXCLUDED.livemode,
                     email = COALESCE(user_settings.email, EXCLUDED.email),
                     updated_at = EXCLUDED.updated_at`,
                [
                    tier,
                    customerId,
                    subscriptionId,
                    priceId,
                    subscription.status,
                    billingInterval,
                    sub.current_period_end,
                    sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
                    isLive,
                    userId,
                    email
                ]
            );

            // Record card fingerprint for trial abuse prevention
            await recordCardFingerprint(userId, customerId);

            // Store referral relationship if present
            if (referralCode) {
                const referrerUserId = await linkReferral(referralCode, userId, customerId);

                // ── Stage 1 (Signup): Extend REFERRER's subscription by REFERRAL_HALF ──────
                // The referee already received REFERRAL_HALF worth of bonus trial days
                // baked into their trial_period_days at checkout. Now we credit the referrer.
                if (referrerUserId && isReferralSignup) {
                    const refRecord = await pool.query(
                        `SELECT id FROM referrals WHERE referred_user_id = $1`, [userId]
                    );
                    const referralId = refRecord.rows[0]?.id;
                    if (referralId) {
                        await extendReferrerSubscription(
                            referrerUserId,
                            REFERRAL_HALF,
                            referralId,
                            `Referral Stage 1 (signup) — friend joined, referrer credited $${REFERRAL_HALF}`
                        );
                        await pool.query(
                            `UPDATE referrals SET signup_bonus_paid = true, updated_at = NOW() WHERE id = $1`,
                            [referralId]
                        );
                        await pool.query(
                            `INSERT INTO referral_activity (referral_id, event_type, credit_amount, description)
                             VALUES ($1, 'stage1_referrer', $2, $3)`,
                            [referralId, REFERRAL_HALF, `Stage 1: Referrer credited $${REFERRAL_HALF} in free days — friend signed up`]
                        );
                        console.log(`🎁 Stage 1 (signup): Referrer ${referrerUserId} extended by $${REFERRAL_HALF} worth of days`);
                    }
                }
            }

            console.log(`✅ User ${userId} subscribed to ${tier} (${subscription.status})`);
            break;
        }

        // ── Subscription updated (plan change, trial end, payment issue) ───
        case "customer.subscription.updated": {
            const subscription = event.data.object as Stripe.Subscription;
            const customerId = subscription.customer as string;
            const priceId = subscription.items.data[0].price.id;
            const billingInterval = subscription.items.data[0].price.recurring?.interval ?? "month";

            let tier = "observer";
            if (["active", "trialing", "past_due"].includes(subscription.status)) {
                tier = determineTierFromPrice(priceId);
            }

            const sub2 = subscription as any;
            await pool.query(
                `UPDATE user_settings
                 SET subscription_tier = $1,
                     stripe_subscription_id = $2,
                     stripe_price_id = $3,
                     subscription_status = $4,
                     billing_interval = $5,
                     current_period_end = to_timestamp($6),
                     trial_end = $7,
                     livemode = $8,
                     cancel_at_period_end = $10,
                     cancel_at = $11,
                     updated_at = NOW()
                 WHERE stripe_customer_id = $9`,
                [
                    tier,
                    subscription.id,
                    priceId,
                    subscription.status,
                    billingInterval,
                    sub2.current_period_end,
                    sub2.trial_end ? new Date(sub2.trial_end * 1000).toISOString() : null,
                    isLive,
                    customerId,
                    subscription.cancel_at_period_end,
                    subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : null,
                ]
            );
            
            // Auto-set free_features_limit based on new tier
            const newFreeLimit = tier === 'both_bundle' ? 2 : ['turbocore', 'turbocore_pro'].includes(tier) ? 1 : 0;
            await pool.query(
                `UPDATE user_settings SET free_features_limit = $1 WHERE stripe_customer_id = $2`,
                [newFreeLimit, customerId]
            );

            console.log(`🔄 Subscription updated for ${customerId}: ${tier} (${subscription.status}, cancel_at_period_end: ${subscription.cancel_at_period_end})`);
            break;
        }

        // ── Subscription cancelled ─────────────────────────────────────────
        case "customer.subscription.deleted": {
            const subscription = event.data.object as Stripe.Subscription;
            const customerId = subscription.customer as string;

            await pool.query(
                `UPDATE user_settings
                 SET subscription_tier = 'observer',
                     subscription_status = 'canceled',
                     cancel_at_period_end = false,
                     cancel_at = null,
                     updated_at = NOW()
                 WHERE stripe_customer_id = $1`,
                [customerId]
            );

            // Deactivate all AI feature subscriptions
            await pool.query(
                `UPDATE ai_feature_subscriptions SET status = 'canceled', updated_at = NOW()
                 WHERE user_id = (SELECT user_id FROM user_settings WHERE stripe_customer_id = $1)`,
                [customerId]
            );
            await pool.query(
                `UPDATE user_settings SET free_features_selected = 0, free_features_limit = 0
                 WHERE stripe_customer_id = $1`,
                [customerId]
            );

            console.log(`❌ Subscription canceled for ${customerId}`);
            break;
        }

        // ── Trial ending in 3 days — send reminder email ───────────────────
        case "customer.subscription.trial_will_end": {
            const subscription = event.data.object as Stripe.Subscription;
            const customerId = subscription.customer as string;
            console.log(`⏰ Trial ending soon for customer ${customerId}`);
            break;
        }

        // ── Invoice paid — trigger Stage 2 bilateral referral credits ──────
        case "invoice.payment_succeeded": {
            const invoice = event.data.object as Stripe.Invoice;
            await handleInvoicePaymentSucceeded(invoice);
            break;
        }

        // ── Invoice failed ─────────────────────────────────────────────────
        case "invoice.payment_failed": {
            const invoice = event.data.object as Stripe.Invoice;
            const customerId = invoice.customer as string;
            console.log(`💳 Payment failed for customer ${customerId}`);
            break;
        }

        // ── 3DS/SCA authentication required ───────────────────────────────
        case "invoice.payment_action_required": {
            const invoice = event.data.object as Stripe.Invoice;
            console.log(`🔐 Payment action required for invoice ${invoice.id}`);
            break;
        }

        // ── Invoice finalization failed ────────────────────────────────────
        case "invoice.finalization_failed": {
            const invoice = event.data.object as Stripe.Invoice;
            console.error(`🚨 Invoice finalization failed: ${invoice.id}. Manual intervention required.`);
            break;
        }

        default:
            break;
    }
}

// ── Stage 2: First real charge — bilateral credit for both parties ─────────
// 
// Referral credit model (REFERRAL_FEE env, default $100):
//   Stage 1 (signup): Referee gets bonus trial days + Referrer gets extension (handled in checkout.session.completed)
//   Stage 2 (first charge): BOTH get REFERRAL_HALF in free days (extension)
//   Annual bonus: BOTH get REFERRAL_ANNUAL_HALF in free days
//
// All credits applied as subscription extension days (credit_dollars / plan_daily_rate).
// Cash balance credits are NOT used — only day extensions.
//
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
    const customerId = invoice.customer as string;
    const billingReason = invoice.billing_reason;

    // Find if this customer is a referred user
    const referralResult = await pool.query(
        `SELECT r.*, 
                u.stripe_customer_id as referrer_stripe_id,
                u.card_fingerprint as referrer_fingerprint,
                u2.card_fingerprint as referred_fingerprint,
                u2.created_at as referred_created_at
         FROM referrals r
         JOIN user_settings u ON u.user_id = r.referrer_user_id
         JOIN user_settings u2 ON u2.user_id = r.referred_user_id
         WHERE r.referred_stripe_customer_id = $1`,
        [customerId]
    );
    if (!referralResult.rows.length) return;

    const ref = referralResult.rows[0];
    const referrerStripeId = ref.referrer_stripe_id;
    if (!referrerStripeId) return;

    const isFirstPayment = billingReason === "subscription_create";
    const isRenewal = billingReason === "subscription_cycle";

    const subscriptionId = (invoice as any).subscription as string;
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const isAnnual = subscription.items.data[0].price.recurring?.interval === "year";

    // ── Fraud Prevention ──────────────────────────────────────────────────
    if (ref.referrer_fingerprint && ref.referred_fingerprint && ref.referrer_fingerprint === ref.referred_fingerprint) {
        console.warn(`🚨 Fraud: shared card fingerprint between referrer and referee.`);
        await pool.query(
            `INSERT INTO referral_activity (referral_id, event_type, description)
             VALUES ($1, 'fraud_flagged', 'Reward denied: shared card fingerprint') ON CONFLICT DO NOTHING`,
            [ref.id]
        );
        return;
    }

    const msSinceSignup = Date.now() - new Date(ref.referred_created_at).getTime();
    const daysSinceSignup = msSinceSignup / (1000 * 60 * 60 * 24);
    if ((isFirstPayment || isRenewal) && daysSinceSignup < 7) {
        console.warn(`🚨 Fraud/Abuse: conversion less than 7 days after signup (${daysSinceSignup.toFixed(1)}d)`);
        await pool.query(
            `INSERT INTO referral_activity (referral_id, event_type, description)
             VALUES ($1, 'fraud_flagged', 'Reward denied: conversion < 7 days after signup') ON CONFLICT DO NOTHING`,
            [ref.id]
        );
        return;
    }

    // ── Stage 2: First real charge (trial → paid) ─────────────────────────
    // Triggers when stage1_paid=false at billing_reason=subscription_create.
    // Stage 1 (signup) was already paid via checkout.session.completed.
    if (!ref.stage1_paid && (isFirstPayment || isRenewal)) {
        const creditAmount = isAnnual ? REFERRAL_ANNUAL_HALF : REFERRAL_HALF;
        const label = isAnnual ? `Annual` : `Monthly`;

        // 1. Extend REFERRER's subscription
        await extendReferrerSubscription(
            ref.referrer_user_id,
            creditAmount,
            ref.id,
            `Stage 2 ${label} — friend's card charged, referrer credited $${creditAmount}`
        );
        await pool.query(
            `INSERT INTO referral_activity (referral_id, event_type, credit_amount, description)
             VALUES ($1, 'stage2_referrer', $2, $3)`,
            [ref.id, creditAmount, `Stage 2: Referrer credited $${creditAmount} in free days — friend's first charge`]
        );

        // 2. Extend REFEREE's subscription (bilateral)
        await extendReferrerSubscription(
            ref.referred_user_id,
            creditAmount,
            ref.id,
            `Stage 2 ${label} — referee credited $${creditAmount} for completing trial`
        );
        await pool.query(
            `INSERT INTO referral_activity (referral_id, event_type, credit_amount, description)
             VALUES ($1, 'stage2_referee', $2, $3)`,
            [ref.id, creditAmount, `Stage 2: Referee credited $${creditAmount} in free days — first charge completed`]
        );

        await pool.query(
            `UPDATE referrals SET stage1_paid = true, ${isAnnual ? 'annual_bonus_paid = true,' : ''} updated_at = NOW() WHERE id = $1`,
            [ref.id]
        );

        console.log(`💰 Stage 2 (first charge): Both referrer ${ref.referrer_user_id} and referee ${ref.referred_user_id} credited $${creditAmount} each (${label})`);
    }
}

// ── Card Fingerprint: Trial Abuse Prevention ───────────────────────────────
async function recordCardFingerprint(userId: string, stripeCustomerId: string) {
    try {
        const paymentMethods = await stripe.paymentMethods.list({
            customer: stripeCustomerId,
            type: "card",
        });
        const fingerprint = paymentMethods.data[0]?.card?.fingerprint;
        if (!fingerprint) return;

        const duplicate = await pool.query(
            `SELECT user_id FROM user_settings 
             WHERE card_fingerprint = $1 AND user_id != $2`,
            [fingerprint, userId]
        );
        if (duplicate.rows.length > 0) {
            console.warn(`⚠️ Duplicate card fingerprint: user ${userId} shares card with ${duplicate.rows[0].user_id}`);
        }

        await pool.query(
            `UPDATE user_settings
             SET has_had_trial = true, card_fingerprint = $1, updated_at = NOW()
             WHERE user_id = $2`,
            [fingerprint, userId]
        );
    } catch (err) {
        console.error("Failed to record card fingerprint:", err);
    }
}

// ── Referral relationship storage — returns referrerUserId if successfully linked ──
async function linkReferral(referralCode: string, referredUserId: string, referredCustomerId: string): Promise<string | null> {
    try {
        let referrerUserId = await resolvePromoCode(referralCode);
        if (!referrerUserId) {
            const check = await pool.query(`SELECT user_id FROM user_settings WHERE user_id = $1`, [referralCode]);
            referrerUserId = check.rows[0]?.user_id ?? null;
        }
        if (!referrerUserId || referrerUserId === referredUserId) return null;

        await pool.query(
            `INSERT INTO referrals (referrer_user_id, referred_user_id, referred_stripe_customer_id)
             VALUES ($1, $2, $3)
             ON CONFLICT (referred_user_id) DO UPDATE 
             SET referred_stripe_customer_id = COALESCE(referrals.referred_stripe_customer_id, EXCLUDED.referred_stripe_customer_id)`,
            [referrerUserId, referredUserId, referredCustomerId]
        );
        
        const newRef = await pool.query(`SELECT id FROM referrals WHERE referred_user_id = $1`, [referredUserId]);
        if (newRef.rows.length) {
            await pool.query(
                `INSERT INTO referral_activity (referral_id, event_type, description)
                 VALUES ($1, 'subscribed', 'Friend started trial — referral linked') ON CONFLICT DO NOTHING`,
                [newRef.rows[0].id]
            );
        }
        return referrerUserId;
    } catch (err) {
        console.error("Failed to link referral:", err);
        return null;
    }
}

// ── Tier mapping ───────────────────────────────────────────────────────────
function determineTierFromPrice(priceId: string): string {
    const prices: Record<string, string> = {
        [process.env.NEXT_PUBLIC_STRIPE_TURBOCORE_MONTHLY_PRICE_ID || ""]: "turbocore",
        [process.env.NEXT_PUBLIC_STRIPE_TURBOCORE_ANNUAL_PRICE_ID || ""]: "turbocore",
        [process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID || ""]: "turbocore_pro",
        [process.env.NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID || ""]: "turbocore_pro",
        [process.env.NEXT_PUBLIC_STRIPE_BUNDLE_MONTHLY_PRICE_ID || ""]: "both_bundle",
        [process.env.NEXT_PUBLIC_STRIPE_BUNDLE_ANNUAL_PRICE_ID || ""]: "both_bundle",
    };
    delete prices[""];
    return prices[priceId] || "observer";
}
