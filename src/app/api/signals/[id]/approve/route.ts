/**
 * Approve Signal API Route
 * Approves a signal and executes the trade DIRECTLY from Vercel
 * 
 * This eliminates the need for EC2 and credential synchronization.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTastytradeTokens, storeTastytradeTokens } from '@/lib/redis';
import { createSession, getAccountBalance } from '@/lib/tastytrade-api';
import { executeSignal } from '@/lib/strategy-executor';
import { createPosition, createUserExecution, getUserSettings } from '@/lib/db';
import { executeVirtualOrders } from '@/lib/virtual-executor';
import { getPrivyUserId } from '@/lib/auth-helpers';
import pool, { getDefaultVirtualBalance } from '@/lib/db';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json().catch(() => ({}));

        // Resolve Privy user ID — never fall back to a shared default key
        const userId = await getPrivyUserId(request as NextRequest);
        if (!userId) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        // Get user's Tastytrade credentials from Redis
        const tokens = await getTastytradeTokens(userId);
        const hasTastytrade = tokens?.refreshToken;

        // If no Tastytrade connection — execute virtually using the shared helper (no HTTP round-trip)
        if (!hasTastytrade) {
            const signalData = body.signal || body.signalDetails || body;
            const strategy = signalData.strategy || 'TQQQ_TURBOCORE';
            const orders = await buildVirtualOrdersFromSignal(signalData, strategy, userId);

            try {
                const execResult = await executeVirtualOrders(userId, id, strategy, orders);
                if (execResult.alreadyExecuted) {
                    return NextResponse.json({ status: 'already_executed', error: 'Already executed' }, { status: 409 });
                }
                return NextResponse.json({
                    status: 'success',
                    virtual: true,
                    message: 'Trade executed virtually. Connect Tastytrade for live trading.',
                    balance: execResult.balance
                });
            } catch (execErr) {
                console.error('Virtual execution failed:', execErr);
                return NextResponse.json({ status: 'failed', error: 'Virtual execution failed' }, { status: 500 });
            }
        }

        // Get OAuth credentials from environment (single source of truth!)
        const clientId = process.env.TASTYTRADE_CLIENT_ID;
        const clientSecret = process.env.TASTYTRADE_CLIENT_SECRET;
        if (!clientId || !clientSecret) {
            console.error('TASTYTRADE_CLIENT_ID or TASTYTRADE_CLIENT_SECRET not configured');
            return NextResponse.json(
                { error: 'Server configuration error. Please contact support.' },
                { status: 500 }
            );
        }

        console.log(`📈 Approving signal ${id} for user ${userId}`);

        // Check if access token is still valid (not expired)
        const tokenStillValid = tokens.expiresAt && tokens.expiresAt > Date.now();
        let accessToken = tokens.accessToken;

        if (tokenStillValid && accessToken) {
            // Token still valid - use it directly without refresh
            console.log('✅ Using existing valid access token');
        } else {
            // Token expired - try to refresh
            console.log('⚠️ Access token expired, attempting refresh...');

            try {
                const session = await createSession(clientId, clientSecret, tokens.refreshToken);
                console.log('✅ Token refreshed successfully');
                accessToken = session.accessToken;

                // Update stored tokens with new refresh token if provided
                await storeTastytradeTokens(userId, {
                    ...tokens,
                    refreshToken: session.refreshToken || tokens.refreshToken,
                    accessToken: session.accessToken,
                    expiresAt: session.expiresAt,
                });
            } catch (refreshError) {
                // Refresh failed - this is expected due to Tastytrade API limitation
                // User needs to reconnect
                console.error('❌ Token refresh failed (likely Tastytrade API limitation):', refreshError);

                return NextResponse.json({
                    status: 'failed',
                    signal: { id, ...body },
                    error: 'Session expired. Please reconnect your Tastytrade account.',
                    code: 'RECONNECT_REQUIRED',
                    message: 'Your Tastytrade session has expired. Please click "Disconnect" then "Connect" to re-authenticate.',
                }, { status: 401 });
            }
        }

        // Get account number
        const accountNumber = tokens.accountNumber || body.accountNumber;
        if (!accountNumber) {
            return NextResponse.json({
                status: 'failed',
                signal: { id, ...(body.signal || body.signalDetails || body) },
                error: 'No account number found',
                message: 'Please reconnect your Tastytrade account.',
            }, { status: 400 });
        }

        // Execute the trade based on signal type
        // page.tsx sends either { signal } or { signalDetails }
        const signalData = body.signal || body.signalDetails || body;

        // 🛡️ SAFETY CHECK: Verify Buying Power
        try {
            const balanceData = await getAccountBalance(accessToken, accountNumber);
            const buyingPower = balanceData.buyingPower;

            const isRebalance = signalData.action === 'REBALANCE' || signalData.type === 'REBALANCE' || String(signalData.strategy || '').includes('TURBOCORE');

            if (!isRebalance) {
                const estimatedCost = signalData.cost ||
                    (signalData.capital_required) ||
                    ((signalData.strike || 0) * 100 * (signalData.contracts || 1));

                if (buyingPower < estimatedCost) {
                    console.error(`❌ Insufficient Buying Power: $${buyingPower} < $${estimatedCost}`);
                    return NextResponse.json({
                        status: 'failed',
                        signal: { id, ...signalData },
                        error: 'Insufficient buying power',
                        message: `Account has $${buyingPower.toFixed(2)} BP, but trade requires ~$${estimatedCost.toFixed(2)}`
                    }, { status: 400 });
                }
                console.log(`✅ Buying Power OK: $${buyingPower} available > $${estimatedCost} required`);
            } else {
                console.log(`✅ Buying Power Check Bypassed: Rebalance trade (sells fund buys)`);
            }
        } catch (bpError) {
            console.warn('⚠️ Could not verify buying power (proceeding with caution):', bpError);
        }

        // Helper: Get next Friday from a given date
        const getNextFriday = (from: Date): string => {
            const date = new Date(from);
            const dayOfWeek = date.getDay();
            const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7; // If today is Friday, get next Friday
            date.setDate(date.getDate() + daysUntilFriday);
            return date.toISOString().split('T')[0]; // YYYY-MM-DD
        };

        // Get default expiry dates if not provided
        const today = new Date();
        const defaultFrontExpiry = getNextFriday(today);
        const frontDate = new Date(defaultFrontExpiry);
        frontDate.setDate(frontDate.getDate() + 7);
        const defaultBackExpiry = frontDate.toISOString().split('T')[0];

        try {
            // Check if strategy should be handled by EC2 backend
            const strategy = String(signalData.strategy || '').toUpperCase();
            const isServerManaged = ['TURBOBOUNCE', 'ZEBRA'].includes(strategy);

            let result;

            if (isServerManaged) {
                console.log(`📡 Proxying ${strategy} approval to EC2 backend...`);
                const ec2Url = process.env.TASTYTRADE_API_URL || 'http://34.235.119.67:8002';
                
                // Pre-calculate exact order sizes using virtual balance so live matches UI preview exactly
                const preCalculatedOrders = await buildVirtualOrdersFromSignal(signalData, strategy, userId);

                const proxyResp = await fetch(`${ec2Url}/api/signals/${id}/approve`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        refreshToken: tokens.refreshToken,
                        accountNumber: tokens.accountNumber,
                        userId: userId,
                        execute: true,
                        signal: signalData, // Pass the full signal data
                        preCalculatedOrders: preCalculatedOrders // Pass exact orders so EC2 doesn't recalculate using TT Net Liq
                    })
                });

                if (!proxyResp.ok) {
                    const errorText = await proxyResp.text();
                    let parsedError = errorText;
                    try {
                        const errJson = JSON.parse(errorText);
                        parsedError = errJson.error || errJson.message || errorText;
                    } catch (e) { /* ignore */ }
                    throw new Error(`EC2 Proxy failed: ${parsedError}`);
                }

                result = await proxyResp.json();
                console.log(`✅ EC2 Proxy successful: Order ID ${result.orderId || result.order_id}`);

                // Mirror to virtual account (non-blocking) using already-computed preCalculatedOrders
                try {
                    const protocol = request.headers.get('x-forwarded-proto') || 'http';
                    const host = request.headers.get('host');
                    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;
                    await fetch(`${baseUrl}/api/virtual-accounts/execute`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Cookie: request.headers.get('cookie') || '' },
                        body: JSON.stringify({ signalId: id, strategy: String(signalData.strategy || strategy), orders: preCalculatedOrders })
                    });
                } catch (mirrorErr) {
                    console.warn('EC2 virtual mirror failed (non-critical):', mirrorErr);
                }

                return NextResponse.json(result);

            } else {
                // ── 🛡️ LIVE EXECUTION DEDUP GUARD ─────────────────────────────────────────
                // Atomically claim this signal execution slot BEFORE any TT order is submitted.
                // ON CONFLICT DO NOTHING returns 0 rows if another request already claimed it,
                // which means a parallel request or a double-click got here first — bail out.
                try {
                    const claimRes = await pool.query(
                        `INSERT INTO user_signal_executions (user_id, signal_id, status, source, executed_at, created_at)
                         VALUES ($1, $2, 'pending', $3, NOW(), NOW())
                         ON CONFLICT (user_id, signal_id) DO NOTHING
                         RETURNING id`,
                        [userId, id, body.source || 'manual']
                    );
                    if (claimRes.rowCount === 0) {
                        console.warn(`[Dedup] Signal ${id} already claimed for user ${userId} — aborting duplicate execution`);
                        return NextResponse.json({ status: 'already_executed', error: 'Already executed' }, { status: 409 });
                    }
                    console.log(`[Dedup] Execution slot claimed for signal ${id}`);
                } catch (claimErr) {
                    // If the dedup check itself fails (e.g. table doesn't exist), log and continue.
                    // Better to risk a duplicate than to block legitimate trades.
                    console.warn('[Dedup] Could not claim execution slot (proceeding):', claimErr);
                }

                // For TurboCore strategies, pre-calculate virtual orders so live TT trade
                // sizes match the UI Preview (which uses virtual $25k balance, not TT Net Liq)
                const isTurboCore = ['TQQQ_TURBOCORE', 'TQQQ_TURBOCORE_PRO', 'REBALANCE'].includes(strategy);
                let signalToExecute = signalData;

                if (isTurboCore) {
                    const virtualOrders = await buildVirtualOrdersFromSignal(signalData, strategy, userId);
                    console.log(`[TurboCore] Using ${virtualOrders.length} pre-calculated virtual orders for live TT execution`);
                    // Inject the pre-calculated orders into the signal so calculateTurboCoreOrders can use them
                    signalToExecute = { ...signalData, _preCalculatedOrders: virtualOrders };

                    // Execute trade on Tastytrade first, then mirror to virtual (awaited to prevent loss on serverless teardown)
                    result = await executeSignal(
                        accessToken,
                        accountNumber,
                        signalToExecute,
                        {
                            front: defaultFrontExpiry,
                            back: defaultFrontExpiry,
                        }
                    );

                    // Mirror to virtual — await to guarantee it runs before function exits
                    try {
                        await executeVirtualOrders(userId, id, strategy, virtualOrders);
                    } catch (e) { console.warn('Virtual mirror (post-TT) failed:', e); }

                    // Skip the second executeSignal call below
                    const orderId = result.orderId || (result as any).order_id || 'unknown';
                    console.log(`✅ Trade processed: Order ID ${orderId}`);
                    try {
                        const userSettings = await getUserSettings(userId);
                        await createPosition({
                            id: orderId, userId, signalId: id,
                            symbol: (signalData.legs?.map((l: any) => l.symbol).join(',')) || signalData.symbol || 'REBALANCE',
                            strategy: signalData.strategy || 'theta',
                            strike: signalData.strike || 0,
                            expiration: signalData.frontExpiry || signalData.expiry || defaultFrontExpiry,
                            backExpiry: signalData.backExpiry || defaultBackExpiry,
                            contracts: signalData.contracts || 1,
                            entryPrice: signalData.entry_price || signalData.price || signalData.cost || 0,
                            capitalRequired: signalData.cost || (signalData.strike || 0) * 100 * (signalData.contracts || 1),
                            riskLevel: (await getUserSettings(userId))?.risk_level || 'moderate',
                            direction: signalData.direction,
                        });
                        // Update the pre-claimed 'pending' execution row to 'executed'
                        await pool.query(
                            `UPDATE user_signal_executions SET status = 'executed', order_id = $1 WHERE user_id = $2 AND signal_id = $3`,
                            [orderId, userId, id]
                        );
                    } catch (dbError) { console.error('Failed to save position:', dbError); }

                    return NextResponse.json({
                        status: 'success',
                        signal: { id, ...signalData, status: 'executed' },
                        orderId,
                        positionId: orderId,
                        message: `Trade processed successfully! Order ID: ${orderId}`,
                    });
                }

                // Non-TurboCore: execute trade using modular strategy executor (locally on Vercel)
                result = await executeSignal(
                    accessToken,
                    accountNumber,
                    signalToExecute,
                    {
                        front: defaultFrontExpiry,
                        back: defaultFrontExpiry,
                    }
                );
            }

            const orderId = result.orderId || (result as any).order_id || 'unknown';
            console.log(`✅ Trade processed: Order ID ${orderId}`);

            // ✅ Create position in database for persistence
            try {
                const userSettings = await getUserSettings(userId);
                const riskLevel = userSettings?.risk_level || 'moderate';

                await createPosition({
                    id: orderId,
                    userId: userId,
                    signalId: id,
                    // Phase 3 Fix: Store accurate symbols instead of UNKNOWN for TurboCore signals
                    symbol: (signalData.legs?.map((l: any) => l.symbol).join(',')) || signalData.symbol || 'REBALANCE',
                    strategy: signalData.strategy || 'theta',
                    strike: signalData.strike || 0,
                    expiration: signalData.frontExpiry || signalData.expiry || defaultFrontExpiry,
                    backExpiry: signalData.backExpiry || defaultBackExpiry,
                    contracts: signalData.contracts || 1,
                    entryPrice: signalData.entry_price || signalData.price || signalData.cost || 0,
                    capitalRequired: signalData.cost || (signalData.strike || 0) * 100 * (signalData.contracts || 1),
                    riskLevel: riskLevel,
                    direction: signalData.direction,
                });

                // Track user execution
                await createUserExecution(userId, id, 'executed', orderId, body.source || 'manual');

                console.log(`✅ Position saved to database: ${orderId}`);
            } catch (dbError) {
                console.error('⚠️ Failed to save position to database:', dbError);
            }

            // After successful real trade execution — virtual mirror ALREADY scheduled above for TurboCore.
            // For other strategies (theta, diagonal, etc.) mirror now.

            return NextResponse.json({
                status: 'success',
                signal: { id, ...signalData, status: 'executed' },
                orderId: orderId,
                positionId: orderId,
                message: `Trade processed successfully! Order ID: ${orderId}`,
            });

        } catch (error) {
            console.error('Trade execution failed:', error);
            const errMsg = error instanceof Error ? error.message : 'Trade execution failed';

            // ⚠️ Mark signal as 'failed' in DB so it won't loop on next refresh
            try {
                await createUserExecution(userId, id, 'failed', undefined, body.source || 'manual');
                console.log(`📝 Signal ${id} marked as 'failed' in DB to prevent zombie loops.`);
            } catch (dbErr) {
                console.error('⚠️ Failed to write failure status to DB:', dbErr);
            }

            return NextResponse.json({
                status: 'failed',
                signal: { id, ...signalData },
                error: errMsg,
                message: `Trade failed: ${errMsg}`,
            }, { status: 400 });
        }

    } catch (error) {
        console.error('Approve signal error:', error);
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Unknown error',
                status: 'failed',
            },
            { status: 500 }
        );
    }
}

/**
 * Build virtual orders from a signal.
 * Fetches virtual state directly from DB (never via HTTP cookie-forwarding — that fails on serverless).
 * Handles: equity rebalance legs, LEAPS (tracked as placeholder option position), and legacy signals.
 */
async function buildVirtualOrdersFromSignal(signal: any, strategy: string, userId: string): Promise<any[]> {
    const isTurboCore = signal.type === 'REBALANCE' || String(signal.strategy).includes('TURBOCORE') || String(signal.strategy).includes('PRO');

    // ── QQQ LEAPS: option-specific virtual order ─────────────────────────────
    // Signals from signal_publisher/qqq_leaps.py carry strike/contracts/entry_px
    // rather than TurboCore's target_pct legs — handle them explicitly.
    if (String(signal.strategy).toUpperCase() === 'QQQ_LEAPS') {
        const action = (signal.action || 'ENTER').toUpperCase();
        if (action === 'HOLD') return []; // No trade on HOLD
        const contracts = signal.contracts || 1;
        const px = action === 'EXIT' ? (signal.exit_px || 0) : (signal.entry_px || 0);
        return [{
            symbol: 'QQQ_LEAPS',
            action: action === 'EXIT' ? 'sell' : 'buy',
            quantity: contracts,
            price: px * 100, // notional per contract
            instrument_type: 'option',
            strike: signal.strike,
            expiry: signal.expiry,
            delta: signal.delta,
        }];
    }

    if (!isTurboCore) {
        // Individual equity/options signals (legacy/theta/zebra)
        return [{
            symbol: signal.symbol || 'UNKNOWN',
            action: signal.direction === 'bearish' ? 'sell' : 'buy',
            quantity: signal.contracts || 1,
            price: signal.cost || signal.price || 0
        }];
    }

    const legs = signal.legs || signal.data?.legs || [];

    // 1. Fetch live Yahoo quotes for real equity symbols
    let prices: Record<string, number> = {};
    try {
        const equitySymbols = legs.map((l: any) => l.symbol).filter((s: string) => s !== 'QQQ_LEAPS').join(',');
        if (equitySymbols) {
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.trademind.bot';
            const res = await fetch(`${baseUrl}/api/quotes?symbols=${equitySymbols}`, { cache: 'no-store' });
            if (res.ok) prices = await res.json();
        }
    } catch(e) { console.warn('[buildVirtualOrders] Failed to fetch Yahoo quotes:', e); }

    // 2. Fetch virtual balance and shadow positions DIRECTLY from DB
    //    (avoids cookie-forwarding failures on Vercel serverless)
    let cashBalance = getDefaultVirtualBalance(strategy); // ✅ fixed: was hardcoded 25000
    const posMap = new Map<string, { qty: number; avgPrice: number }>();
    try {
        const [balRes, posRes] = await Promise.all([
            pool.query(
                `SELECT cash_balance FROM virtual_accounts WHERE user_id = $1 AND strategy = $2`,
                [userId, strategy]
            ),
            pool.query(
                `SELECT symbol, quantity, avg_price FROM shadow_positions WHERE user_id = $1 AND strategy = $2`,
                [userId, strategy]
            ),
        ]);
        if (balRes.rows.length > 0) cashBalance = parseFloat(balRes.rows[0].cash_balance);
        for (const row of posRes.rows) {
            posMap.set(row.symbol, { qty: Number(row.quantity), avgPrice: Number(row.avg_price) });
        }
    } catch(e) { console.warn('[buildVirtualOrders] Failed to fetch virtual state from DB:', e); }

    // 3. Compute Net Liq from cash + current position values
    let netLiq = cashBalance;
    for (const [sym, pos] of posMap.entries()) {
        const livePrice = prices[sym] || pos.avgPrice || 100;
        netLiq += pos.qty * livePrice;
    }

    // Override with capital_required if explicitly set on signal
    if (signal.capital_required) netLiq = Number(signal.capital_required);

    console.log(`[buildVirtualOrders] NetLiq=$${netLiq.toFixed(0)}, Cash=$${cashBalance.toFixed(0)}, Positions:`, Object.fromEntries(posMap));

    // 4. Generate buy/sell orders for each leg
    const orders: any[] = [];
    for (const leg of legs) {
        const symbol = leg.symbol;

        // LEAPS: track as a virtual option position using signal-embedded cost or estimate
        if (symbol === 'QQQ_LEAPS') {
            const targetValue = netLiq * leg.target_pct;
            const leaspsPrice = signal.leaps_price || signal.cost || 205; // approx $205/contract from signal card
            const contracts = Math.floor(targetValue / (leaspsPrice * 100));
            if (contracts > 0) {
                orders.push({
                    symbol: 'QQQ_LEAPS',
                    action: 'buy',
                    quantity: contracts,
                    price: leaspsPrice * 100, // notional per contract
                    instrument_type: 'option'
                });
            }
            continue;
        }

        const livePrice = prices[symbol] || signal.cost || 100;
        const targetValue = netLiq * leg.target_pct;
        const pos = posMap.get(symbol);
        const currentShares = pos?.qty || 0;
        const currentValue = currentShares * livePrice;

        const diffValue = targetValue - currentValue;
        const action = diffValue > 0 ? 'buy' : 'sell';
        let orderDollarValue = Math.abs(diffValue);

        // Cap sell at what we actually hold
        if (action === 'sell') {
            const maxSellValue = currentShares * livePrice;
            if (orderDollarValue > maxSellValue) orderDollarValue = maxSellValue;
        }

        // If target is 0% and we hold shares, sell everything
        if (leg.target_pct === 0 && currentShares > 0) {
            orders.push({ symbol, action: 'sell', quantity: currentShares, price: livePrice });
            continue;
        }

        const exactShares = orderDollarValue / livePrice;
        let wholeShares = action === 'buy' ? Math.floor(exactShares) : Math.ceil(exactShares);
        if (action === 'sell' && wholeShares > currentShares) wholeShares = currentShares;

        if (wholeShares > 0 && orderDollarValue >= 5) {
            orders.push({ symbol, action, quantity: wholeShares, price: livePrice });
        }
    }

    // SELLs first to free cash before BUYs
    orders.sort((a, b) => {
        if (a.action === 'sell' && b.action !== 'sell') return -1;
        if (a.action !== 'sell' && b.action === 'sell') return 1;
        return 0;
    });

    console.log(`[buildVirtualOrders] Generated ${orders.length} orders:`, orders.map(o => `${o.action} ${o.quantity} ${o.symbol} @ $${o.price}`));
    return orders;
}
