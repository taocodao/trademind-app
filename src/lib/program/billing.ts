import type Stripe from 'stripe';
import pool from '@/lib/db';
import { getStripe } from '@/lib/stripe-server';
import { ensureProgramTables } from './db';
import { FOUNDING_PAID_MONTHS, PRICES, foundingDiscount, type Interval, type PlanLevel } from './rules';
import { sendProgramEmail } from './emails';

/** Price IDs for the new levels come from the environment; nothing is hardcoded and nothing is created implicitly. */
export function programPriceId(level: PlanLevel, interval: Interval): string | null {
    const key = `STRIPE_PROGRAM_PRICE_${level.toUpperCase()}_${interval === 'month' ? 'MONTH' : 'YEAR'}`;
    return process.env[key] || null;
}

export function couponId(level: PlanLevel, interval: Interval): string {
    return `FOUNDING_${level.toUpperCase()}_${interval === 'month' ? 'MONTHLY' : 'ANNUAL'}`;
}

/**
 * Founding coupon: a fixed dollar amount off the standard price, so the result is exactly the founding price
 * ($19 or $34 a month for 12 paid months, $190 or $340 for the first year).
 */
export async function ensureFoundingCoupon(level: PlanLevel, interval: Interval): Promise<string> {
    const stripe = getStripe();
    const id = couponId(level, interval);
    try {
        await stripe.coupons.retrieve(id);
    } catch {
        await stripe.coupons.create({
            id,
            name: `Founding member ${level} ${interval === 'month' ? 'monthly' : 'annual'}`,
            amount_off: foundingDiscount(level, interval) * 100,
            currency: 'usd',
            ...(interval === 'month' ? { duration: 'repeating' as const, duration_in_months: FOUNDING_PAID_MONTHS } : { duration: 'once' as const }),
        });
    }
    return id;
}

/**
 * Checkout for a founding member. The caller has already checked that free access has ended and that the
 * signed-in, verified email equals the participant's email. The coupon is attached on the server, so it is
 * tied to that verified email and cannot be typed in or shared.
 */
export async function createFoundingCheckout(input: {
    participantId: number; email: string; level: PlanLevel; interval: Interval; origin: string; customerId?: string | null;
}): Promise<{ url: string } | { error: string; status: number }> {
    const price = programPriceId(input.level, input.interval);
    if (!price) return { error: 'Founding checkout is not available yet.', status: 503 };
    const stripe = getStripe();
    const coupon = await ensureFoundingCoupon(input.level, input.interval);
    const meta = { program: '1', participant_id: String(input.participantId), email: input.email, level: input.level, interval: input.interval };
    const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        line_items: [{ price, quantity: 1 }],
        discounts: [{ coupon }],
        ...(input.customerId ? { customer: input.customerId } : { customer_email: input.email }),
        metadata: meta,
        subscription_data: { metadata: meta },
        success_url: `${input.origin}/founding/choose?paid=1`,
        cancel_url: `${input.origin}/founding/choose`,
    });
    return session.url ? { url: session.url } : { error: 'Could not start checkout.', status: 502 };
}

/** checkout.session.completed for a program purchase. Safe to run more than once for the same session. */
export async function handleProgramCheckout(session: Stripe.Checkout.Session): Promise<void> {
    await ensureProgramTables();
    const m = session.metadata ?? {};
    const pid = Number(m.participant_id);
    const email = (m.email || '').toLowerCase();
    if (!pid || !email || session.payment_status === 'unpaid') return;
    const level = (m.level === 'tracking' ? 'tracking' : 'research') as PlanLevel;
    const interval = (m.interval === 'year' ? 'year' : 'month') as Interval;
    const customer = typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null;

    await pool.query(
        `UPDATE program_participant SET paid_started_at = COALESCE(paid_started_at, NOW()), stripe_customer_id = COALESCE(stripe_customer_id, $2) WHERE id = $1`,
        [pid, customer]
    );
    await pool.query(
        `INSERT INTO entitlement (email_norm, plan, source, starts_at) VALUES ($1, $2, 'stripe', NOW())
         ON CONFLICT (email_norm, source) DO UPDATE SET plan = $2, ends_at = NULL`,
        [email, level === 'tracking' ? 'research_plus_tracking' : 'research']
    );
    // Confirmation email once per participant.
    const first = await pool.query(`INSERT INTO program_email_log (participant_id, key) VALUES ($1, 'founding_confirmed') ON CONFLICT DO NOTHING RETURNING 1`, [pid]);
    if (first.rows[0]) {
        const p = PRICES[level];
        await sendProgramEmail('founding_confirmed', {
            to: email, endDate: new Date().toISOString(), level: level === 'tracking' ? 'Research and Tracking' : 'Research',
            price: `$${p.founding[interval]}`, period: interval === 'month' ? 'month' : 'year', current: `$${p[interval]}`,
        });
    }
}

/** A program subscription ended: close the paid entitlement. */
export async function handleProgramSubscriptionEnded(sub: Stripe.Subscription): Promise<boolean> {
    if (sub.metadata?.program !== '1') return false;
    await ensureProgramTables();
    const email = (sub.metadata.email || '').toLowerCase();
    if (email) await pool.query(`UPDATE entitlement SET ends_at = NOW() WHERE email_norm = $1 AND source = 'stripe'`, [email]);
    return true;
}
