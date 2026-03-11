import { NextRequest, NextResponse } from 'next/server';
import { getTastytradeTokens, storeTastytradeTokens } from '@/lib/redis';
import { createSession } from '@/lib/tastytrade-api';
import { calculateTurboCoreOrders } from '@/lib/strategy-executor';

export const dynamic = 'force-dynamic';

export async function POST(
    request: NextRequest,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { params }: any
) {
    console.log(`🔍 Received signal preview request for ID: ${params.id}`);

    try {
        const body = await request.json();
        const { signalDetails, userId: bodyUserId } = body;
        const id = params.id;

        // 1. Get User ID from standard Auth header or fallback to body
        let userId = bodyUserId;
        const authHeader = request.headers.get("Authorization");
        if (!userId && authHeader && authHeader.startsWith("Bearer ")) {
            try {
                const privyToken = authHeader.split(" ")[1];
                const payload = privyToken.split(".")[1];
                const decoded = JSON.parse(Buffer.from(payload, "base64").toString());
                userId = decoded.sub || decoded.userId || "default-user";
            } catch (err) {
                console.warn("Could not decode Privy token for preview", err);
            }
        }

        if (!userId) {
            return NextResponse.json({ error: 'Missing userId' }, { status: 401 });
        }

        // 2. Get Tastytrade credentials
        const tokens = await getTastytradeTokens(userId);
        if (!tokens || !tokens.refreshToken) {
            return NextResponse.json(
                { error: 'Not connected to Tastytrade.' },
                { status: 401 }
            );
        }

        const clientId = process.env.TASTYTRADE_CLIENT_ID;
        const clientSecret = process.env.TASTYTRADE_CLIENT_SECRET;

        let accessToken = tokens.accessToken;
        const tokenStillValid = tokens.expiresAt && tokens.expiresAt > Date.now();

        if (!tokenStillValid || !accessToken) {
            try {
                const session = await createSession(clientId!, clientSecret!, tokens.refreshToken);
                accessToken = session.accessToken;
                await storeTastytradeTokens(userId, {
                    ...tokens,
                    refreshToken: session.refreshToken || tokens.refreshToken,
                    accessToken: session.accessToken,
                    expiresAt: session.expiresAt,
                });
            } catch (err) {
                return NextResponse.json({ error: 'Session expired.' }, { status: 401 });
            }
        }

        const accountNumber = tokens.accountNumber || body.accountNumber;

        // 3. Calculate orders using the shared logic
        const strategy = String(signalDetails?.strategy || '').toUpperCase();
        if (strategy.includes('TURBOCORE') || strategy.includes('REBALANCE')) {
            const orders = await calculateTurboCoreOrders(accessToken!, accountNumber!, signalDetails);
            return NextResponse.json({ orders, status: 'success' });
        }

        // Return empty for unsupported preview strategies
        return NextResponse.json({ orders: [], message: 'Preview not supported for this strategy type.' });

    } catch (error) {
        console.error('❌ Strategy Preview Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error during preview calculation', orders: [] },
            { status: 500 }
        );
    }
}
