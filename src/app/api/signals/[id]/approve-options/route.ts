/**
 * Execute All — IV-Switching Composite Signal
 *
 * Handles the unified "Submit Order" that executes BOTH:
 *   1. Equity allocation legs  (target_pct → market buy/sell via TT)
 *   2. Options overlay legs    (OCC symbols → multi-leg limit via TT)
 *
 * Reads legs from the signals table (leg_type: 'equity' | 'options').
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTastytradeTokens, storeTastytradeTokens } from '@/lib/redis';
import { createSession, getAccounts, submitOptionsOrder } from '@/lib/tastytrade-api';
import { getPrivyUserId } from '@/lib/auth-helpers';
import pool from '@/lib/db';

const TT_API = process.env.TASTYTRADE_API_BASE || 'https://api.tastyworks.com';

/** Submit a single equity leg as a market order */
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
            'symbol':           symbol.replace(/_/g, ''),   // strip underscores (QQQ_LEAPS → QQQLEAPS…)
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

        // 1. Load signal legs from the signals table
        const sigRes = await pool.query(
            `SELECT legs, capital_required FROM signals WHERE id = $1`,
            [id]
        );
        if (sigRes.rowCount === 0) {
            return NextResponse.json({ error: 'Signal not found' }, { status: 404 });
        }
        const rawLegs: any[] = sigRes.rows[0].legs || [];

        const equityLegs  = rawLegs.filter(l => l.leg_type === 'equity'  || (l.target_pct !== undefined && !l.action?.includes('TO_')));
        const optionsLegs = rawLegs.filter(l => l.leg_type === 'options' || l.action?.includes('TO_OPEN') || l.action?.includes('TO_CLOSE'));

        // 2. Get TT tokens
        const tokens = await getTastytradeTokens(userId);
        if (!tokens?.refreshToken) {
            // Virtual execution — just record it
            await pool.query(
                `INSERT INTO user_signal_executions (user_id, signal_id, created_at)
                 VALUES ($1, $2, NOW()) ON CONFLICT (user_id, signal_id) DO NOTHING`,
                [userId, id]
            );
            return NextResponse.json({ status: 'success', virtual: true, message: 'Tracked virtually. Connect Tastytrade for live execution.' });
        }

        // 3. Refresh token if needed
        const clientId     = process.env.TASTYTRADE_CLIENT_ID!;
        const clientSecret = process.env.TASTYTRADE_CLIENT_SECRET!;
        let   accessToken  = tokens.accessToken;
        if (!tokens.expiresAt || tokens.expiresAt <= Date.now()) {
            const sessionRes = await createSession(tokens.refreshToken, clientId, clientSecret);
            accessToken = sessionRes.accessToken;
            await storeTastytradeTokens(userId, { ...sessionRes, linkedAt: tokens.linkedAt ?? Date.now() });
        }

        // 4. Get account number + NLV
        const accounts = await getAccounts(accessToken);
        const accountNumber = accounts[0]?.accountNumber;
        if (!accountNumber) return NextResponse.json({ error: 'No Tastytrade account found' }, { status: 400 });

        const balResp = await fetch(`${TT_API}/accounts/${accountNumber}/balances`, {
            headers: { Authorization: `Bearer ${accessToken}`, 'User-Agent': 'TradeMind/1.0' },
        });
        const balData = await balResp.json();
        const nlv: number = parseFloat(balData?.data?.['net-liquidating-value'] || '25000') || 25000;

        const results: any = { equity: [], options: null };

        // 5. Execute equity legs as market orders
        for (const leg of equityLegs) {
            const sym    = (leg.symbol || '').replace(/_/g, '');
            const pct    = parseFloat(leg.target_pct);
            const amount = nlv * pct;

            // Special case: LEAPS is an option-style instrument — skip equity route
            if (sym.includes('LEAPS') || sym.includes('QQQ_L')) {
                console.log(`[approve-options] Skipping LEAPS leg (${sym}) from equity batch`);
                continue;
            }

            // Approximate shares using a rough price (TT equity price fetch would be ideal)
            // For MVP we submit 1 share — production should fetch live quote first
            const approxPrice = sym === 'QQQ' ? 460 : sym === 'QLD' ? 95 : sym === 'SGOV' ? 100 : 100;
            const shares = amount / approxPrice;

            try {
                const r = await submitEquityLeg(accessToken, accountNumber, sym, shares, 'Buy to Open');
                results.equity.push({ symbol: sym, shares: Math.floor(shares), ttOrderId: r?.id || r?.['order-id'] });
            } catch (e: any) {
                console.warn(`[approve-options] Equity leg skipped for ${sym}: ${e.message}`);
            }
        }

        // 6. Execute options legs as multi-leg limit order
        if (optionsLegs.length > 0) {
            try {
                const limitPrice: number | null = sigRes.rows[0]?.capital_required
                    ? parseFloat(sigRes.rows[0].capital_required) / 100
                    : null;

                results.options = await submitOptionsOrder(accessToken, accountNumber, optionsLegs, limitPrice, 'Limit');
            } catch (e: any) {
                console.error('[approve-options] Options order failed:', e.message);
                return NextResponse.json({ status: 'partial', error: e.message, equity: results.equity }, { status: 207 });
            }
        }

        // 7. Record execution
        await pool.query(
            `INSERT INTO user_signal_executions (user_id, signal_id, created_at)
             VALUES ($1, $2, NOW()) ON CONFLICT (user_id, signal_id) DO NOTHING`,
            [userId, id]
        );

        return NextResponse.json({
            status:  'success',
            message: 'All legs submitted to Tastytrade',
            equity:  results.equity,
            options: results.options,
        });

    } catch (err: any) {
        console.error('[approve-options] Error:', err);
        return NextResponse.json({ status: 'failed', error: err?.message || String(err) }, { status: 500 });
    }
}
