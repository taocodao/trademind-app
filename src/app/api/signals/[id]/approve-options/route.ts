/**
 * Execute All — IV-Switching Composite Signal (TurboCore Pro)
 *
 * Unified execution path for BOTH TT-linked and virtual users:
 *   1. Fetch live market prices (Yahoo Finance / last close if market closed)
 *   2. Compute share quantities from real prices
 *   3. If TT linked: submit equity + options orders to Tastytrade
 *   4. ALWAYS: replace shadow_positions with current allocation at real prices
 *   5. Record execution in user_signal_executions
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTastytradeTokens, storeTastytradeTokens } from '@/lib/redis';
import { createSession, getAccounts, submitOptionsOrder } from '@/lib/tastytrade-api';
import { getPrivyUserId } from '@/lib/auth-helpers';
import { query } from '@/lib/db';

const TT_API = process.env.TASTYTRADE_API_BASE || 'https://api.tastyworks.com';

// ── Live price fetch (Yahoo Finance — works for market hours and after-hours/close) ──────
async function fetchMarketPrices(symbols: string[]): Promise<Record<string, number>> {
    const prices: Record<string, number> = {};
    const fallbacks: Record<string, number> = {
        'QQQ': 480, 'QLD': 63, 'SGOV': 100, 'TQQQ': 50, 'QQQ_LEAPS': 0,
    };
    await Promise.allSettled(symbols.map(async (sym) => {
        if (sym === 'QQQ_LEAPS' || sym.includes('LEAPS')) return;
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
    // Fill in any missing symbols with fallbacks
    for (const sym of symbols) {
        if (!prices[sym] && fallbacks[sym]) prices[sym] = fallbacks[sym];
    }
    return prices;
}

// ── Submit a single equity market order to TT ──────────────────────────────────────────
async function submitEquityLeg(
    accessToken: string,
    accountNumber: string,
    symbol: string,
    shares: number,
    action: 'Buy to Open' | 'Sell to Close'
) {
    const body = {
        'time-in-force': 'Day',
        'order-type':    'Market',
        'legs': [{
            'instrument-type': 'Equity',
            'symbol':           symbol.replace(/_/g, ''),
            'quantity':         String(Math.max(1, Math.floor(shares))),
            'action':           action,
        }],
    };
    const resp = await fetch(`${TT_API}/accounts/${accountNumber}/orders`, {
        method:  'POST',
        headers: {
            Authorization:  `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'User-Agent':   'TradeMind/1.0',
        },
        body: JSON.stringify(body),
    });
    const data = await resp.json();
    if (!resp.ok) {
        const msg = data?.error?.message || data?.errors?.[0]?.message || JSON.stringify(data);
        throw new Error(`Equity order failed for ${symbol}: ${msg}`);
    }
    return data?.data?.order || data;
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const userId = await getPrivyUserId(request as NextRequest);
        if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        // 1. Load signal from signals table
        const sigRes = await query(`SELECT data FROM signals WHERE id = $1`, [id]);
        if (!sigRes.rowCount || sigRes.rowCount === 0) {
            return NextResponse.json({ error: 'Signal not found' }, { status: 404 });
        }
        const sigData: any = sigRes.rows[0].data || {};
        const rawLegs: any[] = sigData.legs || [];

        console.log(`[approve-options] Signal ${id}: ${rawLegs.length} legs`);

        const equityLegs  = rawLegs.filter(l => l.leg_type === 'equity'  || (l.target_pct !== undefined && !l.action?.includes('TO_')));
        const optionsLegs = rawLegs.filter(l => l.leg_type === 'options' || l.action?.includes('TO_OPEN') || l.action?.includes('TO_CLOSE'));

        // 2. Fetch live market prices for all equity symbols
        const equitySymbols = equityLegs.map(l => (l.symbol || '').replace(/_/g, '').toUpperCase()).filter(s => !s.includes('LEAPS'));
        const livePrices = await fetchMarketPrices(equitySymbols);
        console.log(`[approve-options] Live prices:`, livePrices);

        // 3. Compute share quantities using real market prices
        const equityOrders: Array<{ symbol: string; shares: number; price: number; pct: number }> = [];
        const virtualNlv = 25000; // Default notional for virtual accounts

        // 4. Get TT tokens (determines whether we submit real orders or virtual only)
        const tokens = await getTastytradeTokens(userId);
        const hasTT  = !!(tokens?.refreshToken);

        let accessToken = tokens?.accessToken ?? '';
        let accountNumber = '';
        let nlv = virtualNlv;

        if (hasTT) {
            // Refresh token if expired
            const clientId     = process.env.TASTYTRADE_CLIENT_ID!;
            const clientSecret = process.env.TASTYTRADE_CLIENT_SECRET!;
            if (!tokens!.expiresAt || tokens!.expiresAt <= Date.now()) {
                const sessionRes = await createSession(tokens!.refreshToken, clientId, clientSecret);
                accessToken = sessionRes.accessToken;
                await storeTastytradeTokens(userId, { ...sessionRes, linkedAt: tokens!.linkedAt ?? Date.now() });
            }
            const accounts = await getAccounts(accessToken);
            accountNumber  = accounts[0]?.accountNumber ?? '';
            if (accountNumber) {
                const balResp = await fetch(`${TT_API}/accounts/${accountNumber}/balances`, {
                    headers: { Authorization: `Bearer ${accessToken}`, 'User-Agent': 'TradeMind/1.0' },
                });
                const balData = await balResp.json();
                nlv = parseFloat(balData?.data?.['net-liquidating-value'] || virtualNlv.toString()) || virtualNlv;
            }
        }

        // Build equity order list using real NLV + live prices
        for (const leg of equityLegs) {
            const sym  = (leg.symbol || '').replace(/_/g, '').toUpperCase();
            if (sym.includes('LEAPS')) continue;
            const pct   = parseFloat(leg.target_pct) || 0;
            const price = livePrices[sym] || 100;
            const shares = Math.floor((nlv * pct) / price);
            if (shares <= 0) continue;
            equityOrders.push({ symbol: sym, shares, price, pct });
        }

        const results: any = { equity: [], options: null, virtual: !hasTT };

        // 5. Submit real orders if TT connected
        if (hasTT && accountNumber) {
            for (const order of equityOrders) {
                try {
                    const r = await submitEquityLeg(accessToken, accountNumber, order.symbol, order.shares, 'Buy to Open');
                    // Try to capture the actual fill price from TT order response
                    const fillPrice = parseFloat(r?.['average-fill-price'] || r?.['fill-price'] || order.price.toString()) || order.price;
                    results.equity.push({ ...order, fillPrice, ttOrderId: r?.id || r?.['order-id'] });
                    order.price = fillPrice; // Update with actual fill for shadow position
                } catch (e: any) {
                    console.warn(`[approve-options] Equity submission failed for ${order.symbol}: ${e.message}`);
                    results.equity.push({ ...order, fillPrice: order.price, error: e.message });
                }
            }

            // Submit options legs if any
            if (optionsLegs.length > 0) {
                try {
                    const limitPrice: number | null = sigData.cost && parseFloat(sigData.cost) > 0
                        ? parseFloat(sigData.cost)
                        : null;
                    results.options = await submitOptionsOrder(accessToken, accountNumber, optionsLegs, limitPrice, 'Limit');
                    console.log(`[approve-options] Options order submitted: ${JSON.stringify(results.options)}`);
                } catch (e: any) {
                    console.error('[approve-options] Options order failed:', e.message);
                    results.optionsError = e.message;
                    // Continue — don't abort, equity already filled
                }
            }
        } else {
            // Virtual only: fill equity with market prices
            results.equity = equityOrders.map(o => ({ ...o, fillPrice: o.price }));
        }

        // 6. ALWAYS replace shadow positions (virtual portfolio at market prices)
        try {
            await query(
                `DELETE FROM shadow_positions WHERE user_id = $1 AND strategy = $2`,
                [userId, 'TQQQ_TURBOCORE_PRO']
            );
            for (const order of equityOrders) {
                await query(
                    `INSERT INTO shadow_positions (user_id, strategy, symbol, quantity, avg_price, signal_id, executed_at)
                     VALUES ($1, $2, $3, $4, $5, $6, NOW())
                     ON CONFLICT (user_id, strategy, symbol)
                     DO UPDATE SET quantity = $4, avg_price = $5, signal_id = $6, executed_at = NOW()`,
                    [userId, 'TQQQ_TURBOCORE_PRO', order.symbol, order.shares, order.price, id]
                );
            }
            console.log(`[approve-options] Shadow positions replaced: ${equityOrders.map(o => `${o.symbol}×${o.shares}@${o.price}`).join(', ')}`);
        } catch (shadowErr: any) {
            console.warn('[approve-options] Shadow position update failed (non-fatal):', shadowErr.message);
        }

        // 7. Record execution
        await query(
            `INSERT INTO user_signal_executions (user_id, signal_id, status, created_at)
             VALUES ($1, $2, 'executed', NOW()) ON CONFLICT (user_id, signal_id)
             DO UPDATE SET status = 'executed', executed_at = NOW()`,
            [userId, id]
        );

        return NextResponse.json({
            status:  results.optionsError ? 'partial' : 'success',
            message: hasTT ? 'Orders submitted to Tastytrade' : 'Virtual positions recorded at market price',
            virtual: !hasTT,
            equity:  results.equity,
            options: results.options,
            optionsError: results.optionsError || null,
        });

    } catch (err: any) {
        console.error('[approve-options] Error:', err);
        return NextResponse.json({ status: 'failed', error: err?.message || String(err) }, { status: 500 });
    }
}
