/**
 * Tastytrade Orders Close API Route
 * Executes opposite closing orders for an open spread
 */

import { NextResponse } from 'next/server';
import { getTastytradeTokens, storeTastytradeTokens } from '@/lib/redis';
import { cookies } from 'next/headers';
import { createSession } from '@/lib/tastytrade-api';
import { TASTYTRADE_CONFIG } from '@/lib/tastytrade-oauth';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { position, accountNum } = body;

        if (!position || !accountNum) {
            return NextResponse.json({ error: 'Missing position or account information' }, { status: 400 });
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
            } catch (err) { }
        }

        const tokens = await getTastytradeTokens(userId);
        if (!tokens || !tokens.refreshToken) {
            return NextResponse.json({ error: 'Not connected to Tastytrade' }, { status: 401 });
        }

        const clientId = process.env.TASTYTRADE_CLIENT_ID;
        const clientSecret = process.env.TASTYTRADE_CLIENT_SECRET;
        if (!clientId || !clientSecret) {
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        // Token refresh logic
        const tokenStillValid = tokens.expiresAt && tokens.expiresAt > Date.now();
        let accessToken = tokens.accessToken;

        if (!tokenStillValid || !accessToken) {
            try {
                const session = await createSession(clientId, clientSecret, tokens.refreshToken);
                accessToken = session.accessToken;
                await storeTastytradeTokens(userId, {
                    ...tokens,
                    refreshToken: session.refreshToken || tokens.refreshToken,
                    accessToken: session.accessToken,
                    expiresAt: session.expiresAt,
                });
            } catch (err) {
                return NextResponse.json({ error: 'Session expired. Please reconnect.' }, { status: 401 });
            }
        }

        // Build the closing order
        // For a CREDIT spread, we entered by Selling the Short Leg and Buying the Long Leg.
        // To close, we Buy to Close the Short Leg, and Sell to Close the Long Leg.
        const legs = [];

        if (position.type === 'PUT_CREDIT' || position.type?.includes('CREDIT') || position.strategy?.includes('CREDIT')) {
            // Short put gets bought (Buy to Close)
            if (position.short_symbol) {
                legs.push({
                    "instrument-type": "Equity Option",
                    "symbol": position.short_symbol,
                    "quantity": position.quantity,
                    "action": "Buy to Close"
                });
            } else {
                return NextResponse.json({ error: 'Missing short leg symbol from open position' }, { status: 400 });
            }
            // Long put gets sold (Sell to Close)
            if (position.long_symbol) {
                legs.push({
                    "instrument-type": "Equity Option",
                    "symbol": position.long_symbol,
                    "quantity": position.quantity,
                    "action": "Sell to Close"
                });
            }
        } else if (position.type === 'BEAR_CALL') {
            // Short call gets bought
            if (position.short_symbol) {
                legs.push({
                    "instrument-type": "Equity Option",
                    "symbol": position.short_symbol,
                    "quantity": position.quantity,
                    "action": "Buy to Close"
                });
            } else {
                return NextResponse.json({ error: 'Missing short leg symbol from open position' }, { status: 400 });
            }
            // Long call gets sold
            if (position.long_symbol) {
                legs.push({
                    "instrument-type": "Equity Option",
                    "symbol": position.long_symbol,
                    "quantity": position.quantity,
                    "action": "Sell to Close"
                });
            }
        } else if (position.type === 'LONG_PUT') {
            // Leg out: Long put is sold to close
            if (position.long_symbol) {
                legs.push({
                    "instrument-type": "Equity Option",
                    "symbol": position.long_symbol,
                    "quantity": position.quantity,
                    "action": "Sell to Close"
                });
            }
        } else if (position.type === 'SHORT_PUT') {
            // Leg out: Short put is bought to close
            if (position.short_symbol) {
                legs.push({
                    "instrument-type": "Equity Option",
                    "symbol": position.short_symbol,
                    "quantity": position.quantity,
                    "action": "Buy to Close"
                });
            }
        } else {
            return NextResponse.json({ error: 'Unsupported position type for automatic closing' }, { status: 400 });
        }

        // Let's execute as a Market order for closing immediately
        // In reality, might want a limit order but for dashboard manual closes, Market is safest to guarantee fill.
        const orderPayload = {
            "time-in-force": "Day",
            "order-type": "Market",
            "legs": legs
        };

        const executeRes = await fetch(`${TASTYTRADE_CONFIG.apiBaseUrl}/accounts/${accountNum}/orders`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(orderPayload)
        });

        if (!executeRes.ok) {
            const errRes = await executeRes.text();
            console.error('Failed to submit close order', errRes);
            return NextResponse.json({ error: `Close rejected by broker: ${executeRes.status}` }, { status: 400 });
        }

        const executeData = await executeRes.json();

        return NextResponse.json({ success: true, order: executeData });

    } catch (err: any) {
        return NextResponse.json({ error: 'Failed to close position', details: err.message }, { status: 500 });
    }
}


