import { NextResponse } from 'next/server';
import { getTastytradeTokens, storeTastytradeTokens } from '@/lib/redis';
import { TASTYTRADE_CONFIG, refreshAccessToken } from '@/lib/tastytrade-oauth';
import { getPrivyUserId } from '@/lib/auth-helpers';

export async function GET() {
    try {
        const userId = await getPrivyUserId();
        if (!userId) {
            return NextResponse.json({ error: 'Not connected to Tastytrade' }, { status: 401 });
        }

        // Get tokens from Redis
        const tokens = await getTastytradeTokens(userId);
        if (!tokens || !tokens.accessToken) {
            console.log("[Account API] No tokens found for user:", userId);
            return NextResponse.json(
                { error: 'Not connected to Tastytrade' },
                { status: 401 }
            );
        }

        console.log("[Account API] Tokens found, hasRefreshToken:", !!tokens.refreshToken);
        console.log("[Account API] Access token preview:", tokens.accessToken.substring(0, 30) + "...");
        console.log("[Account API] API Base URL:", TASTYTRADE_CONFIG.apiBaseUrl);

        // Try API call with current access token
        const apiUrl = `${TASTYTRADE_CONFIG.apiBaseUrl}/customers/me/accounts`;
        console.log("[Account API] Fetching from:", apiUrl);

        let accountResponse = await fetch(apiUrl, {
            headers: {
                'Authorization': `Bearer ${tokens.accessToken}`,
                'Accept': 'application/json',
                'User-Agent': 'trademind/1.0'
            }
        });

        // If 401, try refreshing token
        if (accountResponse.status === 401 && tokens.refreshToken) {
            console.log("[Account API] Got 401, attempting token refresh...");
            try {
                const newTokens = await refreshAccessToken(tokens.refreshToken);
                console.log("[Account API] Refresh successful!");

                // Update stored tokens
                await storeTastytradeTokens(userId, {
                    ...tokens,
                    ...tokens,
                    accessToken: newTokens.access_token,
                    // If Tastytrade rotates refresh tokens, save the new one
                    refreshToken: newTokens.refresh_token || tokens.refreshToken,
                    expiresAt: Date.now() + (newTokens.expires_in * 1000),
                });

                // Retry with new token
                accountResponse = await fetch(`${TASTYTRADE_CONFIG.apiBaseUrl}/customers/me/accounts`, {
                    headers: {
                        'Authorization': `Bearer ${newTokens.access_token}`,
                        'Accept': 'application/json',
                        'User-Agent': 'trademind/1.0'
                    }
                });
            } catch (refreshError: any) {
                console.error("[Account API] Refresh failed:", refreshError);
                return NextResponse.json(
                    { error: `Session expired: ${refreshError?.message || 'Unknown error'}` },
                    { status: 401 }
                );
            }
        }

        if (!accountResponse.ok) {
            const errorText = await accountResponse.text();
            console.error('[Account API] Tastytrade error:', accountResponse.status, errorText);
            return NextResponse.json(
                { error: `Tastytrade API error: ${accountResponse.status}` },
                { status: accountResponse.status }
            );
        }

        const data = await accountResponse.json();
        return NextResponse.json(data);

    } catch (error) {
        console.error('[Account API] Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch account data' },
            { status: 500 }
        );
    }
}

