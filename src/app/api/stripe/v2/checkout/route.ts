import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe-server';
import { query } from '@/lib/db';
import { EMAIL_RE } from '@/lib/stripe-prices';
import {
    isPricingV2Enabled, stripePriceIdV2, SUBSCRIBER_COUPON_ENV, SUBSCRIBER_DISCOUNT_PCT,
    type IntervalV2, type ProductV2,
} from '@/lib/pricing-v2';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const COUPON_FALLBACK_ID = 'SUBSCRIBER30_CONTINUING';

/** The continuing 30% subscriber coupon (percent off, lasts as long as the subscription). */
async function subscriberCouponId(): Promise<string> {
    const configured = process.env[SUBSCRIBER_COUPON_ENV];
    if (configured) return configured;
    const stripe = getStripe();
    try {
        await stripe.coupons.retrieve(COUPON_FALLBACK_ID);
    } catch {
        await stripe.coupons.create({ id: COUPON_FALLBACK_ID, name: 'Newsletter subscriber price', percent_off: SUBSCRIBER_DISCOUNT_PCT, duration: 'forever' });
    }
    return COUPON_FALLBACK_ID;
}

async function isConfirmedSubscriber(email: string): Promise<boolean> {
    try {
        const r = await query(`SELECT 1 FROM newsletter_subscribers WHERE lower(email) = lower($1) AND status = 'confirmed' LIMIT 1`, [email]);
        return r.rows.length > 0;
    } catch { return false; }
}

/**
 * Pricing v2 pay-first checkout (monthly or annual; Defensive, LEAPS or Both strategies). Off (404) unless
 * PRICING_V2_ENABLED=true. The 30% subscriber price is a Stripe coupon applied only when the checkout email is a
 * confirmed newsletter subscriber. The session is provisioned by the same claim, confirm and webhook paths as v1.
 */
export async function POST(req: NextRequest) {
    if (!isPricingV2Enabled()) return NextResponse.json({ error: 'Not available' }, { status: 404 });
    try {
        if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: 'Stripe configuration error' }, { status: 500 });
        const body = await req.json().catch(() => ({}));
        const product = (['defensive', 'leaps', 'both'] as const).find((p) => p === body.product) as ProductV2 | undefined;
        const interval = (['month', 'year'] as const).find((i) => i === body.interval) as IntervalV2 | undefined;
        const email = typeof body.email === 'string' ? body.email.trim() : '';
        if (!product || !interval) return NextResponse.json({ error: 'Choose a plan and a billing period.' }, { status: 400 });
        if (!EMAIL_RE.test(email) || email.length > 200) return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });

        const priceId = stripePriceIdV2(product, interval);
        if (!priceId) return NextResponse.json({ error: 'Stripe price is not configured' }, { status: 500 });

        const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'https://trademind.bot';
        const subscriber = await isConfirmedSubscriber(email);
        const metadata: Record<string, string> = {
            guest: '1', guest_email: email.toLowerCase(), v2: '1', product, interval, plan: product,
            subscriber_price: subscriber ? '1' : '0',
        };
        const session = await getStripe().checkout.sessions.create({
            mode: 'subscription',
            payment_method_types: ['card'],
            customer_email: email,
            billing_address_collection: 'auto',
            line_items: [{ price: priceId, quantity: 1 }],
            ...(subscriber ? { discounts: [{ coupon: await subscriberCouponId() }] } : {}),
            success_url: `${origin}/welcome?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/plans?email=${encodeURIComponent(email)}`,
            metadata,
            subscription_data: { metadata },
        });
        return NextResponse.json({ url: session.url, subscriberPrice: subscriber });
    } catch (error: unknown) {
        console.error('Checkout v2 error:', error);
        return NextResponse.json({ error: 'Unable to start checkout. Please try again.' }, { status: 500 });
    }
}
