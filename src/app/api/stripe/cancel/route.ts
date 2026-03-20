import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-01-27.acacia' as any,
});

async function getUserId(req: NextRequest): Promise<string | null> {
    const authHeader = req.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        try {
            const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
            return payload?.sub || payload?.privy_did || null;
        } catch {
            return null;
        }
    }
    return null;
}

export async function POST(req: NextRequest) {
    try {
        const userId = await getUserId(req);
        if (!userId) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        // Get the user's subscription ID from DB
        const result = await pool.query(
            `SELECT stripe_subscription_id FROM user_settings WHERE user_id = $1`,
            [userId]
        );

        const subscriptionId = result.rows[0]?.stripe_subscription_id;
        if (!subscriptionId) {
            return NextResponse.json({ error: 'No active subscription found.' }, { status: 400 });
        }

        // Cancel at period end — best practice: do not revoke access immediately
        const subscription = await stripe.subscriptions.update(subscriptionId, {
            cancel_at_period_end: true,
        }) as any;

        const cancelAt = subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : null;

        // Sync state to DB so the UI can immediately reflect the change
        await pool.query(
            `UPDATE user_settings SET cancel_at_period_end = true, cancel_at = $2 WHERE user_id = $1`,
            [userId, cancelAt]
        );

        console.log(`✅ Subscription scheduled for cancellation for user ${userId}. Access ends: ${cancelAt}`);

        return NextResponse.json({ success: true, cancelAt });

    } catch (error: any) {
        console.error('Cancel subscription error:', error);
        return NextResponse.json({ error: error.message || 'Failed to cancel subscription' }, { status: 500 });
    }
}
