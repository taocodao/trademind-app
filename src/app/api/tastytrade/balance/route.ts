/**
 * Tastytrade Balance API Route
 * Fetches real account balance from /accounts/{number}/balances
 * GET /api/tastytrade/balance?accountNumber=XXX
 */
import { NextResponse } from 'next/server';
import { getTastytradeTokens, storeTastytradeTokens } from '@/lib/redis';
import { TASTYTRADE_CONFIG, refreshAccessToken } from '@/lib/tastytrade-oauth';
import { cookies } from 'next/headers';

function getUserId(privyToken: string | undefined): string {
    if (!privyToken) return 'default-user';
    try {
        const payload = privyToken.split('.')[1];
        const decoded = JSON.parse(Buffer.from(payload, 'base64').toString());
        return decoded.sub || decoded.userId || 'default-user';
    } catch {
        return 'default-user';
    }
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const accountNumber = searchParams.get('accountNumber');

        if (!accountNumber) {
            return NextResponse.json({ error: 'accountNumber is required' }, { status: 400 });
        }

        const cookieStore = await cookies();
        const privyToken = cookieStore.get('privy-token')?.value;
        const userId = getUserId(privyToken);

        const tokens = await getTastytradeTokens(userId);
        if (!tokens?.accessToken) {
            return NextResponse.json({ error: 'Not connected to Tastytrade' }, { status: 401 });
        }

        const balanceUrl = `${TASTYTRADE_CONFIG.apiBaseUrl}/accounts/${accountNumber}/balances`;

        const doFetch = (accessToken: string) =>
            fetch(balanceUrl, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    Accept: 'application/json',
                    'User-Agent': 'TradeMind/1.0',
                },
            });

        let response = await doFetch(tokens.accessToken);

        if (response.status === 401 && tokens.refreshToken) {
            try {
                const newTokens = await refreshAccessToken(tokens.refreshToken);
                await storeTastytradeTokens(userId, {
                    ...tokens,
                    accessToken: newTokens.access_token,
                    refreshToken: newTokens.refresh_token || tokens.refreshToken,
                    expiresAt: Date.now() + newTokens.expires_in * 1000,
                });
                response = await doFetch(newTokens.access_token);
            } catch {
                return NextResponse.json({ error: 'Session expired' }, { status: 401 });
            }
        }

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[Balance API] Error:', response.status, errorText);
            return NextResponse.json(
                { error: `Tastytrade API error: ${response.status}` },
                { status: response.status }
            );
        }

        const raw = await response.json();
        const b = raw?.data;

        if (!b) {
            return NextResponse.json({ error: 'No balance data' }, { status: 404 });
        }

        // Normalize to a clean shape
        return NextResponse.json({
            accountNumber: b['account-number'] || accountNumber,
            cashAvailable: parseFloat(b['cash-available-to-withdraw'] ?? b['cash-available'] ?? '0'),
            buyingPower: parseFloat(
                b['derivative-buying-power'] ?? b['equity-buying-power'] ?? b['buying-power'] ?? '0'
            ),
            netLiquidatingValue: parseFloat(b['net-liquidating-value'] ?? '0'),
            dayTradingBuyingPower: parseFloat(b['day-trading-buying-power'] ?? b['day-equity-buying-power'] ?? '0'),
            equity: parseFloat(b['equity-buying-power'] ?? '0'),
            pendingCash: parseFloat(b['pending-cash'] ?? '0'),
        });
    } catch (err: any) {
        console.error('[Balance API] Unexpected error:', err);
        return NextResponse.json(
            { error: 'Failed to fetch balance', details: err.message },
            { status: 500 }
        );
    }
}
