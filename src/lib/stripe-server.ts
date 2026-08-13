import Stripe from 'stripe';

/**
 * Lazily-instantiated server-side Stripe client.
 *
 * Several API routes previously did `new Stripe(process.env.STRIPE_SECRET_KEY!)`
 * at module top level. Next.js evaluates route modules while collecting page
 * data during `next build`, but the deploy workflow does not inject
 * STRIPE_SECRET_KEY at build time — so the build crashed with
 * "Neither apiKey nor config.authenticator provided". Instantiating on first
 * use (request time) avoids evaluating the secret during the build.
 */
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
    if (!_stripe) {
        _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
            apiVersion: '2025-01-27.acacia' as any,
        });
    }
    return _stripe;
}
