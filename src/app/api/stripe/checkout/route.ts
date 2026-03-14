import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import Stripe from "stripe";
import pool from "@/lib/db";

export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-01-27.acacia" as any,
});

export async function POST(req: NextRequest) {
    try {
        if (!process.env.STRIPE_SECRET_KEY) {
            return NextResponse.json({ error: "Stripe configuration error" }, { status: 500 });
        }

        const cookieStore = await cookies();
        const userId = cookieStore.get("privy-user-id")?.value;
        if (!userId) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        const { priceId, isAnnual, referralCode } = await req.json();
        if (!priceId) {
            return NextResponse.json({ error: "Price ID is required" }, { status: 400 });
        }

        const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

        // ── Fetch or create Stripe customer keyed to Privy DID ──────────────
        const userResult = await pool.query(
            `SELECT stripe_customer_id, has_had_trial FROM user_settings WHERE user_id = $1`,
            [userId]
        );
        let customerId: string | undefined = userResult.rows[0]?.stripe_customer_id;
        const hasHadTrial: boolean = userResult.rows[0]?.has_had_trial ?? false;

        if (!customerId) {
            // Create Stripe customer and store DID in metadata (per guide Section Privy ↔ Stripe)
            const customer = await stripe.customers.create({
                metadata: { privy_did: userId },
            });
            customerId = customer.id;

            await pool.query(
                `INSERT INTO user_settings (user_id, stripe_customer_id)
                 VALUES ($1, $2)
                 ON CONFLICT (user_id) DO UPDATE SET stripe_customer_id = $2, updated_at = NOW()`,
                [userId, customerId]
            );
        }

        // ── Build Checkout Session ───────────────────────────────────────────
        // Klarna supported on annual subscriptions; Afterpay NOT supported (no recurring)
        const annualPriceIds = [
            process.env.NEXT_PUBLIC_STRIPE_TURBOCORE_ANNUAL_PRICE_ID,
            process.env.NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID,
            process.env.NEXT_PUBLIC_STRIPE_BUNDLE_ANNUAL_PRICE_ID,
        ].filter(Boolean);

        const paymentMethods: Stripe.Checkout.SessionCreateParams.PaymentMethodType[] = ["card"];
        if (isAnnual && annualPriceIds.includes(priceId)) {
            paymentMethods.push("klarna"); // Klarna only — Afterpay doesn't support recurring
        }

        const sessionPayload: Stripe.Checkout.SessionCreateParams = {
            customer: customerId,
            payment_method_types: paymentMethods,
            payment_method_collection: "always", // Require card even during trial
            mode: "subscription",
            billing_address_collection: "auto",
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: `${origin}/dashboard?checkout_success=true&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/settings?checkout_canceled=true`,
            metadata: {
                userId,          // For webhook → link account
                referralCode: referralCode || "",
            },
            // ── Trial: session-level (not price-level) to allow abuse prevention ──
            ...(!hasHadTrial ? {
                subscription_data: {
                    trial_period_days: 14,
                    trial_settings: {
                        end_behavior: { missing_payment_method: "cancel" as const },
                    },
                    metadata: { privy_did: userId },
                },
            } : {}),
        };

        // Pass referral client_reference_id for Rewardful tracking
        if (referralCode) {
            sessionPayload.client_reference_id = referralCode;
        }

        const session = await stripe.checkout.sessions.create(sessionPayload);
        return NextResponse.json({ url: session.url });

    } catch (error: any) {
        console.error("Stripe Checkout Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to create checkout session" },
            { status: 500 }
        );
    }
}
