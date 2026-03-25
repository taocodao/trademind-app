/**
 * GET /api/tastytrade/live-positions
 * Returns live equity positions from the user's linked Tastytrade account.
 * Used by the Pro positions page to show real holdings instead of virtual ledger.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTastytradeTokens, storeTastytradeTokens } from '@/lib/redis';
import { createSession, getAccounts } from '@/lib/tastytrade-api';
import { getPrivyUserId } from '@/lib/auth-helpers';

const TT_API = process.env.TASTYTRADE_API_BASE || 'https://api.tastyworks.com';

export async function GET(request: Request) {
    try {
        const userId = await getPrivyUserId(request as NextRequest);
        if (!userId) {
            return NextResponse.json({ error: 'Not authenticated', positions: [], connected: false }, { status: 401 });
        }

        const tokens = await getTastytradeTokens(userId);
        if (!tokens?.refreshToken) {
            return NextResponse.json({ positions: [], connected: false, message: 'No Tastytrade account linked' });
        }

        // Refresh token if expired
        const clientId     = process.env.TASTYTRADE_CLIENT_ID!;
        const clientSecret = process.env.TASTYTRADE_CLIENT_SECRET!;
        let accessToken = tokens.accessToken;
        if (!tokens.expiresAt || tokens.expiresAt <= Date.now()) {
            const sessionRes = await createSession(tokens.refreshToken, clientId, clientSecret);
            accessToken = sessionRes.accessToken;
            await storeTastytradeTokens(userId, { ...sessionRes, linkedAt: tokens.linkedAt ?? Date.now() });
        }

        // Get account number
        const accounts = await getAccounts(accessToken);
        const accountNumber = accounts[0]?.accountNumber;
        if (!accountNumber) {
            return NextResponse.json({ positions: [], connected: true, message: 'No account found' });
        }

        // Fetch positions from TT
        const posRes = await fetch(`${TT_API}/accounts/${accountNumber}/positions`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/json',
                'User-Agent': 'TradeMind/1.0',
            },
        });

        if (!posRes.ok) {
            const errText = await posRes.text();
            console.error('[live-positions] TT positions fetch failed:', posRes.status, errText);
            return NextResponse.json({ positions: [], connected: true, error: `TT API ${posRes.status}` });
        }

        const posData = await posRes.json();
        const rawPositions = posData?.data?.items || [];

        // Fetch balances (for cash / NLV)
        const balRes = await fetch(`${TT_API}/accounts/${accountNumber}/balances`, {
            headers: { Authorization: `Bearer ${accessToken}`, 'User-Agent': 'TradeMind/1.0' },
        });
        const balData = await balRes.json();
        const bal = balData?.data || {};
        const nlv         = parseFloat(bal['net-liquidating-value'] || '0') || 0;
        const cashBalance = parseFloat(bal['equity-buying-power']   || bal['cash-balance'] || '0') || 0;

        // Map TT positions → UI shape
        const positions = rawPositions.map((p: any) => {
            const qty        = parseFloat(p['quantity'] || p['quantity-direction-factor'] || '0');
            const avgCost    = parseFloat(p['average-open-price'] || p['average-yearly-market-close-price'] || '0');
            const closePrice = parseFloat(p['close-price'] || p['mark-price'] || avgCost.toString());
            const mktVal     = Math.abs(qty) * closePrice;
            const unrealized = (closePrice - avgCost) * Math.abs(qty);
            const unrealizedPct = avgCost > 0 ? ((closePrice - avgCost) / avgCost) * 100 : 0;

            return {
                symbol:             p['underlying-symbol'] || p['symbol'] || '?',
                quantity:           Math.abs(qty),
                averageOpenPrice:   avgCost,
                currentPrice:       closePrice,
                marketValue:        mktVal,
                unrealizedPnl:      unrealized,
                unrealizedPnlPct:   unrealizedPct,
                instrumentType:     p['instrument-type'] === 'Equity Option' ? 'Equity Option' : 'Equity',
                direction:          p['quantity-direction'] || 'Long',
            };
        });

        return NextResponse.json({
            connected: true,
            accountNumber,
            positions,
            balance: {
                cashAvailable:  cashBalance,
                buyingPower:    cashBalance,
                netLiquidation: nlv,
            },
        });

    } catch (err: any) {
        console.error('[live-positions] Error:', err);
        return NextResponse.json({ positions: [], connected: false, error: err?.message }, { status: 500 });
    }
}
