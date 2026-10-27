/**
 * Pricing v2 catalog (monthly and annual, with a continuing 30% subscriber price).
 *
 * Off unless PRICING_V2_ENABLED=true. Nothing imports this yet except tests, so today's
 * checkout (annual only, $252 and $336) is unchanged.
 *
 * Products: Defensive (1 account), LEAPS (1 account), Both (1 Defensive account + 1 LEAPS account).
 * Standard monthly $30 / $40 / $60. Annual is ten monthly payments. The subscriber price is 30% off
 * the matching standard price, applied as one Stripe percent-off coupon that lasts as long as the
 * subscription, so Stripe only needs six base prices and one coupon.
 * One login may hold many accounts. Each extra account is another purchase at the same price.
 */
export type ProductV2 = 'defensive' | 'leaps' | 'both';
export type IntervalV2 = 'month' | 'year';

export const SUBSCRIBER_DISCOUNT_PCT = 30;
export const ANNUAL_PAID_MONTHS = 10;

export const STANDARD_MONTHLY_CENTS: Record<ProductV2, number> = {
    defensive: 3000,
    leaps: 4000,
    both: 6000,
};

export const PRODUCT_LABEL: Record<ProductV2, string> = {
    defensive: 'QQQ Defensive',
    leaps: 'QQQ LEAPS',
    both: 'Both strategies',
};

/** Strategy accounts each product includes (membership plan names used by account_memberships). */
export const PRODUCT_ACCOUNTS: Record<ProductV2, ('basic' | 'leaps')[]> = {
    defensive: ['basic'],
    leaps: ['leaps'],
    both: ['basic', 'leaps'],
};

export function isPricingV2Enabled(): boolean {
    return process.env.PRICING_V2_ENABLED === 'true';
}

/** Standard (non subscriber) amount in cents for one billing period. */
export function standardCents(product: ProductV2, interval: IntervalV2): number {
    const m = STANDARD_MONTHLY_CENTS[product];
    return interval === 'month' ? m : m * ANNUAL_PAID_MONTHS;
}

/** Amount in cents after the continuing 30% subscriber discount, rounded to the nearest cent. */
export function subscriberCents(product: ProductV2, interval: IntervalV2): number {
    return Math.round(standardCents(product, interval) * (100 - SUBSCRIBER_DISCOUNT_PCT) / 100);
}

export function priceCents(product: ProductV2, interval: IntervalV2, subscriber: boolean): number {
    return subscriber ? subscriberCents(product, interval) : standardCents(product, interval);
}

/** Names of the environment variables that hold the six Stripe base price ids. */
export function priceEnvKey(product: ProductV2, interval: IntervalV2): string {
    return `STRIPE_V2_PRICE_${product.toUpperCase()}_${interval === 'month' ? 'MONTH' : 'YEAR'}`;
}

export const SUBSCRIBER_COUPON_ENV = 'STRIPE_V2_SUBSCRIBER_COUPON_ID';

export function stripePriceIdV2(product: ProductV2, interval: IntervalV2): string | null {
    return process.env[priceEnvKey(product, interval)] || null;
}

export function dollars(cents: number): string {
    const d = cents / 100;
    return Number.isInteger(d) ? `$${d}` : `$${d.toFixed(2)}`;
}
