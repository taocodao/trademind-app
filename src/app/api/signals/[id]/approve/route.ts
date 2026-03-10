/**
 * Approve Signal API Route
 * Approves a signal and executes the trade DIRECTLY from Vercel
 * 
 * This eliminates the need for EC2 and credential synchronization.
 */

import { NextResponse } from 'next/server';
import { getTastytradeTokens, storeTastytradeTokens } from '@/lib/redis';
import { cookies } from 'next/headers';
import { createSession, getAccountBalance } from '@/lib/tastytrade-api';
import { executeSignal } from '@/lib/strategy-executor';
import { createPosition, createUserExecution, getUserSettings } from '@/lib/db';

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

        // Get OAuth credentials from environment (single source of truth!)
        const clientId = process.env.TASTYTRADE_CLIENT_ID;
        const clientSecret = process.env.TASTYTRADE_CLIENT_SECRET;
        if (!clientId || !clientSecret) {
            console.error('TASTYTRADE_CLIENT_ID or TASTYTRADE_CLIENT_SECRET not configured');
            return NextResponse.json(
                { error: 'Server configuration error. Please contact support.' },
                { status: 500 }
            );
        }

        console.log(`📈 Approving signal ${id} for user ${userId}`);

        // Check if access token is still valid (not expired)
        const tokenStillValid = tokens.expiresAt && tokens.expiresAt > Date.now();
        let accessToken = tokens.accessToken;

        if (tokenStillValid && accessToken) {
            // Token still valid - use it directly without refresh
            console.log('✅ Using existing valid access token');
        } else {
            // Token expired - try to refresh
            console.log('⚠️ Access token expired, attempting refresh...');

            try {
                const session = await createSession(clientId, clientSecret, tokens.refreshToken);
                console.log('✅ Token refreshed successfully');
                accessToken = session.accessToken;

                // Update stored tokens with new refresh token if provided
                await storeTastytradeTokens(userId, {
                    ...tokens,
                    refreshToken: session.refreshToken || tokens.refreshToken,
                    accessToken: session.accessToken,
                    expiresAt: session.expiresAt,
                });
            } catch (refreshError) {
                // Refresh failed - this is expected due to Tastytrade API limitation
                // User needs to reconnect
                console.error('❌ Token refresh failed (likely Tastytrade API limitation):', refreshError);

                return NextResponse.json({
                    status: 'failed',
                    signal: { id, ...body },
                    error: 'Session expired. Please reconnect your Tastytrade account.',
                    code: 'RECONNECT_REQUIRED',
                    message: 'Your Tastytrade session has expired. Please click "Disconnect" then "Connect" to re-authenticate.',
                }, { status: 401 });
            }
        }

        // Get account number
        const accountNumber = tokens.accountNumber || body.accountNumber;
        if (!accountNumber) {
            return NextResponse.json({
                status: 'failed',
                signal: { id, ...(body.signal || body.signalDetails || body) },
                error: 'No account number found',
                message: 'Please reconnect your Tastytrade account.',
            }, { status: 400 });
        }

        // Execute the trade based on signal type
        // page.tsx sends either { signal } or { signalDetails }
        const signalData = body.signal || body.signalDetails || body;

        // 🛡️ SAFETY CHECK: Verify Buying Power
        try {
            const balanceData = await getAccountBalance(accessToken, accountNumber);
            const buyingPower = balanceData.buyingPower;

            const estimatedCost = signalData.cost ||
                (signalData.capital_required) ||
                ((signalData.strike || 0) * 100 * (signalData.contracts || 1));

            if (buyingPower < estimatedCost) {
                console.error(`❌ Insufficient Buying Power: $${buyingPower} < $${estimatedCost}`);
                return NextResponse.json({
                    status: 'failed',
                    signal: { id, ...signalData },
                    error: 'Insufficient buying power',
                    message: `Account has $${buyingPower.toFixed(2)} BP, but trade requires ~$${estimatedCost.toFixed(2)}`
                }, { status: 400 });
            }
            console.log(`✅ Buying Power OK: $${buyingPower} available > $${estimatedCost} required`);
        } catch (bpError) {
            console.warn('⚠️ Could not verify buying power (proceeding with caution):', bpError);
        }

        // Helper: Get next Friday from a given date
        const getNextFriday = (from: Date): string => {
            const date = new Date(from);
            const dayOfWeek = date.getDay();
            const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7; // If today is Friday, get next Friday
            date.setDate(date.getDate() + daysUntilFriday);
            return date.toISOString().split('T')[0]; // YYYY-MM-DD
        };

        // Get default expiry dates if not provided
        const today = new Date();
        const defaultFrontExpiry = getNextFriday(today);
        const frontDate = new Date(defaultFrontExpiry);
        frontDate.setDate(frontDate.getDate() + 7);
        const defaultBackExpiry = frontDate.toISOString().split('T')[0];

        try {
            // Check if strategy should be handled by EC2 backend
            const strategy = String(signalData.strategy || '').toUpperCase();
            const isServerManaged = ['TURBOBOUNCE', 'ZEBRA', 'TQQQ_TURBOCORE', 'TURBOCORE', 'REBALANCE'].includes(strategy);

            let result;

            if (isServerManaged) {
                console.log(`📡 Proxying ${strategy} approval to EC2 backend...`);
                const ec2Url = process.env.TASTYTRADE_API_URL || 'http://34.235.119.67:8002';

                const proxyResp = await fetch(`${ec2Url}/api/signals/${id}/approve`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        refreshToken: tokens.refreshToken,
                        accountNumber: tokens.accountNumber,
                        userId: userId,
                        execute: true,
                        signal: signalData // Pass the full signal data
                    })
                });

                if (!proxyResp.ok) {
                    const errorText = await proxyResp.text();
                    let parsedError = errorText;
                    try {
                        const errJson = JSON.parse(errorText);
                        parsedError = errJson.error || errJson.message || errorText;
                    } catch (e) { /* ignore */ }
                    throw new Error(`EC2 Proxy failed: ${parsedError}`);
                }

                result = await proxyResp.json();
                console.log(`✅ EC2 Proxy successful: Order ID ${result.orderId || result.order_id}`);

                // Return immediately so we don't fall through to local execution!
                return NextResponse.json(result);

            } else {
                // Execute trade using modular strategy executor (locally on Vercel)
                result = await executeSignal(
                    accessToken,
                    accountNumber,
                    signalData,
                    {
                        front: defaultFrontExpiry,
                        back: defaultFrontExpiry, // Using same for default vertical/theta
                    }
                );
            }

            const orderId = result.orderId || result.order_id || 'unknown';
            console.log(`✅ Trade processed: Order ID ${orderId}`);

            // ✅ Create position in database for persistence
            try {
                const userSettings = await getUserSettings(userId);
                const riskLevel = userSettings?.risk_level || 'moderate';

                await createPosition({
                    id: orderId,
                    userId: userId,
                    signalId: id,
                    symbol: signalData.symbol || 'UNKNOWN',
                    strategy: signalData.strategy || 'theta',
                    strike: signalData.strike || 0,
                    expiration: signalData.frontExpiry || signalData.expiry || defaultFrontExpiry,
                    backExpiry: signalData.backExpiry || defaultBackExpiry,
                    contracts: signalData.contracts || 1,
                    entryPrice: signalData.entry_price || signalData.price || signalData.cost || 0,
                    capitalRequired: signalData.cost || (signalData.strike || 0) * 100 * (signalData.contracts || 1),
                    riskLevel: riskLevel,
                    direction: signalData.direction,
                });

                // Track user execution
                await createUserExecution(userId, id, 'executed', orderId, body.source || 'manual');

                console.log(`✅ Position saved to database: ${orderId}`);
            } catch (dbError) {
                console.error('⚠️ Failed to save position to database:', dbError);
            }

            return NextResponse.json({
                status: 'success',
                signal: { id, ...signalData, status: 'executed' },
                orderId: orderId,
                positionId: orderId,
                message: `Trade processed successfully! Order ID: ${orderId}`,
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
