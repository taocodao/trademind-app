import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        // 1. Try Privy session cookie
        const cookieStore = await cookies();
        let userId = cookieStore.get('privy-user-id')?.value;

        // 2. Fallback: Bearer token (sent by client right after login)
        if (!userId) {
            const authHeader = req.headers.get('Authorization');
            if (authHeader?.startsWith('Bearer ')) {
                const token = authHeader.slice(7);
                try {
                    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
                    userId = payload?.sub || payload?.privy_did || '';
                } catch {
                    // malformed token
                }
            }
        }

        if (!userId) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const result = await pool.query(
            `SELECT subscription_tier, subscription_status, billing_interval,
                    current_period_end, trial_end, stripe_price_id, cancel_at_period_end,
                    cancel_at, email_signal_alerts, email, has_completed_onboarding, global_auto_approve
             FROM user_settings WHERE user_id = $1`,
            [userId]
        );

        if (result.rows.length === 0) {
            return NextResponse.json({
                tier: 'observer',
                status: null,
                billingInterval: null,
                currentPeriodEnd: null,
                trialEnd: null,
                priceId: null,
                cancelAtPeriodEnd: false,
                cancelAt: null,
                emailSignalAlerts: false,
                email: null,
                hasCompletedOnboarding: false,
                globalAutoApprove: true,
            });
        }

        const row = result.rows[0];
        return NextResponse.json({
            tier: row.subscription_tier || 'observer',
            status: row.subscription_status || null,
            billingInterval: row.billing_interval || null,
            currentPeriodEnd: row.current_period_end || null,
            trialEnd: row.trial_end || null,
            priceId: row.stripe_price_id || null,
            cancelAtPeriodEnd: row.cancel_at_period_end || false,
            cancelAt: row.cancel_at || null,
            emailSignalAlerts: row.email_signal_alerts === true,
            email: row.email || null,
            hasCompletedOnboarding: row.has_completed_onboarding ?? false,
            globalAutoApprove: row.global_auto_approve !== false,
        });
    } catch (error) {
        console.error('Error fetching subscription tier:', error);
        return NextResponse.json(
            { error: 'Failed to find subscription tier' },
            { status: 500 }
        );
    }
}
