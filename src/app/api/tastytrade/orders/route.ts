/**
 * Generic Tastytrade Order Execution API
 * Supports all strategies: Theta, Calendar, etc.
 */

import { NextResponse } from 'next/server';
import { getTastytradeTokens, storeTastytradeTokens } from '@/lib/redis';
import { cookies } from 'next/headers';
import { createSession, executeCalendarSpread, executeThetaPut } from '@/lib/tastytrade-api';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { strategy, ...signalData } = body;

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

        // Get OAuth credentials from environment
        const clientId = process.env.TASTYTRADE_CLIENT_ID;
        const clientSecret = process.env.TASTYTRADE_CLIENT_SECRET;
        if (!clientId || !clientSecret) {
            console.error('TASTYTRADE_CLIENT_ID or TASTYTRADE_CLIENT_SECRET not configured');
            return NextResponse.json(
                { error: 'Server configuration error. Please contact support.' },
                { status: 500 }
            );
        }

        console.log(`📈 Executing ${strategy} trade for user ${userId}`);

        // Check if access token is still valid
        const tokenStillValid = tokens.expiresAt && tokens.expiresAt > Date.now();
        let accessToken = tokens.accessToken;

        if (tokenStillValid && accessToken) {
            console.log('✅ Using existing valid access token');
        } else {
            console.log('⚠️ Access token expired, attempting refresh...');

            try {
                const session = await createSession(clientId, clientSecret, tokens.refreshToken);
                console.log('✅ Token refreshed successfully');
                accessToken = session.accessToken;

                // Update stored tokens
                await storeTastytradeTokens(userId, {
                    ...tokens,
                    refreshToken: session.refreshToken || tokens.refreshToken,
                    accessToken: session.accessToken,
                    expiresAt: session.expiresAt,
                });
            } catch (refreshError) {
                console.error('❌ Token refresh failed:', refreshError);
                return NextResponse.json({
                    error: 'Session expired. Please reconnect your Tastytrade account.',
                    code: 'RECONNECT_REQUIRED',
                }, { status: 401 });
            }
        }

        // Get account number
        const accountNumber = tokens.accountNumber;
        if (!accountNumber) {
            return NextResponse.json({
                error: 'No account number found. Please reconnect your Tastytrade account.',
            }, { status: 400 });
        }

        // Execute trade based on strategy
        let result;
        try {
            if (strategy === 'theta') {
                result = await executeThetaPut(accessToken, accountNumber, {
                    symbol: signalData.symbol,
                    strike: signalData.strike,
                    expiration: signalData.expiration,
                    contracts: signalData.contracts || 1,
                    price: signalData.price,
                });
            } else if (strategy === 'calendar') {
                result = await executeCalendarSpread(accessToken, accountNumber, {
                    symbol: signalData.symbol,
                    strike: signalData.strike,
                    frontExpiry: signalData.frontExpiry || signalData.front_expiry,
                    backExpiry: signalData.backExpiry || signalData.back_expiry,
                    price: signalData.price || signalData.cost,
                    direction: signalData.direction,
                });
            } else {
                return NextResponse.json({
                    error: `Unknown strategy: ${strategy}`,
                }, { status: 400 });
            }

            console.log(`✅ ${strategy} trade executed: Order ID ${result.orderId}`);

            return NextResponse.json({
                success: true,
                orderId: result.orderId,
                status: result.status,
                message: `${strategy} trade executed successfully`,
            });

        } catch (error) {
            console.error('Trade execution failed:', error);
            return NextResponse.json({
                success: false,
                error: error instanceof Error ? error.message : 'Trade execution failed',
            }, { status: 400 });
        }

    } catch (error) {
        console.error('Order API error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
