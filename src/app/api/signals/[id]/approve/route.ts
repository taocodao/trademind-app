/**
 * Approve Signal API Route
 * Approves a signal and executes the trade DIRECTLY from Vercel
 * 
 * This eliminates the need for EC2 and credential synchronization.
 */

import { NextResponse } from 'next/server';
import { getTastytradeTokens, storeTastytradeTokens } from '@/lib/redis';
import { cookies } from 'next/headers';
import { createSession, getAccountBalance } from '@/lib/tastytrade-api';
import { executeSignal } from '@/lib/strategy-executor';
import { createPosition, createUserExecution, getUserSettings } from '@/lib/db';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json().catch(() => ({}));

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
                console.warn("Could not decode Privy token", err);
            }
        }

        // Get user's Tastytrade credentials from Redis
        const tokens = await getTastytradeTokens(userId);
        const hasTastytrade = tokens?.refreshToken;

        // If no Tastytrade connection — execute virtually
        if (!hasTastytrade) {
            const signalData = body.signal || body.signalDetails || body;
            const strategy = signalData.strategy || 'TQQQ_TURBOCORE';
            const orders = await buildVirtualOrdersFromSignal(signalData, strategy, request);

            // Dynamically construct relative URL since Vercel env holds the baseUrl 
            const protocol = request.headers.get('x-forwarded-proto') || 'http';
            const host = request.headers.get('host');
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;

            const execRes = await fetch(`${baseUrl}/api/virtual-accounts/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Cookie: request.headers.get('cookie') || '' },
                body: JSON.stringify({ signalId: id, strategy, orders })
            });

            if (!execRes.ok) {
                const err = await execRes.json().catch(() => ({}));
                return NextResponse.json({ status: 'failed', error: err.error || 'Virtual execution failed' }, { status: 400 });
            }
            const execData = await execRes.json();
            return NextResponse.json({
                status: 'success',
                virtual: true,
                message: 'Trade executed virtually. Connect Tastytrade for live trading.',
                balance: execData.balance
            });
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
                const preCalculatedOrders = await buildVirtualOrdersFromSignal(signalData, strategy, request);

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
                // For TurboCore strategies, pre-calculate virtual orders so live TT trade
                // sizes match the UI Preview (which uses virtual $25k balance, not TT Net Liq)
                const isTurboCore = ['TQQQ_TURBOCORE', 'TQQQ_TURBOCORE_PRO', 'REBALANCE'].includes(strategy);
                let signalToExecute = signalData;

                if (isTurboCore) {
                    const virtualOrders = await buildVirtualOrdersFromSignal(signalData, strategy, request);
                    console.log(`[TurboCore] Using ${virtualOrders.length} pre-calculated virtual orders for live TT execution`);
                    // Inject the pre-calculated orders into the signal so calculateTurboCoreOrders can use them
                    signalToExecute = { ...signalData, _preCalculatedOrders: virtualOrders };

                    // After trade executes, mirror to virtual (non-blocking) — reuse virtualOrders, use real signalId
                    const mirrorOrders = virtualOrders;
                    request.headers.get('host'); // keep reference for closure
                    const mirrorSignalId = id; // Real signalId, not id + '_mirror'
                    const mirrorStrategy = strategy;
                    setImmediate(async () => {
                        try {
                            const protocol = request.headers.get('x-forwarded-proto') || 'http';
                            const host = request.headers.get('host');
                            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;
                            await fetch(`${baseUrl}/api/virtual-accounts/execute`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', Cookie: request.headers.get('cookie') || '' },
                                body: JSON.stringify({ signalId: mirrorSignalId, strategy: mirrorStrategy, orders: mirrorOrders })
                            });
                        } catch (e) { console.warn('Virtual mirror (post-TT) failed:', e); }
                    });
                }

                // Execute trade using modular strategy executor (locally on Vercel)
                result = await executeSignal(
                    accessToken,
                    accountNumber,
                    signalToExecute,
                    {
                        front: defaultFrontExpiry,
                        back: defaultFrontExpiry, // Using same for default vertical/theta
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

// Helper function to convert signal data into execution orders for the virtual ledger
async function buildVirtualOrdersFromSignal(signal: any, strategy: string, request: Request) {
    if (signal.type === 'REBALANCE' || String(signal.strategy).includes('TURBOCORE') || String(signal.strategy).includes('PRO')) {
        const legs = signal.legs || signal.data?.legs || [];
        
        const protocol = request.headers.get('x-forwarded-proto') || 'http';
        const host = request.headers.get('host');
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;
        
        // 1. Fetch live quotes purely to cost virtual orders correctly
        let prices: Record<string, number> = {};
        try {
            const symbols = legs.map((l: any) => l.symbol).join(',');
            const res = await fetch(`${baseUrl}/api/quotes?symbols=${symbols}`);
            if (res.ok) prices = await res.json();
        } catch(e) { console.warn('Failed to fetch Yahoo quotes for virtual sizes', e) }

        // 2. Fetch current virtual balance and shadow positions
        let virtualBalance = 25000;
        let shadowEq: any[] = [];
        try {
             const vBalRes = await fetch(`${baseUrl}/api/virtual-accounts?strategy=${strategy}`, {
                 headers: { Cookie: request.headers.get('cookie') || '' }
             });
             if (vBalRes.ok) virtualBalance = Number((await vBalRes.json()).balance || 25000);
             
             const shadowRes = await fetch(`${baseUrl}/api/shadow-positions?strategy=${strategy}`, {
                 headers: { Cookie: request.headers.get('cookie') || '' }
             });
             if (shadowRes.ok) shadowEq = (await shadowRes.json()).positions || [];
        } catch(e) { console.warn('Failed to fetch virtual state', e) }

        let netLiq = virtualBalance;
        const posMap = new Map<string, number>();
        for (const p of shadowEq) {
            const qty = Number(p.quantity);
            const livePrice = prices[p.symbol] || p.avg_price || 100;
            netLiq += qty * livePrice;
            posMap.set(p.symbol, qty);
        }

        if (signal.capital_required) {
            netLiq = Number(signal.capital_required); 
        }

        const orders: any[] = [];
        for (const leg of legs) {
            const symbol = leg.symbol;
            if (symbol === 'QQQ_LEAPS') continue; // Options — no easy live price
            
            const livePrice = prices[symbol] || signal.data?.price || signal.cost || 100;
            const targetValue = netLiq * leg.target_pct;
            const currentShares = posMap.get(symbol) || 0;
            const currentValue = currentShares * livePrice;
            
            const diffValue = targetValue - currentValue;
            const action = diffValue > 0 ? 'buy' : 'sell';
            let orderDollarValue = Math.abs(diffValue);
            
            if (action === 'sell') {
                const maxSellValue = currentValue;
                if (orderDollarValue > maxSellValue) orderDollarValue = maxSellValue;
            }
            
            const exactShares = orderDollarValue / livePrice;
            let wholeShares = action === 'buy' ? Math.floor(exactShares) : Math.ceil(exactShares);
            if (action === 'sell' && wholeShares > currentShares) wholeShares = currentShares;
            
            if (wholeShares > 0 && orderDollarValue >= 5) {
               orders.push({
                   symbol,
                   action,
                   quantity: wholeShares,
                   price: livePrice
               });
            } else if (leg.target_pct === 0 && currentShares > 0) {
               orders.push({ symbol, action: 'sell', quantity: currentShares, price: livePrice });
            }
        }
        
        orders.sort((a,b) => {
            if (a.action === 'sell' && b.action !== 'sell') return -1;
            if (a.action !== 'sell' && b.action === 'sell') return 1;
            return 0;
        });
        
        return orders;
    }

    // Individual equity/options signals (legacy/theta/zebra)
    return [{
        symbol: signal.symbol || 'UNKNOWN',
        action: signal.direction === 'bearish' ? 'sell' : 'buy',
        quantity: signal.contracts || 1,
        price: signal.cost || signal.price || 0
    }];
}
