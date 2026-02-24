/**
 * Tastytrade Positions API Route
 * Fetches all active positions for a given account
 */
import { NextResponse } from 'next/server';
import { getTastytradeTokens, storeTastytradeTokens } from '@/lib/redis';
import { TASTYTRADE_CONFIG, refreshAccessToken } from '@/lib/tastytrade-oauth';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const accountNumber = searchParams.get('accountNumber');

        if (!accountNumber) {
            return NextResponse.json({ error: 'accountNumber is required' }, { status: 400 });
        }

        const cookieStore = await cookies();
        const privyToken = cookieStore.get("privy-token")?.value;
        let userId = "default-user";

        if (privyToken) {
            try {
                const payload = privyToken.split(".")[1];
                const decoded = JSON.parse(Buffer.from(payload, "base64").toString());
                userId = decoded.sub || decoded.userId || "default-user";
            } catch (err) { }
        }

        const tokens = await getTastytradeTokens(userId);
        if (!tokens || !tokens.accessToken) {
            return NextResponse.json({ error: 'Not connected to Tastytrade' }, { status: 401 });
        }

        let apiUrl = `${TASTYTRADE_CONFIG.apiBaseUrl}/accounts/${accountNumber}/positions`;

        const fetchPositions = async (accessToken: string) => {
            return fetch(apiUrl, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Accept': 'application/json',
                }
            });
        };

        let response = await fetchPositions(tokens.accessToken);

        if (response.status === 401 && tokens.refreshToken) {
            try {
                const newTokens = await refreshAccessToken(tokens.refreshToken);
                await storeTastytradeTokens(userId, {
                    ...tokens,
                    accessToken: newTokens.access_token,
                    refreshToken: newTokens.refresh_token || tokens.refreshToken,
                    expiresAt: Date.now() + (newTokens.expires_in * 1000),
                });
                response = await fetchPositions(newTokens.access_token);
            } catch (err) {
                return NextResponse.json({ error: 'Session expired' }, { status: 401 });
            }
        }

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[Positions API] Error:', response.status, errorText);
            return NextResponse.json({ error: `Tastytrade API error: ${response.status}` }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (err: any) {
        return NextResponse.json({ error: 'Failed to fetch positions', details: err.message }, { status: 500 });
    }
}
