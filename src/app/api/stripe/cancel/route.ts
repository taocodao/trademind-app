import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { cookies } from 'next/headers';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-01-27.acacia' as any,
});

async function getUserId(req: NextRequest): Promise<string | null> {
    // 1. Cookie-based (primary — works for browser requests)
    const cookieStore = await cookies();
    const directId = cookieStore.get('privy-user-id')?.value;
    if (directId) return directId;
    const privyToken = cookieStore.get('privy-token')?.value;
    if (privyToken) {
        try {
            const payload = JSON.parse(Buffer.from(privyToken.split('.')[1], 'base64').toString());
            const id = payload.sub || payload.privy_did;
            if (id) return id;
        } catch { /* fallthrough */ }
    }
    // 2. Bearer token fallback (for programmatic calls)
    const authHeader = req.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        try {
            const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
            return payload?.sub || payload?.privy_did || null;
        } catch { return null; }
    }
    return null;
}

// POST — cancel subscription
export async function POST(req: NextRequest) {
    try {
        const userId = await getUserId(req);
        if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const result = await pool.query(
            `SELECT stripe_subscription_id, subscription_status FROM user_settings WHERE user_id = $1`,
            [userId]
        );

        const subscriptionId = result.rows[0]?.stripe_subscription_id;
        const status = result.rows[0]?.subscription_status;
        if (!subscriptionId) {
            return NextResponse.json({ error: 'No active subscription found.' }, { status: 400 });
        }

        let subscription: any;
        if (status === 'trialing') {
            // Immediate cancel for trial users — no charge ever made
            subscription = await stripe.subscriptions.cancel(subscriptionId);
        } else {
            // Graceful cancel: revoke at end of billing period
            subscription = await stripe.subscriptions.update(subscriptionId, {
                cancel_at_period_end: true,
            });
        }

        const cancelAt = subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : null;

        // Sync to DB immediately for instant UI refresh
        await pool.query(
            `UPDATE user_settings 
             SET cancel_at_period_end = $2, cancel_at = $3, subscription_status = $4, updated_at = NOW()
             WHERE user_id = $1`,
            [userId, subscription.cancel_at_period_end ?? false, cancelAt, subscription.status]
        );

        console.log(`✅ Subscription cancel scheduled for user ${userId}. Ends: ${cancelAt}`);
        return NextResponse.json({ success: true, cancelAt, status: subscription.status });
    } catch (error: any) {
        console.error('Cancel subscription error:', error);
        return NextResponse.json({ error: error.message || 'Failed to cancel subscription' }, { status: 500 });
    }
}

// PUT — reactivate (undo cancel_at_period_end)
export async function PUT(req: NextRequest) {
    try {
        const userId = await getUserId(req);
        if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const result = await pool.query(
            `SELECT stripe_subscription_id FROM user_settings WHERE user_id = $1`,
            [userId]
        );
        const subscriptionId = result.rows[0]?.stripe_subscription_id;
        if (!subscriptionId) return NextResponse.json({ error: 'No subscription found' }, { status: 404 });

        const subscription = await stripe.subscriptions.update(subscriptionId, {
            cancel_at_period_end: false,
        }) as any;

        await pool.query(
            `UPDATE user_settings SET cancel_at_period_end = false, cancel_at = null, updated_at = NOW()
             WHERE user_id = $1`,
            [userId]
        );

        console.log(`✅ Subscription reactivated for user ${userId}`);
        return NextResponse.json({ success: true, cancelAtPeriodEnd: false, status: subscription.status });
    } catch (error: any) {
        console.error('Reactivate subscription error:', error);
        return NextResponse.json({ error: error.message || 'Failed to reactivate subscription' }, { status: 500 });
    }
}
