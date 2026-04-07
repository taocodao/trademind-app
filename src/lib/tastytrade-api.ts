/**
 * Tastytrade REST API Client
 * 
 * Handles OAuth token refresh and trade execution directly from Vercel.
 * Using PRODUCTION environment - we need this for real trading
 */

// Production endpoints - sandbox won't work for real trading
const TASTYTRADE_API_BASE = 'https://api.tastyworks.com';
const TASTYTRADE_OAUTH_URL = 'https://api.tastyworks.com/oauth/token';

export interface TastytradeSession {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
}

export interface TastytradeAccount {
    accountNumber: string;
    nickname?: string;
    accountType: string;
}

export interface AccountBalance {
    accountNumber: string;
    cashAvailable: number;
    netLiquidatingValue: number;
    equity: number;
    buyingPower: number;
    dayTradingBuyingPower: number;
}

export interface OrderLeg {
    instrumentType: 'Equity Option' | 'Equity' | 'Future Option' | 'Future';
    symbol: string;
    quantity: number;
    action: 'Buy to Open' | 'Buy to Close' | 'Sell to Open' | 'Sell to Close' | 'Buy' | 'Sell';
}

export interface OrderRequest {
    timeInForce: 'Day' | 'GTC' | 'GTD';
    orderType: 'Limit' | 'Market' | 'Notional Market';
    price?: number;
    priceEffect?: 'Debit' | 'Credit';
    value?: number;       // For Notional Market orders: dollar amount
    valueEffect?: 'Debit' | 'Credit'; // For Notional Market orders
    legs: OrderLeg[];
}

export interface OrderResponse {
    orderId: string;
    status: string;
    message?: string;
}

/**
 * Fetch current equity positions from a TT account.
 * Returns a map of { upperCaseSymbol → quantity } for symbols in the provided list.
 */
export async function getTTPositions(
    accessToken: string,
    accountNumber: string,
    symbols: string[]
): Promise<Record<string, number>> {
    const result: Record<string, number> = {};
    try {
        const resp = await fetch(
            `${TASTYTRADE_API_BASE}/accounts/${accountNumber}/positions`,
            { headers: { Authorization: `Bearer ${accessToken}`, 'User-Agent': 'TradeMind/1.0' } }
        );
        if (!resp.ok) return result;
        const data = await resp.json();
        const items: any[] = data?.data?.items || [];
        const upperSymbols = new Set(symbols.map(s => s.toUpperCase()));
        for (const pos of items) {
            const sym = (pos?.symbol || '').toUpperCase();
            if (upperSymbols.has(sym)) {
                const rawQty = parseFloat(pos?.quantity ?? '0') || 0;
                const dir    = (pos?.['quantity-direction'] || 'Long') as string;
                result[sym]  = dir === 'Short' ? -rawQty : rawQty;
            }
        }
    } catch (e) {
        console.warn('[getTTPositions] Failed:', e);
    }
    return result;
}


export interface OptionQuote {
    symbol: string;
    bid: number;
    ask: number;
    mid: number;
    last?: number;
    volume?: number;
    openInterest?: number;
}

/**
 * Get current market quote for an option symbol
 * Returns bid/ask/mid prices for accurate order pricing
 */
export async function getOptionQuote(
    accessToken: string,
    optionSymbol: string
): Promise<OptionQuote | null> {
    console.log(`📊 Fetching quote for: ${optionSymbol}`);

    try {
        // Tastytrade market-data endpoint
        const quoteUrl = `${TASTYTRADE_API_BASE}/market-data/options/quotes`;

        const response = await fetch(quoteUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'TradeMind/1.0',
            },
            body: JSON.stringify({ symbols: [optionSymbol] }),
        });

        if (!response.ok) {
            console.warn(`⚠️ Quote fetch failed (${response.status}), will use signal price`);
            return null;
        }

        const data = await response.json();
        const quote = data.data?.items?.[0];

        if (!quote) {
            console.warn('⚠️ No quote data returned');
            return null;
        }

        const bid = parseFloat(quote.bid || '0');
        const ask = parseFloat(quote.ask || '0');
        const mid = (bid + ask) / 2;

        console.log(`✅ Quote received: Bid ${bid} / Ask ${ask} / Mid ${mid.toFixed(2)}`);

        return {
            symbol: optionSymbol,
            bid,
            ask,
            mid,
            last: parseFloat(quote.last || '0'),
            volume: parseInt(quote.volume || '0'),
            openInterest: parseInt(quote['open-interest'] || '0'),
        };
    } catch (error) {
        console.warn(`⚠️ Quote fetch error: ${error}, will use signal price`);
        return null;
    }
}

/**
 * Get current market quote for an equity symbol (Stock/ETF)
 * Returns bid/ask/last prices for calculating order share sizes
 */
export async function getEquityQuote(
    accessToken: string,
    symbol: string
): Promise<OptionQuote | null> {
    console.log(`📊 Fetching equity quote for: ${symbol}`);

    try {
        // Fix: Tastytrade uses a GET endpoint for quotes, not POST.
        const quoteUrl = `${TASTYTRADE_API_BASE}/market-data/quotes?symbols=${symbol}`;

        let bid = 0;
        let ask = 0;
        let last = 0;

        try {
            const response = await fetch(quoteUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Accept': 'application/json',
                    'User-Agent': 'TradeMind/1.0',
                }
            });

            if (response.ok) {
                const data = await response.json();
                const quote = data.data?.items?.[0];
                if (quote) {
                    bid = parseFloat(quote.bid || quote.last || '0');
                    ask = parseFloat(quote.ask || quote.last || '0');
                    last = parseFloat(quote.last || '0');
                }
            } else {
                console.warn(`⚠️ Tastytrade equity quote fetch failed (${response.status})`);
            }
        } catch (e) {
            console.warn(`⚠️ Tastytrade equity quote fetch error:`, e);
        }

        // Fallback to our EC2 backend to fetch live Interactive Brokers Gateway quotes
        if (last === 0) {
            console.log(`📡 Falling back to EC2 IB Gateway for ${symbol} quote...`);
            try {
                // Get the EC2 URL from env, default to the known elastic IP
                const ec2Url = process.env.TASTYTRADE_API_URL || 'http://34.235.119.67:8002';

                const ec2Response = await fetch(`${ec2Url}/api/quote/equity?symbol=${symbol}`, { cache: 'no-store' });
                if (ec2Response.ok) {
                    const ec2Data = await ec2Response.json();
                    if (ec2Data && ec2Data.last) {
                        bid = ec2Data.bid || ec2Data.last;
                        ask = ec2Data.ask || ec2Data.last;
                        last = ec2Data.last;
                        console.log(`✅ IB Gateway EC2 quote for ${symbol}: Bid ${bid} / Ask ${ask} / Last ${last}`);
                    }
                } else {
                    console.warn(`⚠️ EC2 proxy quote fetch failed (${ec2Response.status})`);
                }
            } catch (proxyErr) {
                console.warn(`⚠️ EC2 proxy fallback failed for ${symbol}:`, proxyErr);
            }
        }

        if (last === 0) {
            console.warn(`⚠️ All quote fetch attempts failed for ${symbol}.`);
            return null;
        }

        const mid = (bid + ask) / 2;
        console.log(`✅ Equity quote for ${symbol}: Bid ${bid} / Ask ${ask} / Mid ${mid}`);

        return {
            symbol,
            bid,
            ask,
            mid,
            last,
            volume: 0,
            openInterest: 0,
        };
    } catch (error) {
        console.warn(`⚠️ Equity quote fetch error: ${error}`);
        return null;
    }
}

/**
 * Create a session using OAuth refresh token
 */
export async function createSession(
    clientId: string,
    clientSecret: string,
    refreshToken: string
): Promise<TastytradeSession> {
    console.log('🔐 Creating Tastytrade session...');

    // Validate inputs
    if (!clientId || !clientSecret || !refreshToken) {
        const missing = [];
        if (!clientId) missing.push('clientId');
        if (!clientSecret) missing.push('clientSecret');
        if (!refreshToken) missing.push('refreshToken');
        throw new Error(`Missing OAuth parameters: ${missing.join(', ')}`);
    }

    console.log(`   Client ID: ${clientId.slice(0, 8)}...`);
    console.log(`   Refresh token: ${refreshToken.slice(0, 20)}...`);

    // Build request body - NO scope or redirect_uri for refresh_token grant
    const body = new URLSearchParams();
    body.append('grant_type', 'refresh_token');
    body.append('refresh_token', refreshToken.trim());
    body.append('client_id', clientId.trim());
    body.append('client_secret', clientSecret.trim());

    // Use production endpoint - requires User-Agent header!
    const endpoint = TASTYTRADE_OAUTH_URL;
    console.log(`📤 Refreshing token at: ${endpoint}`);

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
            'User-Agent': 'TradeMind/1.0',  // REQUIRED by Tastytrade - nginx rejects without this!
        },
        body: body.toString(),
    });

    console.log(`📥 Response status: ${response.status}`);

    const responseText = await response.text();

    if (!response.ok) {
        let error;
        try {
            error = JSON.parse(responseText);
        } catch {
            error = { error: responseText || 'Unknown error' };
        }
        console.error('❌ Token refresh failed:', error);

        // Provide specific error message for revoked tokens
        if (error.error_code === 'invalid_grant') {
            throw new Error(`Token revoked: ${error.error_description || 'Please reconnect Tastytrade'}`);
        }

        throw new Error(
            error.error_description ||
            error.error ||
            `HTTP ${response.status}: ${responseText.substring(0, 300)}`
        );
    }

    let data;
    try {
        data = JSON.parse(responseText);
    } catch {
        throw new Error('Invalid JSON response from Tastytrade');
    }

    console.log('✅ Token refreshed successfully');
    console.log(`   Expires in: ${data.expires_in} seconds`);

    return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken,
        expiresAt: Date.now() + (data.expires_in * 1000),
    };
}

/**
 * Get user's trading accounts
 */
export async function getAccounts(
    accessToken: string
): Promise<TastytradeAccount[]> {
    const response = await fetch(`${TASTYTRADE_API_BASE}/customers/me/accounts`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'TradeMind/1.0',  // REQUIRED by Tastytrade nginx!
        },
    });

    if (!response.ok) {
        const text = await response.text();
        if (text.startsWith('<')) {
            console.error('Got HTML instead of JSON from accounts API:', text.substring(0, 200));
            throw new Error(`Tastytrade API error (status ${response.status}): Check User-Agent header`);
        }
        const error = JSON.parse(text);
        throw new Error(error.error?.message || 'Failed to get accounts');
    }

    const data = await response.json();

    return data.data?.items?.map((item: { account: { 'account-number': string; nickname?: string; 'account-type-name': string } }) => ({
        accountNumber: item.account['account-number'],
        nickname: item.account.nickname,
        accountType: item.account['account-type-name'],
    })) || [];
}

/**
 * Get account balances
 */
export async function getAccountBalance(
    accessToken: string,
    accountNumber: string
): Promise<AccountBalance> {
    const response = await fetch(`${TASTYTRADE_API_BASE}/accounts/${accountNumber}/balances`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'TradeMind/1.0',
        },
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Failed to fetch balances status ${response.status}: ${text}`);
    }

    const data = await response.json();
    const item = data.data;

    return {
        accountNumber: data.data?.['account-number'] || accountNumber,
        cashAvailable: parseFloat(item['cash-available-to-withdraw'] || item['cash-available'] || '0'),
        netLiquidatingValue: parseFloat(item['net-liquidating-value'] || '0'),
        equity: parseFloat(item['equity-buying-power'] || '0'),
        buyingPower: parseFloat(item['derivative-buying-power'] || item['equity-buying-power'] || '0'),
        dayTradingBuyingPower: parseFloat(item['day-trading-buying-power'] || item['day-equity-buying-power'] || '0'),
    };
}

export interface Position {
    symbol: string;
    quantity: number;
    instrumentType: string;
}

/**
 * Get current open positions for an account
 */
export async function getAccountPositions(
    accessToken: string,
    accountNumber: string
): Promise<Position[]> {
    const response = await fetch(`${TASTYTRADE_API_BASE}/accounts/${accountNumber}/positions`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'TradeMind/1.0',
        },
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Failed to fetch positions status ${response.status}: ${text}`);
    }

    const data = await response.json();

    return data.data?.items?.map((item: any) => ({
        symbol: item.symbol,
        // The API returns quantity-direction = Long/Short and quantity as a positive number.
        // If it's short, we need to return a negative quantity.
        quantity: item['quantity-direction'] === 'Short' ? -parseFloat(item.quantity) : parseFloat(item.quantity),
        instrumentType: item['instrument-type'],
    })) || [];
}


/**
 * Validate order using dry-run endpoint (doesn't submit to exchange)
 */
export async function dryRunOrder(
    accessToken: string,
    accountNumber: string,
    order: OrderRequest
): Promise<{ valid: boolean; errors?: unknown[]; buyingPowerEffect?: unknown }> {
    const apiOrder = {
        'time-in-force': order.timeInForce,
        'order-type': order.orderType,
        'price': order.price?.toString(),
        'price-effect': order.priceEffect,
        'legs': order.legs.map(leg => ({
            'instrument-type': leg.instrumentType,
            'symbol': leg.symbol,
            'quantity': leg.quantity,
            'action': leg.action,
        })),
    };

    const dryRunUrl = `${TASTYTRADE_API_BASE}/accounts/${accountNumber}/orders/dry-run`;
    console.log(`🧪 Dry-run validation at: ${dryRunUrl}`);

    const response = await fetch(dryRunUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'TradeMind/1.0',
        },
        body: JSON.stringify(apiOrder),
    });

    const responseText = await response.text();
    let data;
    try {
        data = JSON.parse(responseText);
    } catch {
        return { valid: false, errors: [{ message: 'Invalid JSON response' }] };
    }

    if (!response.ok) {
        console.error('❌ Dry-run validation failed');
        if (data.error?.errors) {
            console.error('   Validation errors:');
            data.error.errors.forEach((err: { code: string; message: string }) => {
                console.error(`     - ${err.code}: ${err.message}`);
            });
        }
        return { valid: false, errors: data.error?.errors || [data.error] };
    }

    console.log('✅ Dry-run validation passed');
    if (data.buying_power_effect) {
        console.log(`   BP effect: ${JSON.stringify(data.buying_power_effect)}`);
    }

    return {
        valid: true,
        buyingPowerEffect: data.buying_power_effect
    };
}

/**
 * Submit an order to Tastytrade
 */
export async function submitOrder(
    accessToken: string,
    accountNumber: string,
    order: OrderRequest
): Promise<OrderResponse> {
    // Convert our order format to Tastytrade API format
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const apiOrder: Record<string, any> = {
        'time-in-force': order.timeInForce,
        'order-type': order.orderType,
    };

    if (order.orderType === 'Notional Market') {
        // Notional Market: dollar value, no price, no quantity on legs
        apiOrder['value'] = order.value;
        apiOrder['value-effect'] = order.valueEffect;
        apiOrder['legs'] = order.legs.map(leg => ({
            'instrument-type': leg.instrumentType,
            'symbol': leg.symbol,
            'action': leg.action,
        }));
    } else {
        // Standard Market/Limit
        if (order.price) apiOrder['price'] = order.price.toString();
        if (order.priceEffect) apiOrder['price-effect'] = order.priceEffect;
        apiOrder['legs'] = order.legs.map(leg => ({
            'instrument-type': leg.instrumentType,
            'symbol': leg.symbol,
            'quantity': leg.quantity,
            'action': leg.action,
        }));
    }

    const orderUrl = `${TASTYTRADE_API_BASE}/accounts/${accountNumber}/orders`;
    console.log(`📤 Submitting order to: ${orderUrl}`);
    console.log(`   Order body:`, JSON.stringify(apiOrder, null, 2));

    // ✅ DRY-RUN PRE-FLIGHT: Validate the order before submitting
    try {
        const dryRunUrl = `${orderUrl}/dry-run`;
        console.log(`🔍 Running dry-run validation...`);

        const dryRunResponse = await fetch(dryRunUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'TradeMind/1.0',
            },
            body: JSON.stringify(apiOrder),
        });

        if (!dryRunResponse.ok) {
            const dryRunText = await dryRunResponse.text();
            let dryRunData;
            try { dryRunData = JSON.parse(dryRunText); } catch { dryRunData = null; }

            if (dryRunData?.error?.errors) {
                const failedSymbols = order.legs.map(l => l.symbol.trim()).join(', ');
                const reasons = dryRunData.error.errors
                    .map((e: { code: string; message: string }) => `${e.code}: ${e.message}`)
                    .join('; ');
                console.error(`❌ Dry-run FAILED for [${failedSymbols}]: ${reasons}`);

                // Only append option-specific help text if the order contains options
                const isOption = order.legs.some(l => l.instrumentType === 'Equity Option' || l.instrumentType === 'Future Option');
                const suffix = isOption ? ` The option contract may not exist at this strike/expiry.` : ``;

                throw new Error(
                    `Trade failed: ${reasons}. Symbols: ${failedSymbols}.${suffix}`
                );
            }
            console.warn(`⚠️ Dry-run returned ${dryRunResponse.status}, proceeding cautiously...`);
        } else {
            const dryRunData = await dryRunResponse.json();
            // Check for warnings in the dry-run response
            if (dryRunData?.data?.warnings?.length > 0) {
                const warnings = dryRunData.data.warnings
                    .map((w: { message: string }) => w.message)
                    .join('; ');
                console.warn(`⚠️ Dry-run warnings: ${warnings}`);
            } else {
                console.log(`✅ Dry-run passed — order is valid`);
            }
        }
    } catch (dryRunError) {
        // If the dry-run specifically identified an instrument issue, re-throw it
        if (dryRunError instanceof Error && dryRunError.message.includes('Trade failed:')) {
            throw dryRunError;
        }
        // Otherwise log and continue — dry-run itself might have a transient issue
        console.warn(`⚠️ Dry-run check inconclusive:`, dryRunError);
    }

    const response = await fetch(orderUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'TradeMind/1.0',  // REQUIRED by Tastytrade nginx!
        },
        body: JSON.stringify(apiOrder),
    });

    console.log(`📥 Order response status: ${response.status}`);

    // Get response as text first to handle HTML errors
    const responseText = await response.text();
    console.log(`   Response (first 300 chars): ${responseText.substring(0, 300)}`);

    // Check for HTML response (nginx error)
    if (responseText.startsWith('<') || responseText.startsWith('<!DOCTYPE')) {
        console.error('❌ Got HTML instead of JSON!');
        console.error('   Full response:', responseText);
        throw new Error(`Tastytrade API returned HTML (status ${response.status}). This usually means a routing or authentication issue.`);
    }

    // Parse JSON
    let data;
    try {
        data = JSON.parse(responseText);
    } catch (parseError) {
        console.error('❌ Failed to parse response as JSON:', parseError);
        throw new Error(`Invalid response from Tastytrade: ${responseText.substring(0, 200)}`);
    }

    if (!response.ok) {
        console.error('❌ Order submission error:', JSON.stringify(data, null, 2));

        // Parse Tastytrade preflight check errors (422 status)
        if (response.status === 422 && data.error?.errors) {
            const preflightErrors = data.error.errors.map((err: { code: string; message: string }) =>
                `${err.code}: ${err.message}`
            ).join('; ');
            throw new Error(`Preflight check failed: ${preflightErrors}`);
        }

        // Handle specific error codes
        const errorCode = data.error?.code || data.error?.errors?.[0]?.code;
        const errorMessage = data.error?.message || data.error?.errors?.[0]?.message;

        // Provide user-friendly error messages for common issues
        const userFriendlyErrors: Record<string, string> = {
            'margin_check_failed': 'Insufficient buying power for this trade',
            'cant_buy_for_credit': 'Wrong price direction - check if this should be debit or credit',
            'instrument_validation_failed': 'Symbol not tradeable or market closed',
            'closing_only': 'This symbol is restricted to closing trades only',
            'invalid_option_level': 'Account not approved for this option strategy',
            'invalid_strike': 'Invalid strike price',
            'invalid_expiration': 'Invalid expiration date',
        };

        const friendlyMessage = userFriendlyErrors[errorCode] || errorMessage;
        throw new Error(
            friendlyMessage ||
            `Order failed (${response.status}): ${JSON.stringify(data).substring(0, 300)}`
        );
    }

    console.log('✅ Order submitted successfully:', data);

    return {
        orderId: data.data?.order?.id || data.data?.id || 'unknown',
        status: data.data?.order?.status || 'submitted',
        message: 'Order submitted successfully',
    };
}

/**
 * Fetch the exact status of an order after submission
 */
export async function getOrderStatus(
    accessToken: string,
    accountNumber: string,
    orderId: string
) {
    const url = `${TASTYTRADE_API_BASE}/accounts/${accountNumber}/orders/${orderId}`;
    console.log(`🔍 Checking status for Order ID: ${orderId}`);

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'TradeMind/1.0',
        },
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Failed to fetch order status (${response.status}): ${text}`);
    }

    const data = await response.json();
    return data.data; // contains .status among other things
}

/**
 * Execute a theta trade (cash-secured put)
 * UPDATED: Now fetches current market price to avoid stale signal prices
 */
export async function executeThetaPut(
    accessToken: string,
    accountNumber: string,
    signal: {
        symbol: string;
        strike: number;
        expiration: string;  // YYYY-MM-DD
        contracts: number;
        price?: number;  // Signal price (backup if quote fails)
    }
): Promise<OrderResponse> {
    const { symbol, strike, expiration, contracts, price: signalPrice } = signal;

    // Format OCC option symbol
    // Format: SYMBOL YYMMDD[P]STRIKE (strike * 1000, 8 digits)
    const date = expiration.replace(/-/g, '').slice(2); // YYMMDD
    const strikeFormatted = (strike * 1000).toString().padStart(8, '0');
    const optionSymbol = `${symbol.padEnd(6)}${date}P${strikeFormatted}`;

    console.log(`📋 Theta Put: SELL ${symbol} ${strike}P @ ${expiration}`);
    console.log(`   Option symbol: ${optionSymbol}`);
    console.log(`   Contracts: ${contracts}`);
    console.log(`   Signal price (stale): ${signalPrice}`);

    // ✅ FETCH CURRENT MARKET PRICE - This is the key fix!
    const quote = await getOptionQuote(accessToken, optionSymbol);

    let orderPrice: number | undefined;

    if (quote && quote.bid > 0) {
        // Use current bid price for selling (what we'll receive)
        // Add a small buffer (95% of bid) to help fill
        orderPrice = Math.round(quote.bid * 95) / 100;
        console.log(`✅ Using LIVE market bid: $${quote.bid} → Order at $${orderPrice} (95%)`);
    } else if (signalPrice && signalPrice > 0) {
        // Fallback to signal price if quote fetch failed
        orderPrice = signalPrice;
        console.log(`⚠️ Quote unavailable, using signal price: $${orderPrice}`);
    } else {
        // No price available - cannot place order without a limit price
        // Tastytrade rejects market orders for options
        throw new Error(
            `Cannot place order for ${symbol}: no market quote available and no signal price provided. ` +
            `Tastytrade requires limit orders for options.`
        );
    }

    const order: OrderRequest = {
        timeInForce: 'Day',
        orderType: 'Limit' as const,
        price: orderPrice,
        priceEffect: 'Credit',  // Selling puts = credit
        legs: [
            {
                instrumentType: 'Equity Option',
                symbol: optionSymbol,  // DO NOT TRIM - OCC format requires exact spacing!
                quantity: contracts,
                action: 'Sell to Open',
            },
        ],
    };

    return submitOrder(accessToken, accountNumber, order);
}

/**
 * Execute a calendar spread trade
 * UPDATED: Now fetches current market prices for both legs
 */
export async function executeCalendarSpread(
    accessToken: string,
    accountNumber: string,
    signal: {
        symbol: string;
        strike: number;
        frontExpiry: string;  // YYYY-MM-DD
        backExpiry: string;   // YYYY-MM-DD
        price?: number;       // Signal price (backup if quote fails)
        direction?: 'bullish' | 'bearish';
    }
): Promise<OrderResponse> {
    const { symbol, strike, frontExpiry, backExpiry, price: signalPrice, direction } = signal;

    // Determine option type based on direction
    const optionType = direction === 'bearish' ? 'P' : 'C';

    // Format OCC option symbols
    // Format: SYMBOL YYMMDD[C/P]STRIKE (strike * 1000, 8 digits)
    const formatOptionSymbol = (expiry: string) => {
        const date = expiry.replace(/-/g, '').slice(2); // YYMMDD
        const strikeFormatted = (strike * 1000).toString().padStart(8, '0');
        return `${symbol.padEnd(6)}${date}${optionType}${strikeFormatted}`;
    };

    const frontSymbol = formatOptionSymbol(frontExpiry);
    const backSymbol = formatOptionSymbol(backExpiry);

    console.log(`📋 Calendar Spread: ${symbol} ${strike}${optionType}`);
    console.log(`   Short leg: ${frontSymbol}`);
    console.log(`   Long leg: ${backSymbol}`);
    console.log(`   Signal price (stale): ${signalPrice}`);

    // ✅ FETCH CURRENT MARKET PRICES - This is the key fix!
    const [frontQuote, backQuote] = await Promise.all([
        getOptionQuote(accessToken, frontSymbol),
        getOptionQuote(accessToken, backSymbol),
    ]);

    let orderPrice: number | undefined;

    if (frontQuote && backQuote && frontQuote.bid > 0 && backQuote.ask > 0) {
        // Calendar spread: SELL front (get bid), BUY back (pay ask)
        // Net debit = back ask - front bid
        const netDebit = backQuote.ask - frontQuote.bid;
        // Round to 2 decimals
        orderPrice = Math.round(netDebit * 100) / 100;
        console.log(`✅ Using LIVE prices: Sell @ ${frontQuote.bid} / Buy @ ${backQuote.ask}`);
        console.log(`   Net debit: $${orderPrice}`);
    } else if (signalPrice && signalPrice > 0) {
        // Fallback to signal price if quote fetch failed
        orderPrice = signalPrice;
        console.log(`⚠️ Quotes unavailable, using signal price: $${orderPrice}`);
    } else {
        // No price available - cannot place order without a limit price
        // Tastytrade rejects market orders for options
        throw new Error(
            `Cannot place calendar spread for ${symbol}: no market quotes available and no signal price provided. ` +
            `Tastytrade requires limit orders for options.`
        );
    }

    const order: OrderRequest = {
        timeInForce: 'Day',
        orderType: 'Limit' as const,
        price: orderPrice,
        priceEffect: 'Debit',
        legs: [
            {
                instrumentType: 'Equity Option',
                symbol: frontSymbol,  // DO NOT TRIM - OCC format requires exact spacing!
                quantity: 1,
                action: 'Sell to Open',
            },
            {
                instrumentType: 'Equity Option',
                symbol: backSymbol,  // DO NOT TRIM - OCC format requires exact spacing!
                quantity: 1,
                action: 'Buy to Open',
            },
        ],
    };

    return submitOrder(accessToken, accountNumber, order);
}

/**
 * Execute a TQQQ vertical credit spread (put credit or call credit)
 * Calls Tastytrade REST API directly — no EC2 Python backend needed.
 */
export async function executeTQQQSpread(
    accessToken: string,
    accountNumber: string,
    signal: {
        short_strike: number;   // e.g., 45.0 (sell this)
        long_strike: number;    // e.g., 40.0 (buy this)
        expiration: string;     // YYYY-MM-DD
        credit: number;         // net credit per contract
        type: string;           // "PUT_CREDIT" or "CALL_CREDIT"
        quantity: number;       // number of contracts
    }
): Promise<OrderResponse> {
    const { short_strike, long_strike, expiration, credit, type, quantity } = signal;

    const optionType = type.includes('PUT') ? 'P' : 'C';

    // Format OCC option symbols
    const formatOCC = (strike: number) => {
        const date = expiration.replace(/-/g, '').slice(2); // YYMMDD
        const strikeFormatted = (strike * 1000).toString().padStart(8, '0');
        return `${'TQQQ'.padEnd(6)}${date}${optionType}${strikeFormatted}`;
    };

    const shortSymbol = formatOCC(short_strike);
    const longSymbol = formatOCC(long_strike);

    console.log(`📋 TQQQ Vertical Spread: ${type}`);
    console.log(`   SHORT: SELL ${shortSymbol} @ ${short_strike}`);
    console.log(`   LONG:  BUY  ${longSymbol} @ ${long_strike}`);
    console.log(`   Signal credit: $${credit}`);
    console.log(`   Quantity: ${quantity}x`);

    // Fetch live quotes for both legs
    const [shortQuote, longQuote] = await Promise.all([
        getOptionQuote(accessToken, shortSymbol),
        getOptionQuote(accessToken, longSymbol),
    ]);

    let orderPrice: number;

    if (shortQuote && longQuote && shortQuote.bid > 0 && longQuote.ask > 0) {
        // Credit spread: SELL short (get bid), BUY long (pay ask)
        // Net credit = short bid - long ask
        const netCredit = shortQuote.bid - longQuote.ask;
        orderPrice = Math.max(Math.round(netCredit * 100) / 100, 0.01);
        console.log(`✅ Using LIVE prices: Sell @ ${shortQuote.bid} / Buy @ ${longQuote.ask}`);
        console.log(`   Net credit: $${orderPrice}`);
    } else if (credit > 0) {
        orderPrice = credit;
        console.log(`⚠️ Quotes unavailable, using signal credit: $${orderPrice}`);
    } else {
        throw new Error(
            `Cannot place TQQQ spread: no market quotes available and no signal credit provided.`
        );
    }

    const order: OrderRequest = {
        timeInForce: 'Day',
        orderType: 'Limit' as const,
        price: orderPrice,
        priceEffect: 'Credit',  // Credit spread
        legs: [
            {
                instrumentType: 'Equity Option',
                symbol: shortSymbol,  // DO NOT TRIM - OCC format requires exact spacing!
                quantity,
                action: 'Sell to Open',
            },
            {
                instrumentType: 'Equity Option',
                symbol: longSymbol,
                quantity,
                action: 'Buy to Open',
            },
        ],
    };

    return submitOrder(accessToken, accountNumber, order);
}

/**
 * Execute an Equity Trade (Stock/ETF)
 * Used directly by TurboCore for rebalancing
 */
export async function executeEquityOrder(
    accessToken: string,
    accountNumber: string,
    signal: {
        symbol: string;
        action: 'Buy' | 'Sell';
        quantity: number;
        price?: number; // Limit price (optional). If omitted, sends a Market order.
    }
): Promise<OrderResponse> {
    const { symbol, action, quantity, price } = signal;

    const orderType = price && price > 0 ? 'Limit' : 'Market';

    console.log(`📋 Equity Trade: ${action} ${quantity}x ${symbol} @ ${orderType === 'Limit' ? price : 'MKT'}`);

    const order: OrderRequest = {
        timeInForce: 'Day',
        orderType,
        ...(orderType === 'Limit' ? { price, priceEffect: action === 'Buy' ? 'Debit' : 'Credit' } : {}),
        legs: [
            {
                instrumentType: 'Equity',
                symbol,
                quantity,
                // Tastytrade expects four-value actions.
                // For long equity rebalancing:
                // Buying shares we don't hold or adding to existing longs -> Buy to Open
                // Selling existing long shares -> Sell to Close
                action: action === 'Buy' ? 'Buy to Open' : 'Sell to Close',
            },
        ],
    };

    return submitOrder(accessToken, accountNumber, order);
}

/**
 * Execute a Notional Market Order (Fractional Shares)
 * Tastytrade requires 'Notional Market' order-type with a dollar 'value' instead of share quantity.
 * Only works for fractional-eligible equities. Minimum $5 per order.
 */
export async function executeNotionalEquityOrder(
    accessToken: string,
    accountNumber: string,
    signal: {
        symbol: string;
        action: 'Buy' | 'Sell';
        dollarValue: number; // Must be >= $5
    }
): Promise<OrderResponse> {
    const { symbol, action, dollarValue } = signal;

    // Tastytrade minimum is $5 for notional orders
    if (Math.abs(dollarValue) < 5) {
        console.log(`⏭️ Skipping ${symbol}: notional value $${dollarValue.toFixed(2)} below $5 minimum`);
        return { orderId: 'skipped_below_minimum', status: 'skipped', message: `Below $5 minimum` };
    }

    console.log(`📋 Notional Trade: ${action} $${dollarValue.toFixed(2)} of ${symbol}`);

    const order: OrderRequest = {
        timeInForce: 'Day',
        orderType: 'Notional Market',
        value: Math.round(dollarValue * 100) / 100, // Round to cents
        valueEffect: action === 'Buy' ? 'Debit' : 'Credit',
        legs: [
            {
                instrumentType: 'Equity',
                symbol,
                quantity: 0, // Not used for notional orders but required by interface
                action: action === 'Buy' ? 'Buy to Open' : 'Sell to Close',
            },
        ],
    };

        return submitOrder(accessToken, accountNumber, order);
}

// ─── Option Chain Types & TQQQ LEAPS API ──────────────────────────────────────

export interface OptionChainStrike {
    strikePrice: number;
    call: string | null;  // OCC option symbol e.g. "QQQ   270620C00450000"
    put: string | null;
}

export interface OptionChainExpiration {
    expirationDate: string;   // "YYYY-MM-DD"
    daysToExpiration: number;
    expirationStyle: string;   // "American"
    strikes: OptionChainStrike[];
}

export interface OptionChainNested {
    underlying: string;
    expirations: OptionChainExpiration[];
}

export interface LeapsCandidate {
    occSymbol: string;       // OCC symbol to trade
    strikePrice: number;
    expirationDate: string;
    daysToExpiration: number;
    bid: number;
    ask: number;
    mid: number;
}

/**
 * Fetch all expirations + strikes for an underlying using the /nested endpoint.
 * Endpoint: GET /option-chains/{symbol}/nested
 */
export async function getOptionChainNested(
    accessToken: string,
    underlyingSymbol: string
): Promise<OptionChainNested> {
    const url = `${TASTYTRADE_API_BASE}/option-chains/${underlyingSymbol}/nested`;
    console.log(`📊 Fetching option chain for ${underlyingSymbol}: ${url}`);

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
            'User-Agent': 'TradeMind/1.0',
        },
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Failed to fetch option chain for ${underlyingSymbol}: ${response.status} ${text}`);
    }

    const data = await response.json();
    // TT /nested: data.items=[underlyingWrapper]; expirations nested at items[0].expirations
    const chainWrapper = data.data?.items?.[0];
    const expItems: any[] = chainWrapper?.expirations || [];

    const expirations: OptionChainExpiration[] = expItems.map((item: any) => ({
        expirationDate: item['expiration-date'],
        daysToExpiration: item['days-to-expiration'],
        expirationStyle: item['expiration-type'] || 'American',
        strikes: (item.strikes || []).map((s: any) => ({
            strikePrice: parseFloat(s['strike-price']),
            call: s.call || null,
            put: s.put || null,
        })),
    }));

    return { underlying: underlyingSymbol, expirations };
}

/**
 * Select the best LEAPS call contract for QQQ based on:
 *  - DTE: nearest to 15 months (target 360-540 days)
 *  - Strike: ATM or slightly OTM (within 2% of underlying price)
 */
export async function getLeapsCandidate(
    accessToken: string,
    underlyingSymbol: string,
    underlyingPrice: number
): Promise<LeapsCandidate | null> {
    const chain = await getOptionChainNested(accessToken, underlyingSymbol);

    // 1. Filter expirations to LEAPS range: 360–540 DTE (12–18 months)
    let leapsExpirations = chain.expirations.filter(
        e => e.daysToExpiration >= 360 && e.daysToExpiration <= 540
    );

    if (leapsExpirations.length === 0) {
        // Fallback: any expiration > 300 DTE
        const fallback = chain.expirations
            .filter(e => e.daysToExpiration >= 300)
            .sort((a, b) => Math.abs(a.daysToExpiration - 450) - Math.abs(b.daysToExpiration - 450));
        if (fallback.length === 0) {
            console.error('No LEAPS expirations found for', underlyingSymbol);
            return null;
        }
        leapsExpirations.push(fallback[0]);
    }

    // 2. Pick expiration nearest to 15 months (450 days)
    const targetDTE = 450;
    leapsExpirations.sort((a, b) => Math.abs(a.daysToExpiration - targetDTE) - Math.abs(b.daysToExpiration - targetDTE));
    const expiration = leapsExpirations[0];

    // 3. Find ATM strike: closest strike to current underlying price
    const atmStrike = expiration.strikes.reduce((best, s) => {
        return Math.abs(s.strikePrice - underlyingPrice) < Math.abs(best.strikePrice - underlyingPrice) ? s : best;
    });

    if (!atmStrike.call) {
        console.error('No call symbol found at ATM strike', atmStrike.strikePrice);
        return null;
    }

    // 4. Fetch current bid/ask for this contract
    const quote = await getOptionQuote(accessToken, atmStrike.call);
    if (!quote) {
        console.error('Could not fetch quote for LEAPS contract', atmStrike.call);
        return null;
    }

    console.log(`✅ LEAPS candidate: ${atmStrike.call} | Strike $${atmStrike.strikePrice} | DTE ${expiration.daysToExpiration} | Mid $${quote.mid.toFixed(2)}`);

    return {
        occSymbol: atmStrike.call,
        strikePrice: atmStrike.strikePrice,
        expirationDate: expiration.expirationDate,
        daysToExpiration: expiration.daysToExpiration,
        bid: quote.bid,
        ask: quote.ask,
        mid: quote.mid,
    };
}


/**
 * Cancel all working (pending) orders for the specified symbols.
 * Called before a rebalance to prevent 'illegal_buy_and_sell_on_same_symbol'.
 */
export async function cancelWorkingOrders(
    accessToken: string,
    accountNumber: string,
    symbols: string[]
): Promise<void> {
    if (symbols.length === 0) return;
    try {
        const resp = await fetch(
            `/accounts//orders?status=working`,
            { headers: { Authorization: `Bearer `, 'User-Agent': 'TradeMind/1.0' } }
        );
        if (!resp.ok) { console.warn('[cancelWorkingOrders] Could not fetch working orders:', resp.status); return; }
        const data = await resp.json();
        const orders: any[] = data?.data?.items ?? [];
        const symbolSet = new Set(symbols.map(s => s.toUpperCase()));
        for (const order of orders) {
            const orderSymbols: string[] = (order.legs ?? []).map((l: any) => String(l.symbol ?? '').toUpperCase());
            if (!orderSymbols.some(s => symbolSet.has(s))) continue;
            const delResp = await fetch(
                `/accounts//orders/`,
                { method: 'DELETE', headers: { Authorization: `Bearer `, 'User-Agent': 'TradeMind/1.0' } }
            );
            console.log(`[cancelWorkingOrders]  order  ()`);
        }
    } catch (e) { console.warn('[cancelWorkingOrders] Failed (non-fatal):', e); }
}
/**
 * Submit a multi-leg options order (CSP, ZEBRA, CCS, etc.)
 * Used by the IV-Switching Composite strategy order approval route.
 *
 * Action mapping from Python daily_order_generator:
 *   BUY_TO_OPEN  -> "Buy to Open"
 *   SELL_TO_OPEN -> "Sell to Open"
 *   BUY_TO_CLOSE -> "Buy to Close"
 *   SELL_TO_CLOSE -> "Sell to Close"
 *   BUY  -> "Buy"
 *   SELL -> "Sell"
 */
export async function submitOptionsOrder(
    accessToken: string,
    accountNumber: string,
    orderLegs: Array<{
        action: string;
        symbol: string;
        qty: number;
        instrument_type: string;
    }>,
    limitPrice: number | null,
    orderType: 'Limit' | 'Market' = 'Limit'
): Promise<OrderResponse> {
    const actionMap: Record<string, string> = {
        BUY_TO_OPEN:   'Buy to Open',
        SELL_TO_OPEN:  'Sell to Open',
        BUY_TO_CLOSE:  'Buy to Close',
        SELL_TO_CLOSE: 'Sell to Close',
        BUY:           'Buy',
        SELL:          'Sell',
    };
    // FIX: Do NOT .trim() OCC symbols — padding spaces are required (e.g. "QQQ   260515C00612000")
    // FIX: Send quantity as integer, not string — TT expects numeric type
    const legs = orderLegs.map(leg => ({
        'instrument-type': leg.instrument_type || 'Equity Option',
        'symbol':          leg.symbol,
        'quantity':        Math.abs(leg.qty),
        'action':          actionMap[leg.action.toUpperCase()] || leg.action,
    }));
    // Determine price effect from the PRIMARY (first) leg action:
    //   CCS  → first leg is SELL_TO_OPEN → Credit  (you collect premium)
    //   ZEBRA→ first leg is BUY_TO_OPEN  → Debit   (you pay net debit)
    //   CSP  → single SELL_TO_OPEN       → Credit
    const primaryAction = (orderLegs[0]?.action || '').toUpperCase();
    const priceEffect = primaryAction === 'SELL_TO_OPEN' ? 'Credit' : 'Debit';

    const orderBody: Record<string, any> = {
        'time-in-force': 'Day',
        'order-type':    orderType,
        'legs':          legs,
        'price-effect':  priceEffect,
    };
    // FIX: Send price as number, not string — TT schema expects Decimal
    if (orderType === 'Limit' && limitPrice != null) {
        orderBody['price'] = Math.round(Math.abs(limitPrice) * 100) / 100;
    }

    // Validate OCC symbol lengths (must be 21 chars for equity options)
    for (const leg of legs) {
        if ((leg['instrument-type'] === 'Equity Option') && leg['symbol'].length !== 21) {
            console.warn(`[submitOptionsOrder] ⚠️ OCC symbol length=${leg['symbol'].length} (expected 21): "${leg['symbol']}"`);
        }
    }

    console.log(`[submitOptionsOrder] Submitting ${orderLegs.length}-leg ${priceEffect} order to account ${accountNumber}`, JSON.stringify(orderBody, null, 2));

    // ── 0. Pre-validate: check OCC symbols exist in TT's instrument catalog ──
    // Prevents wasted dry-run on strikes that are too far OTM to be listed.
    // Endpoint: GET /instruments/equity-options?symbol[]=OCC returns empty items[] if unknown.
    try {
        for (const leg of legs) {
            const sym = leg['symbol'];
            const encoded = encodeURIComponent(sym);
            const instrUrl = `${TASTYTRADE_API_BASE}/instruments/equity-options?symbol[]=${encoded}`;
            const instrResp = await fetch(instrUrl, {
                headers: { Authorization: `Bearer ${accessToken}`, 'User-Agent': 'TradeMind/1.0' },
            });
            if (instrResp.ok) {
                const instrData = await instrResp.json();
                const items = instrData?.data?.items ?? [];
                if (items.length === 0) {
                    throw new Error(
                        `[submitOptionsOrder] Instrument not found in TT catalog: "${sym.trim()}" — ` +
                        `strike may be outside the listed range for current market price. ` +
                        `Regenerate the signal with today's live QQQ price.`
                    );
                }
                console.log(`[submitOptionsOrder] ✅ Instrument valid: ${sym.trim()}`);
            } else {
                console.warn(`[submitOptionsOrder] Instrument check returned ${instrResp.status} for ${sym.trim()} — proceeding`);
            }
        }
    } catch (instrErr: any) {
        // Re-throw only if it's our own validation error
        if (instrErr.message?.includes('Instrument not found')) throw instrErr;
        console.warn('[submitOptionsOrder] Instrument pre-check failed (non-fatal):', instrErr.message);
    }

    // ── Fetch live quotes via /market-data/by-type (correct endpoint for bid/ask) ────
    // Format: GET /market-data/by-type?equity-option[]=OCC_SYMBOL&equity-option[]=...
    // Spaces in OCC symbols must be %20-encoded (encodeURIComponent handles this).
    let marketMid: number | null = null;
    try {
        const quoteResults: Record<string, { bid: number; ask: number }> = {};
        const query = legs
            .map(l => `equity-option[]=${encodeURIComponent(l['symbol'])}`)
            .join('&');
        const quoteUrl = `${TASTYTRADE_API_BASE}/market-data/by-type?${query}`;
        const qResp = await fetch(quoteUrl, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'User-Agent': 'TradeMind/1.0',
            },
        });
        if (qResp.ok) {
            const qData = await qResp.json();
            const items: any[] = qData?.data?.items || [];
            for (const item of items) {
                const sym = item.symbol;
                const bid = parseFloat(item.bid ?? '0');
                const ask = parseFloat(item.ask ?? '0');
                if (ask > 0) {
                    quoteResults[sym] = { bid, ask };
                    console.log(`[submitOptionsOrder] Quote ${sym}: bid=${bid} ask=${ask}`);
                } else {
                    console.warn(`[submitOptionsOrder] Zero ask for ${sym} — quote may be stale or market closed`);
                }
            }
        } else {
            console.warn(`[submitOptionsOrder] /market-data/by-type returned ${qResp.status}`);
        }

        // Calculate net spread price from live quotes
        if (Object.keys(quoteResults).length === legs.length) {
            let netMid = 0;
            for (const leg of legs) {
                const q = quoteResults[leg['symbol']];
                if (!q) break;
                const action = String(leg['action']).toLowerCase();
                const mid = (q.bid + q.ask) / 2;
                if (action.includes('sell')) {
                    netMid += mid;  // selling = receiving credit
                } else {
                    netMid -= mid;  // buying = paying debit
                }
            }
            // For credit spreads netMid is positive, debit is negative
            marketMid = Math.round(Math.abs(netMid) * 100) / 100;
            console.log(`[submitOptionsOrder] 📊 Live market mid: $${marketMid.toFixed(2)} ${priceEffect} | Signal price: $${orderBody['price'] ?? 'none'}`);
        } else {
            console.warn(`[submitOptionsOrder] Could not fetch all quotes (got ${Object.keys(quoteResults).length}/${legs.length}) — using signal price`);
        }
    } catch (quoteErr) {
        console.warn('[submitOptionsOrder] Quote fetch failed:', quoteErr);
    }


    // ── Price ladder: start at market mid, adjust by $0.05/step ─────────────────
    // For CREDIT spreads: start at mid, step DOWN (accept less credit)
    // For DEBIT spreads: start at mid, step UP (pay more)
    const LADDER_STEPS = 4;
    const STEP_SIZE = 0.05;  // $0.05 per step
    const WAIT_SECONDS = 15; // Seconds between ladder steps

    const startPrice = marketMid ?? (orderBody['price'] ? Number(orderBody['price']) : null);
    if (!startPrice || startPrice <= 0) {
        throw new Error('[submitOptionsOrder] No valid price — neither market quotes nor signal price available');
    }

    // Build price ladder
    const priceLadder: number[] = [];
    for (let step = 0; step < LADDER_STEPS; step++) {
        if (priceEffect === 'Credit') {
            // Credit: start at mid, step down (accept less credit to get filled)
            priceLadder.push(Math.max(0.01, Math.round((startPrice - step * STEP_SIZE) * 100) / 100));
        } else {
            // Debit: start at mid, step up (pay more to get filled)
            priceLadder.push(Math.round((startPrice + step * STEP_SIZE) * 100) / 100);
        }
    }
    console.log(`[submitOptionsOrder] Price ladder (${priceEffect}): ${priceLadder.map(p => `$${p.toFixed(2)}`).join(' → ')}`);

    // ── Dry-run preflight at the starting price ────────────────────────────────
    orderBody['price'] = priceLadder[0];
    try {
        const dryRunResp = await fetch(
            `${TASTYTRADE_API_BASE}/accounts/${accountNumber}/orders/dry-run`,
            {
                method: 'POST',
                headers: {
                    Authorization:  `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    'User-Agent':   'TradeMind/1.0',
                },
                body: JSON.stringify(orderBody),
            }
        );
        if (!dryRunResp.ok) {
            const dryRunData = await dryRunResp.json().catch(() => null);
            console.error('[submitOptionsOrder] Dry-run FAILED:', JSON.stringify(dryRunData, null, 2));
            if (dryRunResp.status === 422) {
                // Correct path per TT docs: error.errors[] each has {code, message}
                const errMsg = dryRunData?.error?.message || 'Dry-run validation failed';
                const preflightErrors: any[] = dryRunData?.error?.errors ?? [];
                const failedChecks = preflightErrors
                    .map((e: any) => `${e.code || '?'}: ${e.message || '?'}`)
                    .join('; ');
                throw new Error(`[submitOptionsOrder] Dry-run rejected: ${errMsg}${failedChecks ? ` | ${failedChecks}` : ''}`);
            }
            console.warn(`[submitOptionsOrder] Dry-run returned ${dryRunResp.status}, proceeding cautiously...`);
        } else {
            console.log('[submitOptionsOrder] ✅ Dry-run passed — order is valid');
        }
    } catch (dryErr) {
        if (dryErr instanceof Error && dryErr.message.includes('Dry-run rejected')) throw dryErr;
        console.warn('[submitOptionsOrder] Dry-run inconclusive:', dryErr);
    }

    // ── Price ladder execution loop ────────────────────────────────────────────
    for (let step = 0; step < priceLadder.length; step++) {
        const price = priceLadder[step];
        orderBody['price'] = price;

        console.log(`[submitOptionsOrder] Step ${step + 1}/${priceLadder.length}: submitting at $${price.toFixed(2)} ${priceEffect}`);

        const resp = await fetch(
            `${TASTYTRADE_API_BASE}/accounts/${accountNumber}/orders`,
            {
                method: 'POST',
                headers: {
                    Authorization:  `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    'User-Agent':   'TradeMind/1.0',
                },
                body: JSON.stringify(orderBody),
            }
        );
        const data = await resp.json();

        if (!resp.ok) {
            console.error(`[submitOptionsOrder] Submit failed (HTTP ${resp.status}):`, JSON.stringify(data, null, 2));
            // On 500, try next price step
            if (resp.status >= 500 && step < priceLadder.length - 1) {
                console.warn(`[submitOptionsOrder] Server error — trying next price step...`);
                await new Promise(r => setTimeout(r, 2000));
                continue;
            }
            const topMsg = data?.error?.message || data?.errors?.[0]?.message || 'Unknown error';
            const preflightChecks: any[] = data?.error?.['preflight-checks'] || data?.errors?.[0]?.['preflight-checks'] || [];
            const failedChecks = preflightChecks
                .filter((c: any) => c.status === 'fail' || c.status === 'Error')
                .map((c: any) => `${c.code || c.reason || '?'}: ${c.message || c.description || '?'}`)
                .join('; ');
            throw new Error(`[submitOptionsOrder] TT rejected: ${topMsg}${failedChecks ? ` | preflight: ${failedChecks}` : ''}`);
        }

        const order = data?.data?.order || data?.data || data;
        const orderId = String(order?.id || order?.['order-id'] || 'unknown');
        const status  = String(order?.status || order?.['status'] || 'unknown');
        console.log(`[submitOptionsOrder] Order placed: orderId=${orderId} status=${status} price=$${price.toFixed(2)}`);

        // If filled immediately, return
        if (status === 'Filled') {
            console.log(`[submitOptionsOrder] ✅ Filled immediately at $${price.toFixed(2)}`);
            return { orderId, status };
        }

        // Last step — leave the order working, don't cancel
        if (step === priceLadder.length - 1) {
            console.log(`[submitOptionsOrder] ✅ Final step — leaving order working at $${price.toFixed(2)}`);
            return { orderId, status: status || 'Working' };
        }

        // Wait and check if filled
        console.log(`[submitOptionsOrder] Waiting ${WAIT_SECONDS}s for fill...`);
        await new Promise(r => setTimeout(r, WAIT_SECONDS * 1000));

        // Check order status
        try {
            const statusResp = await fetch(
                `${TASTYTRADE_API_BASE}/accounts/${accountNumber}/orders/${orderId}`,
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'User-Agent': 'TradeMind/1.0',
                    },
                }
            );
            if (statusResp.ok) {
                const statusData = await statusResp.json();
                const currentStatus = statusData?.data?.status || statusData?.data?.order?.status || '';
                console.log(`[submitOptionsOrder] Order ${orderId} status after ${WAIT_SECONDS}s: ${currentStatus}`);

                if (currentStatus === 'Filled') {
                    console.log(`[submitOptionsOrder] ✅ Filled at $${price.toFixed(2)}`);
                    return { orderId, status: 'Filled' };
                }

                // Not filled — cancel and try next price
                if (currentStatus === 'Live' || currentStatus === 'Received') {
                    console.log(`[submitOptionsOrder] Not filled — cancelling order ${orderId} to adjust price...`);
                    try {
                        await fetch(
                            `${TASTYTRADE_API_BASE}/accounts/${accountNumber}/orders/${orderId}`,
                            {
                                method: 'DELETE',
                                headers: {
                                    Authorization: `Bearer ${accessToken}`,
                                    'User-Agent': 'TradeMind/1.0',
                                },
                            }
                        );
                        console.log(`[submitOptionsOrder] Cancelled order ${orderId}`);
                        // Brief pause for cancel to process
                        await new Promise(r => setTimeout(r, 1000));
                    } catch (cancelErr) {
                        console.warn(`[submitOptionsOrder] Cancel failed (may have filled):`, cancelErr);
                        // If cancel failed, the order may have filled — return it
                        return { orderId, status: currentStatus };
                    }
                }
            }
        } catch (statusErr) {
            console.warn(`[submitOptionsOrder] Status check failed:`, statusErr);
            // Can't determine status — leave order and return
            return { orderId, status: 'Working' };
        }
    }

    throw new Error('[submitOptionsOrder] Price ladder exhausted without fill');
}
