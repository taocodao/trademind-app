import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import Stripe from "stripe";
import pool from "@/lib/db";

// Ensure Stripe key is available
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
const stripe = new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: "2025-01-27.acacia" as any,
});

export async function POST(req: NextRequest) {
    try {
        if (!STRIPE_SECRET_KEY) {
            console.error("Missing STRIPE_SECRET_KEY");
            return NextResponse.json({ error: "Stripe configuration error" }, { status: 500 });
        }

        const cookieStore = await cookies();
        const userId = cookieStore.get("privy-user-id")?.value;

        if (!userId) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        const { priceId, isAnnual } = await req.json();

        if (!priceId) {
            return NextResponse.json({ error: "Price ID is required" }, { status: 400 });
        }

        // Fetch user from DB to see if they already have a Stripe ID
        const result = await pool.query(
            `SELECT stripe_customer_id FROM user_settings WHERE user_id = $1`,
            [userId]
        );
        let customerId = result.rows[0]?.stripe_customer_id;

        const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

        // Generate the Stripe Checkout Session
        const sessionPayload: Stripe.Checkout.SessionCreateParams = {
            payment_method_types: ["card"],
            mode: "subscription",
            billing_address_collection: "auto",
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            success_url: `${origin}/dashboard?checkout_success=true&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/dashboard?checkout_canceled=true`,
            metadata: {
                userId: userId, // Pass to webhook to link account
            },
        };

        // Allow Afterpay/Klarna for the $399 Annual Compounder tier to improve conversion
        if (isAnnual && priceId === process.env.NEXT_PUBLIC_STRIPE_COMPOUNDER_ANNUAL_PRICE_ID) {
            // Include Affirm/Afterpay if supported dynamically by Stripe
            sessionPayload.payment_method_types = ["card", "afterpay_clearpay", "klarna"];
        }

        if (customerId) {
            sessionPayload.customer = customerId;
        } else {
            // Customer doesn't exist yet, we will create one during checkout
            sessionPayload.customer_email = undefined;
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
