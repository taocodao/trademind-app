import { NextRequest } from "next/server";
import Stripe from "stripe";
import pool from "@/lib/db";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs'; // Required for raw body access in App Router

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-01-27.acacia" as any,
});

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

            if (!userId || !subscriptionId) break;

            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            const priceId = subscription.items.data[0].price.id;
            const tier = determineTierFromPrice(priceId);
            const billingInterval = subscription.items.data[0].price.recurring?.interval ?? "month";

            const sub = subscription as any;
            await pool.query(
                `UPDATE user_settings
                 SET subscription_tier = $1,
                     stripe_customer_id = $2,
                     stripe_subscription_id = $3,
                     stripe_price_id = $4,
                     subscription_status = $5,
                     billing_interval = $6,
                     current_period_end = to_timestamp($7),
                     trial_end = $8,
                     livemode = $9,
                     updated_at = NOW()
                 WHERE user_id = $10`,
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
                ]
            );

            // Record card fingerprint for trial abuse prevention
            await recordCardFingerprint(userId, customerId);

            // Store referral relationship if present
            if (referralCode) {
                await linkReferral(referralCode, userId, customerId);
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
                ]
            );
            console.log(`🔄 Subscription updated for ${customerId}: ${tier} (${subscription.status})`);
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
                     updated_at = NOW()
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
            // TODO: Trigger transactional email via Resend/SendGrid
            // "Your 14-day trial ends on [date]. You won't be charged until then."
            console.log(`⏰ Trial ending soon for customer ${customerId}`);
            break;
        }

        // ── Invoice paid — trigger referral credits ────────────────────────
        case "invoice.payment_succeeded": {
            const invoice = event.data.object as Stripe.Invoice;
            await handleInvoicePaymentSucceeded(invoice);
            break;
        }

        // ── Invoice failed — restrict access after grace period ───────────
        case "invoice.payment_failed": {
            const invoice = event.data.object as Stripe.Invoice;
            const customerId = invoice.customer as string;
            console.log(`💳 Payment failed for customer ${customerId}`);
            // Stripe Smart Retries will handle automatic reattempts.
            // subscription.status changes to 'past_due' which customer.subscription.updated already handles.
            break;
        }

        // ── 3DS/SCA authentication required ───────────────────────────────
        case "invoice.payment_action_required": {
            const invoice = event.data.object as Stripe.Invoice;
            // TODO: Email user the hosted_invoice_url so they can authenticate
            console.log(`🔐 Payment action required for invoice ${invoice.id}`);
            break;
        }

        // ── Invoice finalization failed — critical, subscription stays active ─
        case "invoice.finalization_failed": {
            const invoice = event.data.object as Stripe.Invoice;
            console.error(`🚨 Invoice finalization failed: ${invoice.id}. Manual intervention required.`);
            break;
        }

        default:
            // Unhandled event type — safe to ignore
            break;
    }
}

// ── Referral Credit Logic ──────────────────────────────────────────────────
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
    const customerId = invoice.customer as string;
    const billingReason = invoice.billing_reason;

    // Find if this customer is a referred user
    const referralResult = await pool.query(
        `SELECT r.*, u.stripe_customer_id as referrer_stripe_id
         FROM referrals r
         JOIN user_settings u ON u.user_id = r.referrer_user_id
         WHERE r.referred_stripe_customer_id = $1`,
        [customerId]
    );
    if (!referralResult.rows.length) return;

    const ref = referralResult.rows[0];
    const referrerStripeId = ref.referrer_stripe_id;
    if (!referrerStripeId) return;

    const isFirstPayment = billingReason === "subscription_create";
    const isRenewal = billingReason === "subscription_cycle";

    // Determine if this is an annual plan (for the $150 bonus)
    const subscriptionId = (invoice as any).subscription as string;
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const isAnnual = subscription.items.data[0].price.recurring?.interval === "year";

    // Stage 1: First payment
    if (!ref.stage1_paid && (isFirstPayment || isRenewal)) {
        if (isAnnual && !ref.annual_bonus_paid) {
            // Annual plan: $150 instant credit
            await stripe.customers.createBalanceTransaction(referrerStripeId, {
                amount: -15000, // Negative = credit in cents
                currency: "usd",
                description: "Referral bonus — friend joined annual plan ($150)",
                metadata: { referral_stage: "annual_bonus", referred_customer: customerId },
            });
            await pool.query(
                `UPDATE referrals SET stage1_paid=true, annual_bonus_paid=true, updated_at=NOW() WHERE id=$1`,
                [ref.id]
            );
            console.log(`💰 $150 annual referral bonus issued to ${referrerStripeId}`);
        } else if (!ref.stage1_paid) {
            // Monthly plan: $50 stage 1
            await stripe.customers.createBalanceTransaction(referrerStripeId, {
                amount: -5000,
                currency: "usd",
                description: "Referral credit — Stage 1 ($50)",
                metadata: { referral_stage: "1", referred_customer: customerId },
            });
            await pool.query(
                `UPDATE referrals SET stage1_paid=true, updated_at=NOW() WHERE id=$1`,
                [ref.id]
            );
            console.log(`💰 $50 referral Stage 1 issued to ${referrerStripeId}`);
        }
    }

    // Stage 2: Second renewal (monthly only, stage1 already paid, no annual bonus)
    else if (ref.stage1_paid && !ref.stage2_paid && !ref.annual_bonus_paid && isRenewal) {
        await stripe.customers.createBalanceTransaction(referrerStripeId, {
            amount: -5000,
            currency: "usd",
            description: "Referral credit — Stage 2 ($50)",
            metadata: { referral_stage: "2", referred_customer: customerId },
        });
        await pool.query(
            `UPDATE referrals SET stage2_paid=true, updated_at=NOW() WHERE id=$1`,
            [ref.id]
        );
        console.log(`💰 $50 referral Stage 2 issued to ${referrerStripeId}`);
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

        // Check if this card is used on another account
        const duplicate = await pool.query(
            `SELECT user_id FROM user_settings 
             WHERE card_fingerprint = $1 AND user_id != $2`,
            [fingerprint, userId]
        );
        if (duplicate.rows.length > 0) {
            console.warn(`⚠️ Duplicate card fingerprint detected: user ${userId} shares card with ${duplicate.rows[0].user_id}`);
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

// ── Referral relationship storage ─────────────────────────────────────────
async function linkReferral(referralCode: string, referredUserId: string, referredCustomerId: string) {
    try {
        // referralCode is the referrer's user_id
        await pool.query(
            `INSERT INTO referrals (referrer_user_id, referred_user_id, referred_stripe_customer_id)
             VALUES ($1, $2, $3)
             ON CONFLICT DO NOTHING`,
            [referralCode, referredUserId, referredCustomerId]
        );
    } catch (err) {
        console.error("Failed to link referral:", err);
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
