/**
 * Debug endpoint to check token status
 * GET /api/tastytrade/debug
 */

import { NextResponse } from 'next/server';
import { getTastytradeTokens } from '@/lib/redis';
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
                // ignore decode errors
            }
        }

        // Get tokens
        const tokens = await getTastytradeTokens(userId);

        if (!tokens) {
            return NextResponse.json({
                status: 'no_tokens',
                userId,
                message: 'No tokens found for this user'
            });
        }

        // Check expiry
        const now = Date.now();
        const expiresIn = tokens.expiresAt - now;
        const isExpired = expiresIn < 0;

        return NextResponse.json({
            status: 'tokens_found',
            userId,
            hasAccessToken: !!tokens.accessToken,
            hasRefreshToken: !!tokens.refreshToken,
            accountNumber: tokens.accountNumber || 'not_stored',
            linkedAt: new Date(tokens.linkedAt).toISOString(),
            expiresAt: new Date(tokens.expiresAt).toISOString(),
            isExpired,
            expiresInMinutes: Math.round(expiresIn / 60000),
            // Don't expose actual tokens, just first/last chars
            accessTokenPreview: tokens.accessToken ? `${tokens.accessToken.substring(0, 8)}...${tokens.accessToken.slice(-4)}` : null,
            refreshTokenPreview: tokens.refreshToken ? `${tokens.refreshToken.substring(0, 8)}...${tokens.refreshToken.slice(-4)}` : null,
        });

    } catch (error) {
        return NextResponse.json({
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
