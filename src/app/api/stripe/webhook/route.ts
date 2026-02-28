import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import pool from "@/lib/db";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";

const stripe = new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: "2025-01-27.acacia" as any,
});

export async function POST(req: Request) {
    if (!STRIPE_WEBHOOK_SECRET) {
        return new NextResponse("Webhook secret not configured", { status: 500 });
    }

    const body = await req.text();
    const headersList = await headers();
    const signature = headersList.get("stripe-signature") as string;

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            STRIPE_WEBHOOK_SECRET
        );
    } catch (err: any) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
    }

    try {
        switch (event.type) {
            case "checkout.session.completed": {
                const session = event.data.object as Stripe.Checkout.Session;

                // Retrieve the userId passed from our checkout route
                const userId = session.metadata?.userId;
                const customerId = session.customer as string;
                const subscriptionId = session.subscription as string;

                if (!userId) {
                    console.error("No userId found in session metadata");
                    break;
                }

                // If this was a subscription checkout, retrieve it to check the price ID
                if (subscriptionId) {
                    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
                    const priceId = subscription.items.data[0].price.id;
                    const tier = determineTierFromPrice(priceId);

                    // Update Vercel Postgres
                    await pool.query(
                        `UPDATE user_settings 
                         SET subscription_tier = $1, 
                             stripe_customer_id = $2, 
                             stripe_subscription_id = $3,
                             updated_at = NOW()
                         WHERE user_id = $4`,
                        [tier, customerId, subscriptionId, userId]
                    );

                    console.log(`Successfully upgraded user ${userId} to ${tier}`);

                    // ─── REWARDFUL AFFILIATE TRACKING ───
                    // If a client_reference_id exists (from Rewardful's script during checkout), ping them.
                    const rewardfulId = session.client_reference_id;
                    if (rewardfulId && process.env.REWARDFUL_API_KEY) {
                        try {
                            const rewardfulAuth = Buffer.from(process.env.REWARDFUL_API_KEY + ":").toString("base64");
                            const rewardfulResponse = await fetch('https://api.getrewardful.com/v1/customers', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Basic ${rewardfulAuth}`
                                },
                                body: JSON.stringify({
                                    id: customerId, // Stripe customer ID
                                    email: session.customer_details?.email,
                                    stripe_customer_id: customerId
                                })
                            });

                            if (!rewardfulResponse.ok) {
                                console.error(`Rewardful Error: ${await rewardfulResponse.text()}`);
                            } else {
                                console.log(`Rewardful customer created for Stripe customer: ${customerId}`);
                            }
                        } catch (rewardError) {
                            console.error('Failed to notify Rewardful API:', rewardError);
                        }
                    }
                }
                break;
            }

            case "customer.subscription.updated": {
                const subscription = event.data.object as Stripe.Subscription;
                const customerId = subscription.customer as string;
                const priceId = subscription.items.data[0].price.id;

                // If subscription is active or past_due, evaluate tier
                // If incomplete_expired, canceled, or unpaid, downgrade to observer
                let tier = "observer";
                if (["active", "trialing", "past_due"].includes(subscription.status)) {
                    tier = determineTierFromPrice(priceId);
                }

                await pool.query(
                    `UPDATE user_settings 
                     SET subscription_tier = $1, 
                         stripe_subscription_id = $2,
                         updated_at = NOW()
                     WHERE stripe_customer_id = $3`,
                    [tier, subscription.id, customerId]
                );

                console.log(`Subscription updated for customer ${customerId}. New tier: ${tier} (${subscription.status})`);
                break;
            }

            case "customer.subscription.deleted": {
                const subscription = event.data.object as Stripe.Subscription;
                const customerId = subscription.customer as string;

                // Downgrade to observer
                await pool.query(
                    `UPDATE user_settings 
                     SET subscription_tier = 'observer', 
                         updated_at = NOW()
                     WHERE stripe_customer_id = $1`,
                    [customerId]
                );

                console.log(`Subscription canceled for customer ${customerId}. Downgraded to observer.`);
                break;
            }
        }

        return new NextResponse("Webhook processed successfully", { status: 200 });
    } catch (err: any) {
        console.error("Webhook processing failed:", err);
        return new NextResponse(`Webhook Processing Error: ${err.message}`, { status: 500 });
    }
}

// Map Stripe Price IDs to our internal DB string tiers
function determineTierFromPrice(priceId: string): string {
    const prices = {
        [process.env.NEXT_PUBLIC_STRIPE_BUILDER_PRICE_ID || ""]: "builder",
        [process.env.NEXT_PUBLIC_STRIPE_COMPOUNDER_MONTHLY_PRICE_ID || ""]: "compounder",
        [process.env.NEXT_PUBLIC_STRIPE_COMPOUNDER_ANNUAL_PRICE_ID || ""]: "compounder",
        [process.env.NEXT_PUBLIC_STRIPE_FAMILY_BUNDLE_PRICE_ID || ""]: "compounder_family"
    };

    return prices[priceId] || "observer";
}
