/**
 * Approve Signal API Route
 * Approves a signal and executes the trade DIRECTLY from Vercel
 * 
 * This eliminates the need for EC2 and credential synchronization.
 */

import { NextResponse } from 'next/server';
import { getTastytradeTokens, storeTastytradeTokens } from '@/lib/redis';
import { cookies } from 'next/headers';
import { createSession, executeCalendarSpread } from '@/lib/tastytrade-api';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json().catch(() => ({}));

        // Get user ID from Privy token
        const cookieStore = await cookies();
        const privyToken = cookieStore.get("privy-token")?.value;

        let userId = "default-user";
        if (privyToken) {
            try {
                const payload = privyToken.split(".")[1];
                const decoded = JSON.parse(Buffer.from(payload, "base64").toString());
                userId = decoded.sub || decoded.userId || "default-user";
            } catch (err) {
                console.warn("Could not decode Privy token", err);
            }
        }

        // Get user's Tastytrade credentials from Redis
        const tokens = await getTastytradeTokens(userId);
        if (!tokens || !tokens.refreshToken) {
            return NextResponse.json(
                { error: 'Not connected to Tastytrade. Please link your account first.' },
                { status: 401 }
            );
        }

        // Get client secret from environment (single source of truth!)
        const clientSecret = process.env.TASTYTRADE_CLIENT_SECRET;
        if (!clientSecret) {
            console.error('TASTYTRADE_CLIENT_SECRET not configured');
            return NextResponse.json(
                { error: 'Server configuration error. Please contact support.' },
                { status: 500 }
            );
        }

        console.log(`📈 Approving signal ${id} for user ${userId}`);

        // Create Tastytrade session using OAuth refresh token
        let session;
        try {
            session = await createSession(clientSecret, tokens.refreshToken);
            console.log('✅ Tastytrade session created');

            // Update stored tokens with new refresh token if provided
            if (session.refreshToken && session.refreshToken !== tokens.refreshToken) {
                await storeTastytradeTokens(userId, {
                    ...tokens,
                    refreshToken: session.refreshToken,
                    accessToken: session.accessToken,
                    expiresAt: session.expiresAt,
                });
            }
        } catch (error) {
            console.error('Session creation failed:', error);
            return NextResponse.json({
                status: 'failed',
                signal: { id, ...body },
                error: error instanceof Error ? error.message : 'Failed to authenticate with Tastytrade',
                message: 'Trade failed: Could not authenticate. Please reconnect your Tastytrade account.',
            }, { status: 401 });
        }

        // Get account number
        const accountNumber = tokens.accountNumber;
        if (!accountNumber) {
            return NextResponse.json({
                status: 'failed',
                signal: { id, ...body },
                error: 'No account number found',
                message: 'Please reconnect your Tastytrade account.',
            }, { status: 400 });
        }

        // Execute the trade based on signal type
        const signalData = body.signal || body;

        try {
            // For now, handling calendar spread signals
            const result = await executeCalendarSpread(
                session.accessToken,
                accountNumber,
                {
                    symbol: signalData.symbol || 'TEST',
                    strike: signalData.strike || 100,
                    frontExpiry: signalData.frontExpiry || signalData.expiry,
                    backExpiry: signalData.backExpiry || signalData.expiry,
                    price: signalData.price,
                    direction: signalData.direction,
                }
            );

            console.log(`✅ Trade executed: Order ID ${result.orderId}`);

            return NextResponse.json({
                status: 'success',
                signal: { id, ...signalData, status: 'executed' },
                orderId: result.orderId,
                message: `Trade executed successfully! Order ID: ${result.orderId}`,
            });

        } catch (error) {
            console.error('Trade execution failed:', error);
            return NextResponse.json({
                status: 'failed',
                signal: { id, ...signalData },
                error: error instanceof Error ? error.message : 'Trade execution failed',
                message: `Trade failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            }, { status: 400 });
        }

    } catch (error) {
        console.error('Approve signal error:', error);
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Unknown error',
                status: 'failed',
            },
            { status: 500 }
        );
    }
}
