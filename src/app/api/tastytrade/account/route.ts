/**
 * Tastytrade Account API Route
 * Proxies to Tastytrade API using user's OAuth tokens
 * Strategy: Try API first, refresh on 401
 */

import { NextResponse } from 'next/server';
import { getTastytradeTokens, storeTastytradeTokens } from '@/lib/redis';
import { TASTYTRADE_CONFIG, refreshAccessToken } from '@/lib/tastytrade-oauth';
import { cookies } from 'next/headers';

export async function GET() {
    try {
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
                console.warn("[Account API] Could not decode Privy token");
            }
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

        // Try API call with current access token
        let accountResponse = await fetch(`${TASTYTRADE_CONFIG.apiBaseUrl}/customers/me/accounts`, {
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

