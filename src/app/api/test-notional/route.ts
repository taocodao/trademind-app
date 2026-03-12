import { NextResponse } from 'next/server';
import { getTastytradeTokens, storeTastytradeTokens } from '@/lib/redis';
import { cookies } from 'next/headers';
import { createSession } from '@/lib/tastytrade-api';
import { executeNotionalEquityOrder, getOrderStatus } from '@/lib/tastytrade-api';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const action = searchParams.get('action') as 'Buy' | 'Sell';
        const symbol = searchParams.get('symbol') || 'QQQ';
        const value = parseFloat(searchParams.get('value') || '5');

        if (action !== 'Buy' && action !== 'Sell') {
            return NextResponse.json({
                error: "Invalid parameter. Please use ?action=Buy or ?action=Sell (e.g. /api/test-notional?action=Buy&symbol=QQQ&value=5)"
            }, { status: 400 });
        }

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
                { error: 'Not connected to Tastytrade. Please link your account first on the dashboard.' },
                { status: 401 }
            );
        }

        const clientId = process.env.TASTYTRADE_CLIENT_ID;
        const clientSecret = process.env.TASTYTRADE_CLIENT_SECRET;
        if (!clientId || !clientSecret) {
            return NextResponse.json({ error: 'Missing TASTYTRADE_CLIENT_ID' }, { status: 500 });
        }

        // Check if access token is still valid
        const tokenStillValid = tokens.expiresAt && tokens.expiresAt > Date.now();
        let accessToken = tokens.accessToken;

        if (!tokenStillValid || !accessToken) {
            console.log('Refreshing token for test...');
            const session = await createSession(clientId, clientSecret, tokens.refreshToken);
            accessToken = session.accessToken;
            await storeTastytradeTokens(userId, {
                ...tokens,
                refreshToken: session.refreshToken || tokens.refreshToken,
                accessToken: session.accessToken,
                expiresAt: session.expiresAt,
            });
        }

        const accountNumber = tokens.accountNumber;
        if (!accountNumber) {
            return NextResponse.json({ error: 'No account number found. Reconnect Tastytrade.' }, { status: 400 });
        }

        // Execute Notional Order 
        const resp = await executeNotionalEquityOrder(accessToken, accountNumber, {
            symbol,
            action,
            dollarValue: value
        });

        const orderId = resp.orderId;
        console.log(`✅ Order submitted: ${orderId}. Waiting 3 seconds for fill...`);

        // Wait 3 seconds then fetch the latest execution status
        await new Promise(r => setTimeout(r, 3000));

        let liveStatus;
        try {
            liveStatus = await getOrderStatus(accessToken, accountNumber, orderId);
        } catch (fetchErr) {
            console.warn(`Could not get order status for ${orderId}:`, fetchErr);
        }

        return NextResponse.json({
            success: true,
            request: { symbol, action, value },
            orderId: orderId,
            initialStatus: resp.status,
            executionStatus: liveStatus?.status || 'Unknown',
            liveDetails: liveStatus
        });

    } catch (error) {
        console.error('Test Notional Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
