/**
 * TQQQ Positions API Route
 * Fetches raw positions from Tastytrade and groups them into TQQQ Spreads.
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
            return NextResponse.json({ error: `Tastytrade API error: ${response.status}` }, { status: response.status });
        }

        const data = await response.json();

        // --- Group raw positions into spreads ---
        const items: any[] = data.data?.items || [];

        // Filter for TQQQ Options
        const tqqqOptions = items.filter(p => p['instrument-type'] === 'Equity Option' && p['underlying-symbol'] === 'TQQQ');

        // Group by expiration date
        const byExpiry: Record<string, any[]> = {};
        for (const opt of tqqqOptions) {
            // tastytrade option symbol format: TQQQ  260320P00045000 -> date is 260320 (YYMMDD)
            const sym = opt.symbol as string;
            // The "expires-at" is also usually in the response, let's just group by that or parse symbol.
            // But Tastytrade positions array usually has 'expires-at' if it's an option.
            const expiresAt = opt['expires-at'] || sym;
            byExpiry[expiresAt] = byExpiry[expiresAt] || [];
            byExpiry[expiresAt].push(opt);
        }

        const spreads = [];

        // Analyze each expiration bucket to find spreads
        for (const [expiry, legs] of Object.entries(byExpiry)) {
            // Divide into short and long puts/calls
            const shortPuts = legs.filter(l => l.quantity < 0 && l['call-or-put'] === 'PUT');
            const longPuts = legs.filter(l => l.quantity > 0 && l['call-or-put'] === 'PUT');
            const shortCalls = legs.filter(l => l.quantity < 0 && l['call-or-put'] === 'CALL');
            const longCalls = legs.filter(l => l.quantity > 0 && l['call-or-put'] === 'CALL');

            // Build Put Spreads
            for (const sp of shortPuts) {
                // Find matching long put (usually lowest strike below short put for a credit spread)
                const spQuantity = Math.abs(sp.quantity);
                const matchingLp = longPuts.find(lp => lp.quantity >= spQuantity && parseFloat(lp['strike-price']) < parseFloat(sp['strike-price']));

                let spreadInfo: any = {
                    id: sp.symbol + '_spread',
                    symbol: 'TQQQ',
                    strategy: 'TQQQ Spread (PUT)',
                    type: 'PUT_CREDIT',
                    short_strike: parseFloat(sp['strike-price']),
                    short_symbol: sp.symbol,
                    expiry: sp['expires-at'] || expiry,
                    quantity: spQuantity,
                    created_at: sp['created-at'] || new Date().toISOString(),
                    status: 'OPEN'
                };

                // Calculate PnL = (Average Open Price - Current Price) * Multiplier * Quantity
                const mult = parseFloat(sp['multiplier'] || '100');

                if (matchingLp) {
                    spreadInfo.long_strike = parseFloat(matchingLp['strike-price']);
                    spreadInfo.long_symbol = matchingLp.symbol;

                    // Spread PnL = Short Leg PnL + Long Leg PnL
                    const spOpen = parseFloat(sp['average-open-price']);
                    const spCur = parseFloat(sp['mark-price'] || sp['average-open-price']); // fallback
                    const spPnl = (spOpen - spCur) * mult * spQuantity;

                    const lpOpen = parseFloat(matchingLp['average-open-price']);
                    const lpCur = parseFloat(matchingLp['mark-price'] || matchingLp['average-open-price']);
                    const lpPnl = (lpCur - lpOpen) * mult * spQuantity;

                    spreadInfo.entry_debit = lpOpen - spOpen; // Net cost (negative means credit)
                    spreadInfo.current_value = lpCur - spCur;
                    spreadInfo.unrealized_pnl = spPnl + lpPnl;

                    // Reduce matching quantity so we don't reuse it 
                    matchingLp.quantity -= spQuantity;
                } else {
                    // Naked Short Put (or leg out state)
                    spreadInfo.strategy = 'TQQQ Leg-Out (Short Put)';
                    spreadInfo.type = 'SHORT_PUT';
                    const spOpen = parseFloat(sp['average-open-price']);
                    const spCur = parseFloat(sp['mark-price'] || sp['average-open-price']);
                    spreadInfo.entry_debit = -spOpen;
                    spreadInfo.current_value = -spCur;
                    spreadInfo.unrealized_pnl = (spOpen - spCur) * mult * spQuantity;
                }

                spreads.push(spreadInfo);
            }

            // Any remaining long puts are long put leg-outs
            for (const lp of longPuts.filter(l => l.quantity > 0)) {
                const mult = parseFloat(lp['multiplier'] || '100');
                const open = parseFloat(lp['average-open-price']);
                const cur = parseFloat(lp['mark-price'] || lp['average-open-price']);

                spreads.push({
                    id: lp.symbol + '_long',
                    symbol: 'TQQQ',
                    strategy: 'TQQQ Leg-Out (Long Put)',
                    type: 'LONG_PUT',
                    strike: parseFloat(lp['strike-price']),
                    long_symbol: lp.symbol,
                    expiry: lp['expires-at'] || expiry,
                    quantity: lp.quantity,
                    entry_debit: open,
                    current_value: cur,
                    unrealized_pnl: (cur - open) * mult * lp.quantity,
                    created_at: lp['created-at'] || new Date().toISOString(),
                    status: 'OPEN'
                });
            }

            // Build Call Spreads (similar logic)
            for (const sc of shortCalls) {
                const scQuantity = Math.abs(sc.quantity);
                const matchingLc = longCalls.find(lc => lc.quantity >= scQuantity && parseFloat(lc['strike-price']) > parseFloat(sc['strike-price']));

                let spreadInfo: any = {
                    id: sc.symbol + '_spread',
                    symbol: 'TQQQ',
                    strategy: 'TQQQ Spread (CALL)',
                    type: 'BEAR_CALL',
                    short_strike: parseFloat(sc['strike-price']),
                    short_symbol: sc.symbol,
                    expiry: sc['expires-at'] || expiry,
                    quantity: scQuantity,
                    created_at: sc['created-at'] || new Date().toISOString(),
                    status: 'OPEN'
                };

                const mult = parseFloat(sc['multiplier'] || '100');

                if (matchingLc) {
                    spreadInfo.long_strike = parseFloat(matchingLc['strike-price']);
                    spreadInfo.long_symbol = matchingLc.symbol;

                    const scOpen = parseFloat(sc['average-open-price']);
                    const scCur = parseFloat(sc['mark-price'] || sc['average-open-price']);
                    const scPnl = (scOpen - scCur) * mult * scQuantity;

                    const lcOpen = parseFloat(matchingLc['average-open-price']);
                    const lcCur = parseFloat(matchingLc['mark-price'] || matchingLc['average-open-price']);
                    const lcPnl = (lcCur - lcOpen) * mult * scQuantity;

                    spreadInfo.entry_debit = lcOpen - scOpen;
                    spreadInfo.current_value = lcCur - scCur;
                    spreadInfo.unrealized_pnl = scPnl + lcPnl;
                    matchingLc.quantity -= scQuantity;
                } else {
                    spreadInfo.strategy = 'TQQQ Leg-Out (Short Call)';
                    spreadInfo.type = 'SHORT_CALL';
                    const scOpen = parseFloat(sc['average-open-price']);
                    const scCur = parseFloat(sc['mark-price'] || sc['average-open-price']);
                    spreadInfo.entry_debit = -scOpen;
                    spreadInfo.current_value = -scCur;
                    spreadInfo.unrealized_pnl = (scOpen - scCur) * mult * scQuantity;
                }

                spreads.push(spreadInfo);
            }
        }

        return NextResponse.json({
            status: 'success',
            count: spreads.length,
            spreads: spreads,
            rawCount: tqqqOptions.length
        });

    } catch (err: any) {
        return NextResponse.json({ error: 'Failed to parse TQQQ positions', details: err.message }, { status: 500 });
    }
}
