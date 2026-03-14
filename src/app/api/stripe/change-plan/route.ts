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
        const cookieStore = await cookies();
        const userId = cookieStore.get("privy-user-id")?.value;
        if (!userId) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        const { newPriceId, isUpgrade } = await req.json();
        if (!newPriceId) {
            return NextResponse.json({ error: "New price ID is required" }, { status: 400 });
        }

        // Fetch current subscription from DB
        const result = await pool.query(
            `SELECT stripe_subscription_id FROM user_settings WHERE user_id = $1`,
            [userId]
        );
        const subscriptionId = result.rows[0]?.stripe_subscription_id;
        if (!subscriptionId) {
            return NextResponse.json({ error: "No active subscription found" }, { status: 400 });
        }

        // Retrieve current subscription to get the ITEM ID (critical — must replace item, not add)
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const itemId = subscription.items.data[0].id;

        // Use always_invoice for upgrades (immediate charge + access)
        // Use create_prorations for downgrades (credit applied at next renewal)
        const proration_behavior = isUpgrade ? "always_invoice" : "create_prorations";

        const updated = await stripe.subscriptions.update(subscriptionId, {
            items: [{ id: itemId, price: newPriceId }],
            proration_behavior,
            payment_behavior: "pending_if_incomplete", // Don't change tier if payment fails
        });

        return NextResponse.json({
            success: true,
            status: updated.status,
            proration_behavior,
        });

    } catch (error: any) {
        console.error("Plan change error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to change plan" },
            { status: 500 }
        );
    }
}
