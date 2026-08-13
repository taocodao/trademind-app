import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/ai';
import { query } from '@/lib/db';
import { getStripe } from '@/lib/stripe-server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const user = await getUserFromRequest(req);
        const { featureKey } = await req.json();

        const featureResult = await query(
            `SELECT * FROM ai_feature_subscriptions WHERE user_id = $1 AND feature_key = $2 AND status = 'active'`,
            [user.privyDid, featureKey]
        );

        if (!featureResult.rows.length) {
            return NextResponse.json({ error: 'Feature not active' }, { status: 404 });
        }

        const feature = featureResult.rows[0];

        // If paid, cancel Stripe subscription item
        if (!feature.is_free_entitlement && feature.stripe_subscription_item_id) {
            try {
                await getStripe().subscriptionItems.del(feature.stripe_subscription_item_id);
            } catch (err: any) {
                console.error('Stripe item deletion failed:', err.message);
            }
        }

        // If free, decrement free_features_selected
        if (feature.is_free_entitlement) {
            await query(
                `UPDATE user_settings SET free_features_selected = GREATEST(0, free_features_selected - 1) WHERE user_id = $1`,
                [user.privyDid]
            );
        }

        // Mark as canceled in DB
        await query(
            `UPDATE ai_feature_subscriptions SET status = 'canceled', updated_at = NOW() WHERE id = $1`,
            [feature.id]
        );

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Unsubscribe Feature Error:', error);
        if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
