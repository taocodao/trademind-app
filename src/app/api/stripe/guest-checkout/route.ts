import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe-server';
import { ensureStripeProductCopy } from '@/lib/stripe-provision';
import { resolveNewsletterDiscount } from '@/lib/newsletter/checkout';
import { stripePriceIdForPlan, EMAIL_RE } from '@/lib/stripe-prices';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Pay first, sign in after. Creates a Checkout Session for a plan and an email address, with no login
 * required. The email is fixed on the payment page and becomes the login: after payment the buyer is sent
 * to /welcome, signs in with that same email, and the account is created for that login (see /api/stripe/claim).
 */
export async function POST(req: NextRequest) {
    try {
        if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: 'Stripe configuration error' }, { status: 500 });
        const body = await req.json().catch(() => ({}));
        const plan = body.plan === 'basic' || body.plan === 'leaps' ? (body.plan as 'basic' | 'leaps') : null;
        const email = typeof body.email === 'string' ? body.email.trim() : '';
        if (!plan) return NextResponse.json({ error: 'Choose a plan.' }, { status: 400 });
        if (!EMAIL_RE.test(email) || email.length > 200) return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });

        const priceId = stripePriceIdForPlan(plan);
        if (!priceId) return NextResponse.json({ error: 'Stripe price is not configured' }, { status: 500 });
        await ensureStripeProductCopy(plan, priceId);

        const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'https://trademind.bot';
        const metadata: Record<string, string> = { guest: '1', guest_email: email.toLowerCase(), plan, auto_create: '1' };

        // The charged price already is the newsletter subscriber price. Eligibility is recorded for attribution only.
        try {
            const nl = await resolveNewsletterDiscount({ accountEmail: email, providedCode: null });
            if (nl.eligible && nl.subscriberId) {
                metadata.newsletter_subscriber_id = String(nl.subscriberId);
                metadata.newsletter_discount = 'NEWSLETTER30';
            }
        } catch { /* attribution only */ }

        const session = await getStripe().checkout.sessions.create({
            mode: 'subscription',
            payment_method_types: ['card'],
            customer_email: email,
            billing_address_collection: 'auto',
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: `${origin}/welcome?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/plans?email=${encodeURIComponent(email)}`,
            metadata,
            subscription_data: { metadata },
        });
        return NextResponse.json({ url: session.url });
    } catch (error: unknown) {
        console.error('Guest checkout error:', error);
        return NextResponse.json({ error: 'Unable to start checkout. Please try again.' }, { status: 500 });
    }
}
