// Tastytrade OAuth Configuration
// Using PRODUCTION environment (credentials registered at my.tastytrade.com)

export const TASTYTRADE_CONFIG = {
    // Production environment - ALL endpoints must match!
    // Auth codes from my.tastytrade.com only work with api.tastyworks.com
    authUrl: 'https://my.tastytrade.com/auth.html',
    tokenUrl: 'https://api.tastyworks.com/oauth/token',
    apiBaseUrl: 'https://api.tastyworks.com',

    // NOTE: api.cert.tastyworks.com is for SANDBOX/TESTING only
    // It requires auth codes from cert-my.staging-tasty.works, not my.tastytrade.com

    clientId: process.env.TASTYTRADE_CLIENT_ID || '',
    clientSecret: process.env.TASTYTRADE_CLIENT_SECRET || '',
    redirectUri: process.env.NEXT_PUBLIC_TASTYTRADE_REDIRECT_URI ||
        (typeof window !== 'undefined'
            ? `${window.location.origin}/api/tastytrade/oauth/callback`
            : 'https://localhost:3000/api/tastytrade/oauth/callback'),

    scopes: ['PlaceTrades', 'AccountAccess'],  // Tastytrade-specific scopes (not generic OAuth scopes)
};

/**
 * Generate OAuth authorization URL
 */
export function getTastytradeAuthUrl(state?: string): string {
    const params = new URLSearchParams({
        client_id: TASTYTRADE_CONFIG.clientId,
        redirect_uri: TASTYTRADE_CONFIG.redirectUri,
        response_type: 'code',
        scope: TASTYTRADE_CONFIG.scopes.join(' '),
    });

    if (state) {
        params.append('state', state);
    }

    return `${TASTYTRADE_CONFIG.authUrl}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
}> {
    // Use production redirect URI - MUST match what Tastytrade has registered
    const redirectUri = process.env.NEXT_PUBLIC_TASTYTRADE_REDIRECT_URI
        || 'https://trademind.bot/api/tastytrade/oauth/callback';

    console.log('[OAuth Exchange] Parameters:', {
        tokenUrl: TASTYTRADE_CONFIG.tokenUrl,
        grant_type: 'authorization_code',
        code: code.substring(0, 20) + '...',
        client_id: TASTYTRADE_CONFIG.clientId.substring(0, 8) + '...',
        redirect_uri: redirectUri,
    });

    const response = await fetch(TASTYTRADE_CONFIG.tokenUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'trademind/1.0',
        },
        body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            client_id: TASTYTRADE_CONFIG.clientId,
            client_secret: TASTYTRADE_CONFIG.clientSecret,
            redirect_uri: redirectUri,
        }),
    });

    console.log('[OAuth Exchange] Response status:', response.status);

    if (!response.ok) {
        const error = await response.text();
        console.error('[OAuth Exchange] Error:', error);
        throw new Error(`Token exchange failed: ${error}`);
    }

    const data = await response.json();
    console.log('[OAuth Exchange] Success! Got access_token');
    return data;
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<{
    access_token: string;
    expires_in: number;
    refresh_token?: string; // Optional, present if rotated
}> {
    console.log("[OAuth] Attempting token refresh...");

    const bodyParams = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: TASTYTRADE_CONFIG.clientId,
        // NOTE: redirect_uri is NOT needed for refresh_token grants, only authorization_code
    });
    // Add secret back for actual request
    bodyParams.append('client_secret', TASTYTRADE_CONFIG.clientSecret);

    console.log("[OAuth] Refresh params (redacted):", {
        grant_type: 'refresh_token',
        client_id: TASTYTRADE_CONFIG.clientId,
        redirect_uri: TASTYTRADE_CONFIG.redirectUri,
        token_preview: refreshToken.substring(0, 10) + '...'
    });

    const response = await fetch(TASTYTRADE_CONFIG.tokenUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'trademind/1.0',
        },
        body: bodyParams,
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`[OAuth] Token refresh failed: ${response.status} - ${errorText}`);
        // Log the exact request body for debugging (be careful with secrets in prod logs, but needed here)
        console.error(`[OAuth] Failed params: client_id=${TASTYTRADE_CONFIG.clientId}, redirect_uri=${TASTYTRADE_CONFIG.redirectUri}`);
        throw new Error(`Token refresh failed: ${response.status} - ${errorText}`);
    }

    console.log("[OAuth] Token refresh successful");
    return response.json();
}
