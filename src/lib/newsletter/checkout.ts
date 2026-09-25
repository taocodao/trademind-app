/**
 * Newsletter discount enforcement at checkout.
 *
 * Automatic match: the TradeMind account email is looked up against newsletter
 * subscribers; a matching subscriber in discount state 'eligible', inside the
 * 90-day window, gets the NEWSLETTER30 coupon applied to the annual session.
 *
 * Code fallback: the personal code shown on the confirmation page resolves to
 * a subscriber; the code only ever works for the account email that matches
 * that subscriber's primary email.
 */
import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe-server';
import { discountForEmail, recordNewsletterEvent } from './db';

export const NEWSLETTER_COUPON_ID = 'NEWSLETTER30';

let couponEnsured = false;
async function ensureCoupon(): Promise<void> {
    if (couponEnsured) return;
    const stripe = getStripe();
    try {
        await stripe.coupons.retrieve(NEWSLETTER_COUPON_ID);
    } catch {
        await stripe.coupons.create({
            id: NEWSLETTER_COUPON_ID,
            name: 'Newsletter subscriber offer',
            percent_off: 30,
            duration: 'once', // first invoice only; renewal bills at standard price
        });
    }
    couponEnsured = true;
}

export interface NewsletterDiscountCheck {
    eligible: boolean;
    subscriberId?: number;
    /** Set when a provided code was rejected so checkout can show the spec message. */
    error?: string;
}

export async function resolveNewsletterDiscount(input: {
    accountEmail: string | null;
    providedCode?: string | null;
}): Promise<NewsletterDiscountCheck> {
    const { accountEmail, providedCode } = input;

    if (!accountEmail) {
        if (providedCode) {
            return {
                eligible: false,
                error: 'This offer is tied to the email you confirmed for the newsletter. Log in with that email, or change your newsletter email first.',
            };
        }
        return { eligible: false };
    }

    const status = await discountForEmail(accountEmail);
    if (status.state !== 'eligible') {
        if (providedCode) {
            return {
                eligible: false,
                error: 'This offer is tied to the email you confirmed for the newsletter. Log in with that email, or change your newsletter email first.',
            };
        }
        return { eligible: false };
    }

    // Code fallback: when a code is supplied it must be THIS subscriber's code.
    if (providedCode && providedCode.trim().toUpperCase() !== status.code?.toUpperCase()) {
        return {
            eligible: false,
            error: 'This offer is tied to the email you confirmed for the newsletter. Log in with that email, or change your newsletter email first.',
        };
    }

    await recordNewsletterEvent('checkout_started_with_eligibility', {}, status.subscriberId);
    return { eligible: true, subscriberId: status.subscriberId };
}

/** Wire the coupon + redemption metadata into a checkout session payload. */
export async function applyNewsletterDiscount(
    sessionPayload: Stripe.Checkout.SessionCreateParams,
    subscriberId: number
): Promise<Stripe.Checkout.SessionCreateParams> {
    await ensureCoupon();
    sessionPayload.discounts = [{ coupon: NEWSLETTER_COUPON_ID }];
    sessionPayload.metadata = {
        ...(typeof sessionPayload.metadata === 'object' ? sessionPayload.metadata : {}),
        newsletter_subscriber_id: String(subscriberId),
        newsletter_discount: 'NEWSLETTER30',
    };
    await recordNewsletterEvent('discount_applied', { coupon: NEWSLETTER_COUPON_ID }, subscriberId);
    return sessionPayload;
}
