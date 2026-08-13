import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getStripe } from '@/lib/stripe-server';

export const dynamic = 'force-dynamic';

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

        const result = await pool.query(
            `SELECT stripe_subscription_id FROM user_settings WHERE user_id = $1`,
            [userId]
        );

        const subscriptionId = result.rows[0]?.stripe_subscription_id;
        if (!subscriptionId) {
            return NextResponse.json({ error: 'No subscription found to reactivate.' }, { status: 400 });
        }

        // Remove the scheduled cancellation
        await getStripe().subscriptions.update(subscriptionId, {
            cancel_at_period_end: false,
        });

        // Sync state back to DB
        await pool.query(
            `UPDATE user_settings SET cancel_at_period_end = false, cancel_at = NULL WHERE user_id = $1`,
            [userId]
        );

        console.log(`✅ Subscription reactivated for user ${userId}`);

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Reactivate subscription error:', error);
        return NextResponse.json({ error: error.message || 'Failed to reactivate subscription' }, { status: 500 });
    }
}
