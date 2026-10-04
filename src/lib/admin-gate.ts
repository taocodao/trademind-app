/**
 * Server-side admin gate, built on the app's existing Privy email login.
 *
 * Security model: signing in as support@trademind.bot requires the passcode
 * sent to that inbox, so a genuine Privy session for that account can only
 * belong to someone with mailbox access. The gate pins that account's Privy
 * DID (stable account id):
 *
 *   1. The session token's ES256 signature is verified against the app's
 *      public JWKS — the DID is cryptographically genuine (no secret).
 *   2. The DID must equal ADMIN_PRIVY_DID. Nothing client-supplied is
 *      trusted; there is no claim or binding endpoint.
 *
 * Provisioning: sign in at /admin with support@trademind.bot; the page
 * shows the session's account id once, which is then set as
 * ADMIN_PRIVY_DID below (or via the ADMIN_PRIVY_DID env var).
 *
 * If PRIVY_APP_SECRET is ever configured, the gate instead fetches the
 * account's email from Privy's server API and compares it to ADMIN_EMAIL.
 */
import { createHmac, createPublicKey, timingSafeEqual, verify as cryptoVerify, type KeyObject } from 'crypto';
import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

export const ADMIN_EMAIL = 'support@trademind.bot';

/** Set after the one-time provisioning step shown on /admin. */
const ADMIN_PRIVY_DID = process.env.ADMIN_PRIVY_DID ?? '';

const PRIVY_APP_ID =
    process.env.NEXT_PUBLIC_PRIVY_APP_ID && process.env.NEXT_PUBLIC_PRIVY_APP_ID !== 'FILL_IN'
        ? process.env.NEXT_PUBLIC_PRIVY_APP_ID
        : 'cmkkk59s100a0js0dv4k6na8k';

export interface AdminResolution {
    did: string | null; // verified session DID (useful for provisioning)
    isAdmin: boolean;
    status: number; // 200 ok, 401 unauthenticated, 403 not admin, 503 unprovisioned
    error?: string;
}

// ── Admin session cookie (8 hours) ──────────────────────────────────────────
// Privy access tokens last about an hour. After a verified admin sign-in the
// server issues its own signed, httpOnly cookie that keeps the admin console
// working for a fixed 8 hours (not sliding). It is bound to the pinned admin
// DID and signed with a server-only secret; with no secret configured the
// feature is off and the gate behaves exactly as before.
export const ADMIN_SESSION_COOKIE = 'tm-admin-session';
export const ADMIN_SESSION_SECONDS = 8 * 60 * 60;

function sessionSecret(): string {
    return process.env.ADMIN_SESSION_SECRET || process.env.CRON_SECRET || process.env.PRIVY_APP_SECRET || '';
}

function sign(payload: string): string {
    return createHmac('sha256', sessionSecret()).update(`tm-admin-session.${payload}`).digest('base64url');
}

/** Returns a signed cookie value for this DID, plus its expiry (ms epoch). */
export function mintAdminSession(did: string, now = Date.now()): { value: string; expiresAt: number } | null {
    if (!sessionSecret()) return null;
    const expiresAt = now + ADMIN_SESSION_SECONDS * 1000;
    const payload = `${Buffer.from(did).toString('base64url')}.${expiresAt}`;
    return { value: `${payload}.${sign(payload)}`, expiresAt };
}

/** Expiry (ms epoch) of a valid, unexpired cookie for the pinned admin DID, else null. */
export function readAdminSession(value: string | undefined): number | null {
    try {
        if (!value || !sessionSecret() || !ADMIN_PRIVY_DID) return null;
        const [didB64, exp, sig] = value.split('.');
        if (!didB64 || !exp || !sig) return null;
        const payload = `${didB64}.${exp}`;
        const a = Buffer.from(sig), b = Buffer.from(sign(payload));
        if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
        if (Buffer.from(didB64, 'base64url').toString() !== ADMIN_PRIVY_DID) return null;
        const expiresAt = Number(exp);
        return Number.isFinite(expiresAt) && expiresAt > Date.now() ? expiresAt : null;
    } catch {
        return null;
    }
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

// ── Optional full verification via Privy server API ─────────────────────────
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
 * Resolves the request's admin status. Reads the session from the
 * privy-token cookie or a Bearer header. Always fails closed.
 */
export async function resolveAdmin(req?: NextRequest): Promise<AdminResolution> {
    let token: string | undefined;
    try {
        const cookieStore = await cookies();
        // Valid 8 hour admin session: no need for a fresh Privy token.
        if (readAdminSession(cookieStore.get(ADMIN_SESSION_COOKIE)?.value) && ADMIN_PRIVY_DID) {
            return { did: ADMIN_PRIVY_DID, isAdmin: true, status: 200 };
        }
        token = cookieStore.get('privy-token')?.value;
    } catch { /* cookies() unavailable in this context */ }
    if (!token && req) {
        const authHeader = req.headers.get('Authorization');
        if (authHeader?.startsWith('Bearer ')) token = authHeader.slice(7);
    }
    if (!token) return { did: null, isAdmin: false, status: 401, error: 'Not signed in' };

    const did = await verifyTokenDid(token);
    if (!did) return { did: null, isAdmin: false, status: 401, error: 'Invalid session token' };

    // Full verification path when the server secret is configured.
    if (process.env.PRIVY_APP_SECRET) {
        const email = await emailForDid(did);
        if (email && email === ADMIN_EMAIL.toLowerCase()) return { did, isAdmin: true, status: 200 };
        return { did, isAdmin: false, status: 403, error: 'Admin access required' };
    }

    // Pinned-DID path: no client input can influence the outcome.
    if (!ADMIN_PRIVY_DID) {
        return { did, isAdmin: false, status: 503, error: 'Admin account not provisioned yet' };
    }
    if (did === ADMIN_PRIVY_DID) return { did, isAdmin: true, status: 200 };
    return { did, isAdmin: false, status: 403, error: 'Admin access required' };
}
