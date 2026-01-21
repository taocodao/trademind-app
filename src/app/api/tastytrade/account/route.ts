/**
 * Tastytrade Account API Route
 * Proxies to Python backend server that uses the SDK
 */

import { NextResponse } from 'next/server';
import { getTastytradeTokens } from '@/lib/redis';
import { TASTYTRADE_CONFIG } from '@/lib/tastytrade-oauth';
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
            } catch {
                console.warn("Could not decode Privy token");
            }
        }

        // Get tokens
        const tokens = await getTastytradeTokens(userId);
        if (!tokens || !tokens.accessToken) {
            return NextResponse.json(
                { error: 'Not connected to Tastytrade' },
                { status: 401 }
            );
        }

        // Fetch accounts directly from Tastytrade
        const response = await fetch(`${TASTYTRADE_CONFIG.apiBaseUrl}/customers/me/accounts`, {
            headers: {
                'Authorization': `${tokens.accessToken}`, // Tastytrade expects token directly or Bearer? Usually Bearer, but check SDK. 
                // Wait, typically it's 'Authorization': <token> or 'Authorization': 'Bearer <token>'
                // Based on standard oauth, it's Bearer.
                // But let's check lib/tastytrade-oauth.ts usage if any.
                // The snippet `Authorization: \`Bearer ${tokenResponse.access_token}\`` in callback/route.ts used Bearer.
            },
        });

        // Actually, let's stick to standard Bearer format.
        // Re-reading SDK docs or existing code...
        // callback/route.ts uses `Bearer ${tokenResponse.access_token}`.

        const accountResponse = await fetch(`${TASTYTRADE_CONFIG.apiBaseUrl}/customers/me/accounts`, {
            headers: {
                'Authorization': `Bearer ${tokens.accessToken}`,
                'Accept': 'application/json'
            }
        });

        if (!accountResponse.ok) {
            const errorText = await accountResponse.text();
            console.error('Tastytrade Account Fetch Error:', errorText);
            return NextResponse.json(
                { error: `Tastytrade API error: ${accountResponse.status}` },
                { status: accountResponse.status }
            );
        }

        const data = await accountResponse.json();

        // Enrich with positions? (Optional, maybe separate endpoint)
        // For now, return account list.
        return NextResponse.json(data);

    } catch (error) {
        console.error('Account fetch error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch account data' },
            { status: 500 }
        );
    }
}

