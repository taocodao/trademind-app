// Tastytrade OAuth Configuration
// Using PRODUCTION environment (credentials registered at my.tastytrade.com)

export const TASTYTRADE_CONFIG = {
    // IMPORTANT: Must use api.cert.tastyworks.com for BOTH authorization_code AND refresh_token
    // Tokens from api.tastyworks.com don't work with api.cert.tastyworks.com and vice versa
    authUrl: 'https://my.tastytrade.com/auth.html',
    tokenUrl: 'https://api.cert.tastyworks.com/oauth/token',  // FIXED: was api.tastyworks.com
    apiBaseUrl: 'https://api.cert.tastyworks.com',             // FIXED: was api.tastyworks.com

    // Old production endpoints (blocked by nginx):
    // authUrl: 'https://my.tastytrade.com/auth.html',
    // tokenUrl: 'https://api.tastyworks.com/oauth/token',
    // apiBaseUrl: 'https://api.tastyworks.com',

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
            redirect_uri: TASTYTRADE_CONFIG.redirectUri,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Token exchange failed: ${error}`);
    }

    return response.json();
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
