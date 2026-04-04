import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/ai';
import { query } from '@/lib/db';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-01-27.acacia' as any,
});

const FREE_FEATURE_LIMITS: Record<string, number> = {
    'observer': 0,
    'turbocore': 1,
    'turbocore_pro': 1,
    'both_bundle': 2,
    // Trial tiers mirror their base tier limits
    'app_trial': 2,  // both_bundle equivalent during trial
};

const VALID_FEATURES = ['screenshot', 'deepdive', 'briefing', 'strategy', 'debrief'];

export async function POST(req: NextRequest) {
    try {
        const user = await getUserFromRequest(req);
        const { featureKey } = await req.json();

        if (!VALID_FEATURES.includes(featureKey)) {
            return NextResponse.json({ error: 'Invalid feature key' }, { status: 400 });
        }

        if (user.tier === 'observer') {
            return NextResponse.json({ error: 'Subscribe to a plan first' }, { status: 403 });
        }

        // Check if already subscribed
        const existing = await query(
            `SELECT id FROM ai_feature_subscriptions WHERE user_id = $1 AND feature_key = $2 AND status = 'active'`,
            [user.privyDid, featureKey]
        );
        if (existing.rows.length > 0) {
            return NextResponse.json({ error: 'Feature already active' }, { status: 409 });
        }

        // Check free entitlement availability
        const freeLimit = FREE_FEATURE_LIMITS[user.tier] ?? 0;
        const freeUsedResult = await query(
            `SELECT COUNT(*) as cnt FROM ai_feature_subscriptions WHERE user_id = $1 AND is_free_entitlement = true AND status = 'active'`,
            [user.privyDid]
        );
        const freeUsed = parseInt(freeUsedResult.rows[0].cnt);
        const canUseFree = freeUsed < freeLimit;

        if (canUseFree) {
            // Free pick — no Stripe charge, just insert DB row
            await query(
                `INSERT INTO ai_feature_subscriptions (user_id, feature_key, is_free_entitlement, status)
                 VALUES ($1, $2, true, 'active')
                 ON CONFLICT (user_id, feature_key) DO UPDATE SET is_free_entitlement = true, status = 'active', updated_at = NOW()`,
                [user.privyDid, featureKey]
            );
            await query(
                `UPDATE user_settings SET free_features_selected = free_features_selected + 1 WHERE user_id = $1`,
                [user.privyDid]
            );
            return NextResponse.json({ success: true, method: 'free_entitlement' });
        }

        // Paid — add Stripe subscription item
        const settingsResult = await query(
            `SELECT stripe_subscription_id FROM user_settings WHERE user_id = $1`,
            [user.privyDid]
        );
        const subscriptionId = settingsResult.rows[0]?.stripe_subscription_id;
        if (!subscriptionId) {
            return NextResponse.json({ 
                error: 'No Stripe subscription found. You must have an active TurboCore or Both Bundle plan to add paid features.',
                code: 'NO_SUBSCRIPTION'
            }, { status: 400 });
        }

        const FEATURE_PRICE_MAP: Record<string, string | undefined> = {
            screenshot: process.env.STRIPE_AI_PRICE_SCREENSHOT,
            deepdive:   process.env.STRIPE_AI_PRICE_DEEPDIVE,
            briefing:   process.env.STRIPE_AI_PRICE_BRIEFING,
            strategy:   process.env.STRIPE_AI_PRICE_STRATEGY,
            debrief:    process.env.STRIPE_AI_PRICE_DEBRIEF,
        };

        const addonPriceId = FEATURE_PRICE_MAP[featureKey];
        if (!addonPriceId) {
            return NextResponse.json({ error: `Price not configured for feature: ${featureKey}` }, { status: 500 });
        }

        // Verify subscription still exists in Stripe before adding items
        let subscription;
        try {
            subscription = await stripe.subscriptions.retrieve(subscriptionId);
        } catch (stripeErr: any) {
            if (stripeErr.code === 'resource_missing') {
                // Stale subscription ID — clear it from DB so user can re-subscribe cleanly
                await query(
                    `UPDATE user_settings SET stripe_subscription_id = NULL WHERE user_id = $1`,
                    [user.privyDid]
                );
                return NextResponse.json({
                    error: 'Your Stripe subscription record is out of sync. Please go to Settings → Subscription and re-subscribe to your plan, then try again.',
                    code: 'SUBSCRIPTION_NOT_FOUND'
                }, { status: 400 });
            }
            throw stripeErr; // Re-throw unexpected errors
        }

        if (subscription.status !== 'active' && subscription.status !== 'trialing') {
            return NextResponse.json({
                error: `Your subscription is ${subscription.status}. Please update your payment method in Settings.`,
                code: 'SUBSCRIPTION_INACTIVE'
            }, { status: 400 });
        }

        // Add a new item to the existing subscription
        const subItem = await stripe.subscriptionItems.create({
            subscription: subscriptionId,
            price: addonPriceId,
            quantity: 1,
            metadata: { feature_key: featureKey, user_id: user.privyDid },
        });

        await query(
            `INSERT INTO ai_feature_subscriptions (user_id, feature_key, is_free_entitlement, stripe_subscription_item_id, status)
             VALUES ($1, $2, false, $3, 'active')
             ON CONFLICT (user_id, feature_key) DO UPDATE SET
                stripe_subscription_item_id = $3, is_free_entitlement = false, status = 'active', updated_at = NOW()`,
            [user.privyDid, featureKey, subItem.id]
        );

        return NextResponse.json({ success: true, method: 'paid', subscriptionItemId: subItem.id });

    } catch (error: any) {
        console.error('Subscribe Feature Error:', error);
        if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
