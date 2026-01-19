import { Redis } from '@upstash/redis';

// Initialize Redis client
// Uses UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN from environment
const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL || '',
    token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

export interface TastytradeTokens {
    accessToken: string;
    refreshToken: string;
    expiresAt: number; // Unix timestamp
    linkedAt: number;
    accountNumber?: string;
}

/**
 * Store Tastytrade tokens for a user
 */
export async function storeTastytradeTokens(
    userId: string,
    tokens: TastytradeTokens
): Promise<void> {
    const key = `tastytrade:${userId}`;
    await redis.set(key, JSON.stringify(tokens));
    // Tokens don't expire (refresh token is long-lived)
}

/**
 * Get Tastytrade tokens for a user
 */
export async function getTastytradeTokens(
    userId: string
): Promise<TastytradeTokens | null> {
    const key = `tastytrade:${userId}`;
    const data = await redis.get<string>(key);

    if (!data) return null;

    try {
        return typeof data === 'string' ? JSON.parse(data) : data as TastytradeTokens;
    } catch {
        return null;
    }
}

/**
 * Check if user has linked Tastytrade
 */
export async function isTastytradeLinked(userId: string): Promise<boolean> {
    const tokens = await getTastytradeTokens(userId);
    return tokens !== null;
}

/**
 * Delete Tastytrade tokens (unlink account)
 */
export async function unlinkTastytrade(userId: string): Promise<void> {
    const key = `tastytrade:${userId}`;
    await redis.del(key);
}

/**
 * Update access token (after refresh)
 */
export async function updateAccessToken(
    userId: string,
    accessToken: string,
    expiresAt: number
): Promise<void> {
    const tokens = await getTastytradeTokens(userId);
    if (tokens) {
        tokens.accessToken = accessToken;
        tokens.expiresAt = expiresAt;
        await storeTastytradeTokens(userId, tokens);
    }
}

export { redis };
