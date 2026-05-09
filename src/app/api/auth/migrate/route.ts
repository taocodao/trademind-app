/**
 * Magic Link Redemption Route
 * ============================
 * GET /api/auth/migrate?token=<jwt>
 *
 * Validates the migration token and redirects directly to a
 * Stripe Checkout Session — no Privy login required before payment.
 *
 * Flow:
 *   1. Validate JWT token (signature + expiry + single-use DB check)
 *   2. Consume token immediately (prevents replay)
 *   3. Look up or create Stripe Customer for the user's email
 *   4. Create Stripe Checkout Session (Bundle plan, trial credit applied)
 *   5. Redirect to session.url — user lands directly on payment form
 *
 * The existing checkout.session.completed webhook handles DB activation
 * via metadata.userId — no additional webhook code needed.
 *
 * Graceful fallback: if Stripe session creation fails, redirect to
 * /upgrade?from=trial&ref=whop (original manual flow).
 *
 * Token is single-use — consumed immediately on first redemption.
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { validateMigrationToken, consumeMigrationToken } from '@/lib/migration';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-01-27.acacia' as any,
});

export async function GET(req: NextRequest): Promise<NextResponse> {
    const token   = req.nextUrl.searchParams.get('token');
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://trademind.bot';

    if (!token) {
        return NextResponse.redirect(`${baseUrl}/login?error=missing_token`);
    }

    // ── 1. Validate JWT signature, expiry, and DB record ─────────────────────
    const payload = await validateMigrationToken(token);
    if (!payload) {
        return NextResponse.redirect(`${baseUrl}/login?error=invalid_token`);
    }

    // ── 2. Consume token immediately (single-use) ─────────────────────────────
    await consumeMigrationToken(token);

    // ── 3. Look up the pre-provisioned user ───────────────────────────────────
    const userResult = await query(
        `SELECT user_id, email, stripe_customer_id
         FROM user_settings
         WHERE email = $1 OR whop_user_id = $2
         LIMIT 1`,
        [payload.email, payload.whop_user_id]
    );
    const user = userResult.rows[0];

    if (!user) {
        // User record doesn't exist — redirect to signup with email pre-filled
        const signupUrl = new URL(`${baseUrl}/signup`);
        signupUrl.searchParams.set('email', payload.email);
        signupUrl.searchParams.set('ref', 'whop');
        return NextResponse.redirect(signupUrl.toString());
    }

    // ── Mark whop_trials migration timestamp (idempotent) ────────────────────
    await query(
        `UPDATE whop_trials
         SET migration_sent_at = COALESCE(migration_sent_at, NOW())
         WHERE whop_user_id = $1`,
        [payload.whop_user_id]
    ).catch(() => {});

    // ── 4. Create Stripe Checkout Session ─────────────────────────────────────
    // User is sent directly to Stripe's hosted payment form — no Privy login needed.
    // The existing checkout.session.completed webhook activates their subscription
    // via metadata.userId (same key used by /api/stripe/checkout route).
    try {
        // Retrieve or create Stripe Customer keyed to this email
        let customerId: string | undefined = user.stripe_customer_id ?? undefined;

        if (!customerId) {
            const existing = await stripe.customers.list({ email: payload.email, limit: 1 });
            if (existing.data.length > 0) {
                customerId = existing.data[0].id;
            } else {
                const newCustomer = await stripe.customers.create({
                    email:    payload.email,
                    metadata: {
                        whop_user_id:     payload.whop_user_id,
                        trademind_userId: user.user_id,
                    },
                });
                customerId = newCustomer.id;
            }

            // Persist Stripe customer ID so future checkouts reuse it
            await query(
                `UPDATE user_settings
                 SET stripe_customer_id = COALESCE(stripe_customer_id, $1), updated_at = NOW()
                 WHERE user_id = $2`,
                [customerId, user.user_id]
            ).catch(() => {});
        }

        const bundlePriceId = process.env.NEXT_PUBLIC_STRIPE_BUNDLE_MONTHLY_PRICE_ID!;

        const sessionParams: Stripe.Checkout.SessionCreateParams = {
            customer:                 customerId,
            payment_method_types:     ['card'],
            payment_method_collection: 'always',
            mode:                     'subscription',
            billing_address_collection: 'auto',
            line_items: [{ price: bundlePriceId, quantity: 1 }],
            // userId in metadata activates the subscription via the existing
            // checkout.session.completed webhook handler (stripe/webhook/route.ts)
            metadata: {
                userId:           user.user_id,
                fromWhopTrial:    'true',
                whop_user_id:     payload.whop_user_id,
                referralCode:     '',
                isReferralSignup: '',
            },
            client_reference_id: user.user_id,
            // After payment: redirect to dashboard with welcome flag
            success_url: `${baseUrl}/dashboard?welcome=true&from=whop&checkout_success=true`,
            // If user cancels/backs out: fall through to the manual upgrade page
            cancel_url:  `${baseUrl}/upgrade?from=trial&ref=whop&user=${user.user_id}`,
            // Allow user to switch to a cheaper plan tier or apply a promo code
            allow_promotion_codes: true,
        };

        // Apply $15 trial credit coupon if configured in env vars
        // Create this coupon in Stripe Dashboard → Coupons → WHOP_TRIAL_CREDIT
        // Settings: $15 off, once, applies to first invoice only
        const couponId = process.env.WHOP_TRIAL_CREDIT_COUPON_ID;
        if (couponId) {
            sessionParams.discounts = [{ coupon: couponId }];
            // Note: allow_promotion_codes is incompatible with discounts[] — remove it
            delete (sessionParams as any).allow_promotion_codes;
        }

        const session = await stripe.checkout.sessions.create(sessionParams);

        console.log(`[Migration] ✅ Stripe Checkout Session created for ${payload.email}`);
        return NextResponse.redirect(session.url!);

    } catch (stripeErr: any) {
        // Non-fatal — Stripe may be misconfigured or temporarily unavailable.
        // Fall through to the manual /upgrade page (original behaviour).
        console.warn('[Migration] Stripe Checkout Session failed (falling back to /upgrade):', stripeErr.message);
    }

    // ── 5. Fallback: redirect to /upgrade page (manual flow) ─────────────────
    // User must log in via Privy on the /upgrade page before subscribing.
    // The page detects ?from=trial&ref=whop and shows the migration banner.
    const upgradeUrl = new URL(`${baseUrl}/upgrade`);
    upgradeUrl.searchParams.set('from',  'trial');
    upgradeUrl.searchParams.set('ref',   'whop');
    upgradeUrl.searchParams.set('user',  user.user_id);

    console.log(`[Migration] Fallback: redirecting ${payload.email} to /upgrade`);
    return NextResponse.redirect(upgradeUrl.toString());
}
