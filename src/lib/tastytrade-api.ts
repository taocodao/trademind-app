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
        },
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
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

    const response = await fetch(
        `${TASTYTRADE_API_BASE}/accounts/${accountNumber}/orders`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(apiOrder),
        }
    );

    const data = await response.json();

    if (!response.ok) {
        console.error('Order submission error:', data);
        throw new Error(
            data.error?.message ||
            data.errors?.[0]?.message ||
            'Failed to submit order'
        );
    }

    return {
        orderId: data.data?.order?.id || data.data?.id || 'unknown',
        status: data.data?.order?.status || 'submitted',
        message: 'Order submitted successfully',
    };
}

/**
 * Execute a calendar spread trade
 */
export async function executeCalendarSpread(
    accessToken: string,
    accountNumber: string,
    signal: {
        symbol: string;
        strike: number;
        frontExpiry: string;  // YYYY-MM-DD
        backExpiry: string;   // YYYY-MM-DD
        price?: number;
        direction?: 'bullish' | 'bearish';
    }
): Promise<OrderResponse> {
    const { symbol, strike, frontExpiry, backExpiry, price, direction } = signal;

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

    const order: OrderRequest = {
        timeInForce: 'Day',
        orderType: price ? 'Limit' : 'Market',
        price: price,
        priceEffect: 'Debit',
        legs: [
            {
                instrumentType: 'Equity Option',
                symbol: frontSymbol.trim(),
                quantity: 1,
                action: 'Sell to Open',
            },
            {
                instrumentType: 'Equity Option',
                symbol: backSymbol.trim(),
                quantity: 1,
                action: 'Buy to Open',
            },
        ],
    };

    return submitOrder(accessToken, accountNumber, order);
}
