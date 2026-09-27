import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import Stripe from 'stripe';
import pool from '@/lib/db';
import { getAccount } from '@/lib/accounts';
import { getMembershipByAccount, planForStrategy, priceKeyForPlan, type MembershipPlan } from '@/lib/membership';
import { getStripe } from '@/lib/stripe-server';
import { resolveNewsletterDiscount } from '@/lib/newsletter/checkout';

export const dynamic = 'force-dynamic';

async function getUserId(req: NextRequest): Promise<string | null> {
    const cookieStore = await cookies();
    const cookieUserId = cookieStore.get('privy-user-id')?.value;
    if (cookieUserId) return cookieUserId;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return null;
    try {
        const token = authHeader.slice(7);
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
        return payload?.sub || payload?.privy_did || null;
    } catch {
        return null;
    }
}

// Live annual price IDs. Env vars win when set; the literals are the current
// live prices so checkout keeps working before the Vercel env vars land.
// These ARE the newsletter subscriber prices ($252 Basic / $336 LEAPS); the
// regular list prices ($360 / $480) are display anchors only.
const LIVE_PRICE_IDS = {
    qqq_leaps: 'price_1U6Zkv2NdQtWmZJRpVRQBHT3',              // $336/yr
    turbocore_pro_bundle: 'price_1U6Zkm2NdQtWmZJRJ6pueESx',   // $252/yr
} as const;

function stripePriceIdForPlan(plan: 'basic' | 'leaps'): string | null {
    const priceKey = priceKeyForPlan(plan);
    const priceId = priceKey === 'qqq_leaps'
        ? process.env.NEXT_PUBLIC_STRIPE_QQQ_LEAPS_ANNUAL_PRICE_ID
        : process.env.NEXT_PUBLIC_STRIPE_TURBOCORE_PRO_BUNDLE_ANNUAL_PRICE_ID;
    return priceId || LIVE_PRICE_IDS[priceKey as keyof typeof LIVE_PRICE_IDS] || null;
}

function planFromValue(value: unknown): MembershipPlan | null {
    return value === 'basic' || value === 'leaps' ? value : null;
}

export async function POST(req: NextRequest) {
    try {
        if (!process.env.STRIPE_SECRET_KEY) {
            return NextResponse.json({ error: 'Stripe configuration error' }, { status: 500 });
        }

        const userId = await getUserId(req);
        if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const body = await req.json().catch(() => ({}));
        const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

        // ── Plan-based checkout (Sep 2026): payment comes first, the account
        // is auto-created by the checkout webhook with strategy defaults.
        // One account per plan per login: an existing account for the plan
        // falls back to the account flow (resubscribe) instead of duplicating.
        const plan = planFromValue(body.plan);
        if (plan) {
            const existing = await pool.query(
                `SELECT a.id FROM accounts a
                 JOIN account_memberships m ON m.account_id = a.id
                 WHERE a.user_id = $1 AND m.plan = $2
                 ORDER BY a.created_at ASC LIMIT 1`,
                [userId, plan]
            );
            const existingAccountId: number | null = existing.rows[0]?.id ?? null;
            if (existingAccountId) {
                body.accountId = existingAccountId;
            }
        }

        let accountId: number;
        let membershipPlan: MembershipPlan;
        let autoCreate = false;

        if (body.accountId) {
            accountId = Number(body.accountId);
            if (!Number.isInteger(accountId) || accountId <= 0) {
                return NextResponse.json({ error: 'A valid accountId is required' }, { status: 400 });
            }
            const account = await getAccount(accountId, userId);
            if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

            const membership = await getMembershipByAccount(account.id);
            if (!membership) return NextResponse.json({ error: 'Membership not found' }, { status: 404 });
            if (membership.user_id !== userId) return NextResponse.json({ error: 'Account not found' }, { status: 404 });
            if (membership.stripe_subscription_id && membership.status !== 'expired') {
                return NextResponse.json({ error: 'This account already has an active Stripe subscription' }, { status: 409 });
            }

            const expectedPlan = planForStrategy(account.strategy);
            if (membership.plan !== expectedPlan) {
                return NextResponse.json({ error: 'Account membership plan does not match its strategy' }, { status: 409 });
            }
            if (plan && plan !== expectedPlan) {
                return NextResponse.json({ error: 'You already have an account for a different plan' }, { status: 409 });
            }
            membershipPlan = expectedPlan;
        } else if (plan) {
            membershipPlan = plan;
            accountId = 0;
            autoCreate = true;
        } else {
            return NextResponse.json({ error: 'A plan (basic or leaps) or an accountId is required' }, { status: 400 });
        }

        const priceId = stripePriceIdForPlan(membershipPlan);
        if (!priceId) return NextResponse.json({ error: 'Stripe price is not configured' }, { status: 500 });

        const customerResult = await pool.query(
            'SELECT stripe_customer_id FROM user_settings WHERE user_id = $1',
            [userId]
        );
        let customerId: string | undefined = customerResult.rows[0]?.stripe_customer_id;
        if (!customerId) {
            const customer = await getStripe().customers.create({ metadata: { privy_did: userId } });
            customerId = customer.id;
            await pool.query(
                `INSERT INTO user_settings (user_id, stripe_customer_id, updated_at)
                 VALUES ($1, $2, NOW())
                 ON CONFLICT (user_id) DO UPDATE
                 SET stripe_customer_id = EXCLUDED.stripe_customer_id, updated_at = NOW()`,
                [userId, customerId]
            );
        }

        const metadata: Record<string, string> = { userId, plan: membershipPlan };
        if (autoCreate) {
            metadata.auto_create = '1';
        } else {
            metadata.account_id = String(accountId);
        }

        const sessionPayload: Stripe.Checkout.SessionCreateParams = {
            customer: customerId,
            mode: 'subscription',
            payment_method_types: ['card'],
            billing_address_collection: 'auto',
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: `${origin}/accounts?checkout=success`,
            cancel_url: `${origin}/#pricing`,
            metadata,
        };

        // The card is charged immediately (annual price). The first-month-free
        // trial is honored as a full refund when cancelling within 30 days
        // (see /api/stripe/cancel). Referral bonus-day grants still surface as
        // Stripe trial days on the legacy account flow.
        if (!autoCreate) {
            const membership = await getMembershipByAccount(accountId);
            if (membership && membership.pending_bonus_days > 0) {
                sessionPayload.subscription_data = {
                    trial_period_days: membership.pending_bonus_days,
                    metadata,
                };
            } else {
                sessionPayload.subscription_data = { metadata };
            }
        } else {
            sessionPayload.subscription_data = { metadata };
        }

        // The charged price already IS the newsletter subscriber price, so no
        // coupon is applied. Eligibility is still recorded for attribution and
        // the redemption marker lets the webhook flip the offer to redeemed.
        const accountEmail = (await pool.query('SELECT login_email FROM user_settings WHERE user_id = $1', [userId])).rows[0]?.login_email ?? null;
        const nlDiscount = await resolveNewsletterDiscount({
            accountEmail,
            providedCode: body.newsletterCode ? String(body.newsletterCode) : null,
        });
        if (nlDiscount.eligible && nlDiscount.subscriberId) {
            sessionPayload.metadata = { ...metadata, newsletter_subscriber_id: String(nlDiscount.subscriberId), newsletter_discount: 'NEWSLETTER30' };
        }

        const session = await getStripe().checkout.sessions.create(sessionPayload);
        return NextResponse.json({ url: session.url });
    } catch (error: unknown) {
        console.error('Stripe checkout error:', error);
        const message = error instanceof Error ? error.message : 'Failed to create checkout session';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
