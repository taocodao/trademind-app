/**
 * Shared server-side auth helper.
 * Extracts the authenticated Privy user ID from the request cookies or Bearer token.
 * Returns null if no valid identity is found — callers should respond with 401.
 * 
 * NEVER returns a fallback ("default-user" etc.) — that would be a security hole
 * where unauthenticated requests accidentally read/write another user's data.
 */
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';

function decodePrivyToken(token: string): string | null {
    try {
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        return payload.sub || payload.privy_did || payload.userId || null;
    } catch {
        return null;
    }
}

/**
 * Resolves the Privy user ID from a server route handler.
 *
 * Resolution order:
 * 1. Cookie `privy-user-id` (set by Privy SDK)
 * 2. Cookie `privy-token` (JWT from browser session)
 * 3. `Authorization: Bearer <token>` header (for programmatic calls)
 *
 * @returns The Privy DID string, or `null` if unauthenticated.
 */
export async function getPrivyUserId(req?: NextRequest): Promise<string | null> {
    // 1. Check privy-user-id cookie (fastest)
    const cookieStore = await cookies();
    const directId = cookieStore.get('privy-user-id')?.value;
    if (directId) return directId;

    // 2. Decode privy-token cookie
    const privyToken = cookieStore.get('privy-token')?.value;
    if (privyToken) {
        const id = decodePrivyToken(privyToken);
        if (id) return id;
    }

    // 3. Bearer token from Authorization header (programmatic / server-side calls)
    if (req) {
        const authHeader = req.headers.get('Authorization');
        if (authHeader?.startsWith('Bearer ')) {
            const id = decodePrivyToken(authHeader.slice(7));
            if (id) return id;
        }
    }

    return null;
}
