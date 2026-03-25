/**
 * Approve IV-Switching Options Signal
 * 
 * Called when user clicks Submit on an IVSwitchingSignalCard.
 * Routes to the options execution engine instead of the equity rebalancer.
 * Reads the order_legs from user_daily_orders and submits them to Tastytrade.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTastytradeTokens, storeTastytradeTokens } from '@/lib/redis';
import { createSession } from '@/lib/tastytrade-api';
import { getPrivyUserId } from '@/lib/auth-helpers';
import pool from '@/lib/db';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json().catch(() => ({}));
        const userId = await getPrivyUserId(request as NextRequest);

        if (!userId) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const iv_switching_order_id: string = body.iv_switching_order_id;
        if (!iv_switching_order_id) {
            return NextResponse.json({ error: 'Missing iv_switching_order_id' }, { status: 400 });
        }

        // 1. Load the user_daily_orders row
        const orderRes = await pool.query(
            `SELECT * FROM user_daily_orders WHERE id = $1 AND user_id = $2`,
            [iv_switching_order_id, userId]
        );
        if (orderRes.rowCount === 0) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }
        const order = orderRes.rows[0];

        if (order.status === 'EXECUTED') {
            return NextResponse.json({ status: 'already_executed' }, { status: 409 });
        }

        // 2. Get Tastytrade tokens
        const tokens = await getTastytradeTokens(userId);
        if (!tokens?.refreshToken) {
            // Virtual-only execution — mark as executed without TT submission
            await pool.query(
                `UPDATE user_daily_orders SET status = 'EXECUTED', updated_at = NOW() WHERE id = $1`,
                [iv_switching_order_id]
            );
            return NextResponse.json({ status: 'success', virtual: true, message: 'Tracked virtually. Connect Tastytrade for live execution.' });
        }

        // 3. Get or refresh access token
        const clientId = process.env.TASTYTRADE_CLIENT_ID!;
        const clientSecret = process.env.TASTYTRADE_CLIENT_SECRET!;
        
        let accessToken = tokens.accessToken;
        if (!tokens.expiresAt || tokens.expiresAt <= Date.now()) {
            const sessionRes = await createSession(tokens.refreshToken, clientId, clientSecret);
            accessToken = sessionRes.accessToken;
            await storeTastytradeTokens(userId, { ...sessionRes, linkedAt: tokens.linkedAt ?? Date.now() });
        }

        // 4. Get account number
        const { getAccounts } = await import('@/lib/tastytrade-api');
        const accounts = await getAccounts(accessToken);
        const accountNumber = accounts[0]?.accountNumber;
        if (!accountNumber) {
            return NextResponse.json({ error: 'No Tastytrade account found' }, { status: 400 });
        }

        // 5. Submit the options order legs via Tastytrade API
        const orderLegs = order.order_legs || [];
        if (orderLegs.length === 0) {
            return NextResponse.json({ error: 'No order legs in this order' }, { status: 400 });
        }

        const { submitOptionsOrder } = await import('@/lib/tastytrade-api');
        const ttOrderResult = await submitOptionsOrder(
            accessToken,
            accountNumber,
            orderLegs,
            order.limit_price,
            order.option_type === 'CSP' ? 'Limit' : 'Limit' // always limit for options
        );

        console.log(`[approve-options] Submitted order ${iv_switching_order_id} → TT orderId: ${ttOrderResult?.orderId}`);

        // 6. Mark as executed
        await pool.query(
            `UPDATE user_daily_orders SET status = 'EXECUTED', updated_at = NOW() WHERE id = $1`,
            [iv_switching_order_id]
        );

        // 7. Also mark the signal as executed in user_signal_executions
        await pool.query(
            `INSERT INTO user_signal_executions (user_id, signal_id, created_at) VALUES ($1, $2, NOW())
             ON CONFLICT (user_id, signal_id) DO NOTHING`,
            [userId, id]
        );

        return NextResponse.json({
            status: 'success',
            message: 'Options order submitted to Tastytrade',
            orderId: ttOrderResult?.orderId,
            orderType: order.signal_type,
            contracts: order.contracts,
        });

    } catch (err: any) {
        console.error('[approve-options] Error:', err);
        return NextResponse.json({ status: 'failed', error: err?.message || String(err) }, { status: 500 });
    }
}
