/**
 * LEAPS State Persistence
 * Stores the currently open LEAPS contract per user/account in Redis.
 * Redis key: leaps_state:{userId}:{accountNumber}
 * TTL: 400 days (covers a full LEAPS holding period)
 */
import { redis } from './redis';

export interface LeapsState {
    userId: string;
    accountNumber: string;
    occSymbol: string;          // e.g. "QQQ   270620C00450000"
    underlyingSymbol: string;   // "QQQ"
    strikePrice: number;
    expirationDate: string;     // YYYY-MM-DD
    daysToExpirationAtOpen: number;
    contracts: number;          // number of contracts held
    openedAt: string;           // ISO timestamp
    openCostPerContract: number; // ask price paid at open * 100
}

function redisKey(userId: string, accountNumber: string): string {
    return `leaps_state:${userId}:${accountNumber}`;
}

export async function getLeapsState(
    userId: string,
    accountNumber: string
): Promise<LeapsState | null> {
    if (!redis) return null;
    const raw = await redis.get<string | object>(redisKey(userId, accountNumber));
    if (!raw) return null;
    try {
        return typeof raw === 'string' ? JSON.parse(raw) as LeapsState : raw as LeapsState;
    } catch {
        return null;
    }
}

export async function setLeapsState(
    userId: string,
    accountNumber: string,
    state: LeapsState
): Promise<void> {
    if (!redis) return;
    // TTL: 400 days in seconds — cover the full LEAPS holding window
    await redis.set(redisKey(userId, accountNumber), state, { ex: 400 * 86400 });
}

export async function clearLeapsState(
    userId: string,
    accountNumber: string
): Promise<void> {
    if (!redis) return;
    await redis.del(redisKey(userId, accountNumber));
}

/**
 * Returns how many DTE remain on the current LEAPS contract.
 */
export function getDaysToExpiration(state: LeapsState): number {
    const now = new Date();
    const expiry = new Date(state.expirationDate);
    return Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}
