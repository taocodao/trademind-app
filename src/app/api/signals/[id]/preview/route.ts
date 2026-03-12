import { NextRequest, NextResponse } from 'next/server';
import { getTastytradeTokens, storeTastytradeTokens } from '@/lib/redis';
import { createSession } from '@/lib/tastytrade-api';
import { calculateTurboCoreOrders } from '@/lib/strategy-executor';
import { cookies } from 'next/headers';

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

        // 1. Get User ID from cookie, header, or body
        let userId = bodyUserId;

        // Try cookie first (most reliable in Vercel)
        if (!userId) {
            const cookieStore = await cookies();
            const privyToken = cookieStore.get('privy-token')?.value;
            if (privyToken) {
                try {
                    const payload = privyToken.split('.')[1];
                    const decoded = JSON.parse(Buffer.from(payload, 'base64').toString());
                    userId = decoded.sub || decoded.userId;
                } catch { }
            }
        }

        // Try Authorization header
        if (!userId) {
            const authHeader = request.headers.get("Authorization");
            if (authHeader?.startsWith("Bearer ")) {
                try {
                    const privyToken = authHeader.split(" ")[1];
                    const payload = privyToken.split(".")[1];
                    const decoded = JSON.parse(Buffer.from(payload, "base64").toString());
                    userId = decoded.sub || decoded.userId;
                } catch { }
            }
        }

        if (!userId) {
            userId = 'default-user';
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
