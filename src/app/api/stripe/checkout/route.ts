import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import Stripe from "stripe";
import pool from "@/lib/db";

export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-01-27.acacia" as any,
});

/** Extract user ID from either the Privy session cookie (server-side) or a Bearer JWT (client-side fallback). */
async function getUserId(req: NextRequest): Promise<string | null> {
    // 1. Try the Privy session cookie (standard flow)
    const cookieStore = await cookies();
    const cookieUserId = cookieStore.get("privy-user-id")?.value;
    if (cookieUserId) return cookieUserId;

    // 2. Fall back to Bearer token (sent by client immediately after login)
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.slice(7);
        try {
            // Privy JWT payload is base64-encoded — the `sub` claim is the user DID
            const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
            const sub: string = payload?.sub || payload?.privy_did || "";
            if (sub) return sub;
        } catch {
            // malformed token — fall through to 401
        }
    }
    return null;
}

export async function POST(req: NextRequest) {
    try {
        if (!process.env.STRIPE_SECRET_KEY) {
            return NextResponse.json({ error: "Stripe configuration error" }, { status: 500 });
        }

        const userId = await getUserId(req);
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
            `SELECT stripe_customer_id, has_had_trial,
                    app_trial_started_at, app_trial_2_started_at
             FROM user_settings WHERE user_id = $1`,
            [userId]
        );
        let customerId: string | undefined = userResult.rows[0]?.stripe_customer_id;

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

        // ── Calculate Remaining Trial Days ──────────────────────────────────
        let remainingTrialDays = 0;
        const row = userResult.rows[0];
        if (row) {
            const FREE_TRIAL_DAYS = parseInt(process.env.FREE_TRIAL_DAYS || '14', 10);
            const trial1Start = row.app_trial_started_at ? new Date(row.app_trial_started_at) : null;
            const trial2Start = row.app_trial_2_started_at ? new Date(row.app_trial_2_started_at) : null;
            const activeTrial = trial2Start ?? trial1Start;
            
            if (activeTrial) {
                const now = new Date();
                const trialEndDate = new Date(activeTrial.getTime() + FREE_TRIAL_DAYS * 24 * 60 * 60 * 1000);
                if (now < trialEndDate) {
                    remainingTrialDays = Math.max(1, Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
                }
            }
        }

        // ── Build Checkout Session ───────────────────────────────────────────
        // Klarna supported on annual subscriptions; Afterpay NOT supported (no recurring)
        const annualPriceIds = [
            process.env.NEXT_PUBLIC_STRIPE_TURBOCORE_ANNUAL_PRICE_ID,
            process.env.NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID,
            process.env.NEXT_PUBLIC_STRIPE_BUNDLE_ANNUAL_PRICE_ID,
        ].filter(Boolean);

        const paymentMethods: Stripe.Checkout.SessionCreateParams.PaymentMethodType[] = ["card"];
        // Klarna requires an immediate payment, incompatible with `trial_period_days`
        if (isAnnual && annualPriceIds.includes(priceId) && remainingTrialDays === 0) {
            paymentMethods.push("klarna"); 
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
        };

        if (remainingTrialDays > 0) {
            sessionPayload.subscription_data = {
                trial_period_days: remainingTrialDays
            };
        }

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
