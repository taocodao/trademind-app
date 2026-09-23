/**
 * Server-side admin gate.
 *
 * Only one identity is admin: the Privy account whose email is ADMIN_EMAIL.
 * Verification is fully server-side:
 *   1. The session token's ES256 signature is checked against the app's
 *      public JWKS (no secret needed, proves the DID is genuine).
 *   2. The account's email is fetched from Privy's server API with the app
 *      secret (PRIVY_APP_SECRET env var). Without the secret the gate fails
 *      CLOSED: nobody is admin, because no client-supplied value is trusted.
 */
import { createPublicKey, verify as cryptoVerify, type KeyObject } from 'crypto';
import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

export const ADMIN_EMAIL = 'support@trademind.bot';

const PRIVY_APP_ID =
    process.env.NEXT_PUBLIC_PRIVY_APP_ID && process.env.NEXT_PUBLIC_PRIVY_APP_ID !== 'FILL_IN'
        ? process.env.NEXT_PUBLIC_PRIVY_APP_ID
        : 'cmkkk59s100a0js0dv4k6na8k';

export interface AdminResolution {
    did: string | null;
    status: number; // 200 ok, 401 unauthenticated, 403 not admin, 503 not configured
    error?: string;
}

// ── Token signature verification (JWKS, cached) ─────────────────────────────
let cachedKey: KeyObject | null = null;
async function privyPublicKey(): Promise<KeyObject | null> {
    if (cachedKey) return cachedKey;
    try {
        const res = await fetch(`https://auth.privy.io/api/v1/apps/${PRIVY_APP_ID}/jwks.json`, {
            cache: 'no-store',
        });
        if (!res.ok) return null;
        const { keys } = await res.json();
        if (!keys?.length) return null;
        cachedKey = createPublicKey({ key: keys[0], format: 'jwk' });
        return cachedKey;
    } catch {
        return null;
    }
}

async function verifyTokenDid(token: string): Promise<string | null> {
    try {
        const [h, p, s] = token.split('.');
        if (!h || !p || !s) return null;
        const key = await privyPublicKey();
        if (!key) return null;
        const ok = cryptoVerify(
            'sha256',
            Buffer.from(`${h}.${p}`),
            { key, dsaEncoding: 'ieee-p1363' },
            Buffer.from(s, 'base64url')
        );
        if (!ok) return null;
        const payload = JSON.parse(Buffer.from(p, 'base64url').toString());
        if (payload.exp && payload.exp * 1000 < Date.now()) return null;
        return payload.sub || null;
    } catch {
        return null;
    }
}

// ── Email lookup via Privy server API (needs the app secret) ────────────────
async function emailForDid(did: string): Promise<string | null> {
    const secret = process.env.PRIVY_APP_SECRET;
    if (!secret) return null;
    try {
        const auth = Buffer.from(`${PRIVY_APP_ID}:${secret}`).toString('base64');
        const res = await fetch(`https://auth.privy.io/api/v1/users/${encodeURIComponent(did)}`, {
            headers: { Authorization: `Basic ${auth}`, 'privy-app-id': PRIVY_APP_ID },
            cache: 'no-store',
        });
        if (!res.ok) return null;
        const u = await res.json();
        const acc = (u.linked_accounts ?? []).find(
            (a: { type?: string }) => a.type === 'email'
        );
        return acc?.address ? String(acc.address).trim().toLowerCase() : null;
    } catch {
        return null;
    }
}

/**
 * Resolves the request to an admin identity, or explains why not.
 * Reads the session from the privy-token cookie or a Bearer header.
 */
export async function resolveAdmin(req?: NextRequest): Promise<AdminResolution> {
    let token: string | undefined;
    try {
        const cookieStore = await cookies();
        token = cookieStore.get('privy-token')?.value;
    } catch { /* cookies() unavailable in this context */ }
    if (!token && req) {
        const authHeader = req.headers.get('Authorization');
        if (authHeader?.startsWith('Bearer ')) token = authHeader.slice(7);
    }
    if (!token) return { did: null, status: 401, error: 'Not signed in' };

    const did = await verifyTokenDid(token);
    if (!did) return { did: null, status: 401, error: 'Invalid session token' };

    if (!process.env.PRIVY_APP_SECRET) {
        return {
            did: null,
            status: 503,
            error: 'Admin verification is not configured on the server (PRIVY_APP_SECRET missing)',
        };
    }
    const email = await emailForDid(did);
    if (!email) return { did: null, status: 403, error: 'Could not verify account email' };
    if (email !== ADMIN_EMAIL.toLowerCase()) {
        return { did: null, status: 403, error: 'Admin access required' };
    }
    return { did, status: 200 };
}
