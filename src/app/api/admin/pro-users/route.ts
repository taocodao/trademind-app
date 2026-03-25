/**
 * Internal EC2 → Next.js proxy endpoint
 * Returns all active TurboCore Pro users with their TastyTrade refresh tokens
 * so the Python IV-Switching scheduler on EC2 can generate per-user orders.
 *
 * Secured by EC2_API_SECRET env var (shared secret in both .env files).
 */

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getTastytradeTokens } from '@/lib/redis';

export async function GET(request: NextRequest) {
    // ── Auth: shared secret between EC2 and Vercel ──────────────────────
    const secret = request.headers.get('x-ec2-secret');
    if (!secret || secret !== process.env.EC2_API_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Get all active TurboCore Pro / Both Bundle users
        const res = await pool.query(`
            SELECT us.user_id, us.subscription_tier, us.subscription_status
            FROM user_settings us
            WHERE us.subscription_tier IN ('turbocore_pro', 'both_bundle')
              AND us.subscription_status IN ('active', 'trialing')
        `);

        const users = [];
        for (const row of res.rows) {
            const tokens = await getTastytradeTokens(row.user_id);
            if (!tokens?.refreshToken) continue; // skip users with no TT account

            users.push({
                id:              row.user_id,
                tt_refresh_token: tokens.refreshToken,
                tt_account_number: tokens.accountNumber || null,
                subscription_tier: row.subscription_tier,
            });
        }

        return NextResponse.json({ users, count: users.length });

    } catch (err: any) {
        console.error('[pro-users] Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
