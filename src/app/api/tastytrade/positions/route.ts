import { NextRequest, NextResponse } from 'next/server';
import { getTastytradeTokens, storeTastytradeTokens } from '@/lib/redis';
import { TASTYTRADE_CONFIG, refreshAccessToken } from '@/lib/tastytrade-oauth';
import { getPrivyUserId } from '@/lib/auth-helpers';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const accountNumber = searchParams.get('accountNumber');

        if (!accountNumber) {
            return NextResponse.json({ error: 'accountNumber is required' }, { status: 400 });
        }

        const userId = await getPrivyUserId(request as NextRequest);
        if (!userId) {
            return NextResponse.json({ error: 'Not connected to Tastytrade' }, { status: 401 });
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
                    'User-Agent': 'TradeMind/1.0',
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
