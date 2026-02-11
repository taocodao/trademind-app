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

export interface OrderLeg {
    instrumentType: 'Equity Option' | 'Equity' | 'Future Option' | 'Future';
    symbol: string;
    quantity: number;
    action: 'Buy to Open' | 'Buy to Close' | 'Sell to Open' | 'Sell to Close';
}

export interface OrderRequest {
    timeInForce: 'Day' | 'GTC' | 'GTD';
    orderType: 'Limit' | 'Market';
    price?: number;
    priceEffect: 'Debit' | 'Credit';
    legs: OrderLeg[];
}

export interface OrderResponse {
    orderId: string;
    status: string;
    message?: string;
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

    const orderUrl = `${TASTYTRADE_API_BASE}/accounts/${accountNumber}/orders`;
    console.log(`📤 Submitting order to: ${orderUrl}`);
    console.log(`   Order body:`, JSON.stringify(apiOrder, null, 2));

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
