/**
 * Execute All — IV-Switching Composite Signal (TurboCore Pro)
 *
 * Delta-based execution for BOTH TT-linked and virtual users:
 *   1. Compute TARGET quantities (virtual $25K NLV × target_pct / live price)
 *   2. Fetch CURRENT positions:
 *        TT user  → live Tastytrade account positions
 *        Virtual  → shadow_positions table
 *   3. Compute DELTA (target − current) per symbol
 *   4. Submit delta equity orders to TT (sells first, buys second)
 *   5. Submit options CCS/CSP order (TT users only)
 *   6. REPLACE shadow_positions with full target state
 *   7. Update virtual_accounts cash (net delta cost)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTastytradeTokens, storeTastytradeTokens } from '@/lib/redis';
import { createSession, getAccounts, getTTPositions, submitOptionsOrder } from '@/lib/tastytrade-api';
import { getPrivyUserId } from '@/lib/auth-helpers';
import { query } from '@/lib/db';

const TT_API = process.env.TASTYTRADE_API_BASE || 'https://api.tastyworks.com';
const STRATEGY = 'TQQQ_TURBOCORE_PRO';

// ── Live price fetch (Yahoo Finance) ──────────────────────────────────────────
async function fetchMarketPrices(symbols: string[]): Promise<Record<string, number>> {
    const fallbacks: Record<string, number> = {
        'QQQ': 480, 'QLD': 63, 'SGOV': 100, 'TQQQ': 50,
    };
    const prices: Record<string, number> = {};
    await Promise.allSettled(symbols.map(async (sym) => {
        if (sym.includes('LEAPS')) return;
        try {
            const url = `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=1d`;
            const res = await fetch(url, {
                headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
                signal: AbortSignal.timeout(5000),
            });
            if (!res.ok) return;
            const data = await res.json();
            const meta = data.chart?.result?.[0]?.meta;
            const price = meta?.regularMarketPrice ?? meta?.previousClose;
            if (price && price > 0) prices[sym] = price;
        } catch { /* ignore */ }
    }));
    for (const sym of symbols) {
        if (!prices[sym] && fallbacks[sym]) prices[sym] = fallbacks[sym];
    }
    return prices;
}

// ── Submit a single notional market equity order to TT ────────────────────────
async function submitEquityOrder(
    accessToken: string,
    accountNumber: string,
    symbol: string,
    qty: number,         // positive = buy, negative = sell
): Promise<{ orderId: string; status: string }> {
    const action = qty > 0 ? 'Buy to Open' : 'Sell to Close';
    const intQty = Math.round(Math.abs(qty));
    if (intQty === 0) {
        return { orderId: 'skipped', status: 'Fractional qty < 1 ignored' };
    }
    const orderBody = {
        'time-in-force': 'Day',
        'order-type':    'Market',
        legs: [{
            'instrument-type': 'Equity',
            symbol,
            quantity: String(intQty),
            action,
        }],
    };
    console.log(`[submitEquityOrder] ${action} ${Math.abs(qty)} ${symbol}`);
    const resp = await fetch(`${TT_API}/accounts/${accountNumber}/orders`, {
        method: 'POST',
        headers: {
            Authorization:  `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'User-Agent':   'TradeMind/1.0',
        },
        body: JSON.stringify(orderBody),
    });
    const data = await resp.json();
    if (!resp.ok) {
        const errMsg = data?.error?.message || data?.errors?.[0]?.message || JSON.stringify(data);
        throw new Error(`TT rejected ${action} ${symbol}: ${errMsg}`);
    }
    const order = data?.data?.order || data?.data || data;
    return {
        orderId: String(order?.id || order?.['order-id'] || 'unknown'),
        status:  String(order?.status || 'Live'),
    };
}

// ── Main handler ──────────────────────────────────────────────────────────────
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const userId = await getPrivyUserId(request as NextRequest);
        if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        // 1. Load signal
        const sigRes = await query(`SELECT data FROM signals WHERE id = $1`, [id]);
        if (!sigRes.rowCount || sigRes.rowCount === 0) {
            return NextResponse.json({ error: 'Signal not found' }, { status: 404 });
        }
        const sigData: any = sigRes.rows[0].data || {};
        const rawLegs: any[] = sigData.legs || [];

        const equityLegs  = rawLegs.filter(l =>
            l.leg_type === 'equity' || (l.target_pct !== undefined && !['BUY_TO_OPEN','SELL_TO_OPEN','BUY_TO_CLOSE','SELL_TO_CLOSE'].includes((l.action||'').toUpperCase()))
        );
        const allOptionsLegs = rawLegs.filter(l =>
            l.leg_type === 'options' || ['BUY_TO_OPEN','SELL_TO_OPEN','BUY_TO_CLOSE','SELL_TO_CLOSE'].includes((l.action||'').toUpperCase())
        );

        // SQQQ (and similar short ETFs) are stocks, not options contracts.
        // OCC option symbols are always ≥10 chars (e.g. "QQQ   260515C00612000").
        // Plain ticker legs (≤5 chars) in the IV-Switching options array are equity orders.
        const isOccSymbol = (sym: string) => sym.replace(/\s+/g,'').length > 6;
        const trueOptionsLegs   = allOptionsLegs.filter(l => isOccSymbol(l.symbol || ''));
        const equityInOptLegs   = allOptionsLegs.filter(l => !isOccSymbol(l.symbol || ''));
        // Merge equity-instrument legs from the options array into equity execution path
        const optionsLegs = trueOptionsLegs;

        console.log(`[approve-options] Signal ${id}: ${equityLegs.length} equity, ${optionsLegs.length} options legs`);

        // 2. Fetch live prices for equity symbols
        const equitySymbols = equityLegs
            .map(l => (l.symbol || '').replace(/_/g, '').toUpperCase())
            .filter(s => !s.includes('LEAPS') && s.length > 0);
        const livePrices = await fetchMarketPrices(equitySymbols);
        console.log(`[approve-options] Live prices:`, livePrices);

        // 3. Virtual NLV = cash + existing shadow position values
        let virtualCash = 25000;
        try {
            const vRes = await query(
                `SELECT cash_balance FROM virtual_accounts WHERE user_id = $1 AND strategy = $2`,
                [userId, STRATEGY]
            );
            if (vRes.rows.length > 0) virtualCash = parseFloat(vRes.rows[0].cash_balance);
        } catch { /* use default */ }

        const existingShadow = await query(
            `SELECT symbol, quantity, avg_price FROM shadow_positions WHERE user_id = $1 AND strategy = $2`,
            [userId, STRATEGY]
        ).catch(() => ({ rows: [] as any[] }));

        let shadowValue = 0;
        const shadowMap: Record<string, number> = {}; // symbol → qty in shadow
        for (const row of existingShadow.rows) {
            const sym = row.symbol.toUpperCase();
            const qty = Number(row.quantity);
            shadowMap[sym] = qty;
            shadowValue += qty * (livePrices[sym] || Number(row.avg_price));
        }
        const virtualNlv = virtualCash + shadowValue;
        console.log(`[approve-options] Virtual NLV: cash=${virtualCash.toFixed(0)} positions=${shadowValue.toFixed(0)} total=${virtualNlv.toFixed(0)}`);

        // 4. Compute TARGET quantities from virtual NLV
        const targetMap: Record<string, number> = {}; // symbol → target qty
        const priceMap:  Record<string, number> = {}; // symbol → live price (for cost calc)
        for (const leg of equityLegs) {
            const sym   = (leg.symbol || '').replace(/_/g, '').toUpperCase();
            if (!sym || sym.includes('LEAPS')) continue;
            const pct    = parseFloat(leg.target_pct) || 0;
            const price  = livePrices[sym] || 100;
            const target = Math.floor((virtualNlv * pct) / price);
            targetMap[sym] = target;
            priceMap[sym]  = price;
        }
        console.log(`[approve-options] Target:`, targetMap, '| Shadow current:', shadowMap);

        // 5. TT tokens
        const tokens = await getTastytradeTokens(userId);
        const hasTT  = !!(tokens?.refreshToken);
        let accessToken   = tokens?.accessToken ?? '';
        let accountNumber = '';

        if (hasTT) {
            const clientId     = process.env.TASTYTRADE_CLIENT_ID!;
            const clientSecret = process.env.TASTYTRADE_CLIENT_SECRET!;
            if (!tokens!.expiresAt || tokens!.expiresAt <= Date.now()) {
                const sessionRes = await createSession(tokens!.refreshToken, clientId, clientSecret);
                accessToken = sessionRes.accessToken;
                await storeTastytradeTokens(userId, { ...sessionRes, linkedAt: tokens!.linkedAt ?? Date.now() });
            }
            const accounts = await getAccounts(accessToken);
            accountNumber  = accounts[0]?.accountNumber ?? '';
        }

        // 6. Fetch CURRENT positions for delta computation
        let currentMap: Record<string, number> = {}; // symbol → current qty
        if (hasTT && accountNumber) {
            // TT user: get actual live positions
            currentMap = await getTTPositions(accessToken, accountNumber, Object.keys(targetMap));
            console.log(`[approve-options] TT live positions:`, currentMap);
        } else {
            // Virtual user: shadow_positions IS the current state
            currentMap = { ...shadowMap };
            console.log(`[approve-options] Virtual current positions:`, currentMap);
        }

        // 7. Compute delta per symbol
        const deltaOrders: Array<{symbol: string; delta: number; price: number; targetQty: number}> = [];
        for (const sym of Object.keys(targetMap)) {
            const target  = targetMap[sym] ?? 0;
            const current = currentMap[sym]  ?? 0;
            const delta   = target - current;
            if (delta === 0) {
                console.log(`[approve-options] ${sym}: no change (target=${target} current=${current})`);
                continue;
            }
            deltaOrders.push({ symbol: sym, delta, price: priceMap[sym], targetQty: target });
        }

        // Also handle symbols we hold but target is 0 (full exits)
        for (const sym of Object.keys(currentMap)) {
            if (!(sym in targetMap) && currentMap[sym] > 0) {
                deltaOrders.push({ symbol: sym, delta: -currentMap[sym], price: livePrices[sym] || priceMap[sym] || 100, targetQty: 0 });
            }
        }

        // SELLS before BUYS
        deltaOrders.sort((a, b) => (a.delta < 0 ? -1 : 1) - (b.delta < 0 ? -1 : 1));
        console.log(`[approve-options] Delta orders:`, deltaOrders.map(o => `${o.delta > 0 ? 'BUY' : 'SELL'} ${Math.abs(o.delta)} ${o.symbol}`));

        const results: any = { equity: [], options: null, optionsError: null, virtual: !hasTT };

        // 8. Submit equity delta orders
        if (hasTT && accountNumber) {
            for (const order of deltaOrders) {
                try {
                    const r = await submitEquityOrder(accessToken, accountNumber, order.symbol, order.delta);
                    results.equity.push({ ...order, ttOrderId: r.orderId, status: r.status });
                } catch (e: any) {
                    console.warn(`[approve-options] Equity order failed for ${order.symbol}:`, e.message);
                    results.equity.push({ ...order, error: e.message });
                }
            }

            // 8b. Submit equity-instrument legs that were in the options array (e.g. SQQQ shares)
            for (const leg of equityInOptLegs) {
                const sym = (leg.symbol || '').trim().toUpperCase();
                const qty = Math.abs(leg.qty || leg.quantity || 0);
                if (!sym || qty <= 0) continue;
                try {
                    const r = await submitEquityOrder(accessToken, accountNumber, sym, qty);
                    results.equity.push({ symbol: sym, delta: qty, ttOrderId: r.orderId, status: r.status, note: 'equity-in-options-leg' });
                    console.log(`[approve-options] Equity-in-options-leg submitted: BUY ${qty} ${sym}`);
                } catch (e: any) {
                    console.warn(`[approve-options] Equity-in-options-leg failed for ${sym}:`, e.message);
                    results.equity.push({ symbol: sym, delta: qty, error: e.message });
                }
            }

            // ── Resolve authoritative OCC symbols from TT's option chain ───────
            // Never trust hand-built OCC symbols. Query /option-chains/QQQ/nested
            // to get the exact symbol TT has in its catalog for the closest available
            // strike to the signal's computed strike, then use that for submission.
            const resolvedLegs = await Promise.all(optionsLegs.map(async (leg: any) => {
                const rawSym: string = (leg.symbol || '').trim();
                // Only resolve QQQ equity options (OCC format: starts with QQQ)
                if (!rawSym.startsWith('QQQ') || rawSym.length < 15) return leg;

                try {
                    // Parse the signal's computed strike from the OCC symbol
                    // OCC format: "QQQ   YYMMDDCSSSSSSSS" — strike = last 8 digits / 1000
                    const strikePart = rawSym.replace(/\s/g, '').slice(-8); // last 8 chars
                    const signalStrike = parseInt(strikePart, 10) / 1000;
                    const isCall = rawSym.includes('C');

                    // Fetch TT's live option chain
                    const chainUrl = `${TT_API}/option-chains/QQQ/nested`;
                    const chainResp = await fetch(chainUrl, {
                        headers: { Authorization: `Bearer ${accessToken}`, 'User-Agent': 'TradeMind/1.0' },
                    });
                    if (!chainResp.ok) {
                        console.warn(`[approve-options] Option chain fetch failed (${chainResp.status}) — using original symbol`);
                        return leg;
                    }
                    const chainData = await chainResp.json();
                    // TT /option-chains/{sym}/nested structure:
                    //   data.items = [ { expirations: [...], underlying-symbol: "QQQ", ... } ]
                    // items[0] is the underlying wrapper — NOT an array of expirations.
                    // Expirations are one level deeper at items[0].expirations[].
                    const chainWrapper = chainData?.data?.items?.[0];
                    const expirations: any[] = chainWrapper?.expirations || [];

                    // Find the expiration date from the OCC symbol (YYMMDD at positions 6-12).
                    // Note: OCC always uses the official 3rd Friday date (e.g. 2026-06-19 = Juneteenth)
                    // even when markets are closed that day. Our lookup must handle ±1 day tolerance.
                    const occNoSpace = rawSym.replace(/\s/g, '');
                    const yymmdd = occNoSpace.slice(3, 9); // e.g. "260619"
                    const targetDateStr = `20${yymmdd.slice(0,2)}-${yymmdd.slice(2,4)}-${yymmdd.slice(4,6)}`;
                    const targetTs = new Date(targetDateStr).getTime();

                    // Log what TT actually has — critical for debugging
                    const expDates = expirations.map((e: any) => e['expiration-date']).slice(0, 20);
                    console.log(`[approve-options] QQQ chain expirations (first 20):`, expDates);
                    console.log(`[approve-options] Signal target expiration: ${targetDateStr}`);

                    // Find closest expiration within ±14 days of signal's OCC date
                    let exp = expirations
                        .filter((e: any) => !isNaN(new Date(e['expiration-date']).getTime()) &&
                            Math.abs(new Date(e['expiration-date']).getTime() - targetTs) <= 14 * 86400000)
                        .sort((a: any, b: any) =>
                            Math.abs(new Date(a['expiration-date']).getTime() - targetTs) -
                            Math.abs(new Date(b['expiration-date']).getTime() - targetTs)
                        )[0];

                    // Fallback: find by DTE closest to 45 days (the signal's target DTE)
                    if (!exp) {
                        const today = Date.now();
                        exp = expirations
                            .filter((e: any) => !isNaN(new Date(e['expiration-date']).getTime()) &&
                                new Date(e['expiration-date']).getTime() > today)
                            .sort((a: any, b: any) => {
                                const dteDiff = (x: any) => Math.abs((new Date(x['expiration-date']).getTime() - targetTs));
                                return dteDiff(a) - dteDiff(b);
                            })[0];
                        if (exp) console.log(`[approve-options] Date match failed — using DTE fallback: ${exp['expiration-date']}`);
                    }

                    if (!exp) {
                        console.warn(`[approve-options] No expiration near ${targetDateStr} in TT chain (${expirations.length} total) — using original`);
                        return leg;
                    }

                    // Find closest available strike in TT's catalog
                    const strikes: any[] = exp.strikes || [];
                    const closest = strikes.reduce((best: any, s: any) => {
                        const sp = parseFloat(s['strike-price']);
                        const bestSp = parseFloat(best['strike-price']);
                        return Math.abs(sp - signalStrike) < Math.abs(bestSp - signalStrike) ? s : best;
                    });

                    const catalogSymbol: string | null = isCall ? closest.call : closest.put;
                    if (!catalogSymbol) {
                        console.warn(`[approve-options] No catalog symbol for QQQ ${closest['strike-price']} ${isCall ? 'C' : 'P'} — using original`);
                        return leg;
                    }

                    const chosenStrike = parseFloat(closest['strike-price']);
                    console.log(`[approve-options] ✅ OCC resolved: signal=${rawSym.trim()} (strike $${signalStrike}) → catalog=${catalogSymbol.trim()} (strike $${chosenStrike}) exp=${exp['expiration-date']}`);
                    return { ...leg, symbol: catalogSymbol };

                } catch (resolveErr: any) {
                    console.warn(`[approve-options] Symbol resolution failed for ${rawSym} — using original:`, resolveErr.message);
                    return leg;
                }
            }));

            // 9. Submit options order (TT only)
            if (optionsLegs.length > 0) {
                try {
                    const limitPrice: number | null = sigData.cost && parseFloat(sigData.cost) > 0
                        ? parseFloat(sigData.cost)
                        : null;
                    console.log('[approve-options] Options legs (resolved) to submit:', JSON.stringify(resolvedLegs, null, 2));
                    results.options = await submitOptionsOrder(accessToken, accountNumber, resolvedLegs, limitPrice, 'Limit');
                    console.log(`[approve-options] Options submitted:`, results.options);
                } catch (e: any) {
                    console.error('[approve-options] Options order FAILED:', e.message);
                    results.optionsError = e.message;
                }
            } else {
                console.warn('[approve-options] No options legs found in signal. rawLegs structure:', JSON.stringify(rawLegs.map((l: any) => ({leg_type: l.leg_type, action: l.action, symbol: l.symbol}))));
            }
        } else {
            // Virtual: record delta for tracking (no real order)
            results.equity = deltaOrders.map((o: any) => ({ ...o, virtual: true }));
        }

        // 10. REPLACE shadow_positions with full TARGET state (equity)
        const netCashDelta = deltaOrders.reduce((acc, o) => acc - o.delta * o.price, 0);
        try {
            await query(
                `DELETE FROM shadow_positions WHERE user_id = $1 AND strategy = $2 AND instrument_type = 'equity'`,
                [userId, STRATEGY]
            );
            for (const sym of Object.keys(targetMap)) {
                const qty = targetMap[sym];
                if (qty <= 0) continue;
                const price = priceMap[sym];
                await query(
                    `INSERT INTO shadow_positions (user_id, strategy, symbol, quantity, avg_price, signal_id, executed_at, instrument_type)
                     VALUES ($1, $2, $3, $4, $5, $6, NOW(), 'equity')
                     ON CONFLICT (user_id, strategy, symbol)
                     DO UPDATE SET quantity = $4, avg_price = $5, signal_id = $6, executed_at = NOW(), instrument_type = 'equity'`,
                    [userId, STRATEGY, sym, qty, price, id]
                );
            }

            // 10b. Persist options legs to shadow_positions:
            //   - TT users:      only if the options order actually succeeded (no error)
            //   - Virtual users: always save for Positions tab tracking
            const optionsSucceeded = hasTT ? !results.optionsError : true;
            if (optionsLegs.length > 0 && optionsSucceeded) {
                await query(
                    `DELETE FROM shadow_positions WHERE user_id = $1 AND strategy = $2 AND instrument_type = 'options'`,
                    [userId, STRATEGY]
                );
                const limitPrice: number = sigData.cost && parseFloat(sigData.cost) > 0
                    ? parseFloat(sigData.cost) : 0;
                for (const leg of optionsLegs) {
                    const occSym = (leg.symbol || '').trim();
                    const qty    = Math.abs(leg.qty || leg.quantity || 1);
                    const action = (leg.action || '').toUpperCase();
                    await query(
                        `INSERT INTO shadow_positions
                            (user_id, strategy, symbol, quantity, avg_price, signal_id, executed_at, instrument_type, leg_action)
                         VALUES ($1, $2, $3, $4, $5, $6, NOW(), 'options', $7)
                         ON CONFLICT (user_id, strategy, symbol)
                         DO UPDATE SET quantity=$4, avg_price=$5, signal_id=$6, executed_at=NOW(), instrument_type='options', leg_action=$7`,
                        [userId, STRATEGY, occSym, qty, limitPrice, id, action]
                    );
                }
                console.log(`[approve-options] Saved ${optionsLegs.length} options legs to shadow_positions`);
            } else if (optionsLegs.length > 0) {
                console.log(`[approve-options] Skipping options shadow save — TT order failed, no phantom position created`);
            }

            // Update virtual cash
            const newCash = Math.max(0, virtualCash + netCashDelta);
            await query(
                `INSERT INTO virtual_accounts (user_id, strategy, cash_balance) VALUES ($1, $2, $3)
                 ON CONFLICT (user_id, strategy) DO UPDATE SET cash_balance = $3, updated_at = NOW()`,
                [userId, STRATEGY, newCash]
            );
            console.log(`[approve-options] Shadow→target. Cash: ${virtualCash.toFixed(0)} → ${newCash.toFixed(0)} (Δ${netCashDelta.toFixed(0)})`);
        } catch (shadowErr: any) {
            console.warn('[approve-options] Shadow update failed:', shadowErr.message);
        }


        // 11. Record execution
        await query(
            `INSERT INTO user_signal_executions (user_id, signal_id, status, created_at)
             VALUES ($1, $2, 'executed', NOW()) ON CONFLICT (user_id, signal_id)
             DO UPDATE SET status = 'executed', executed_at = NOW()`,
            [userId, id]
        );

        return NextResponse.json({
            status:  results.optionsError ? 'partial' : 'success',
            message: hasTT ? 'Delta orders submitted to Tastytrade' : 'Virtual shadow positions updated to target',
            virtual: !hasTT,
            equity:  results.equity,
            options: results.options,
            optionsError: results.optionsError || null,
            deltas: deltaOrders.map(o => `${o.delta > 0 ? '+' : ''}${o.delta} ${o.symbol}`),
        });

    } catch (err: any) {
        console.error('[approve-options] Error:', err);
        return NextResponse.json({ status: 'failed', error: err?.message || String(err) }, { status: 500 });
    }
}
