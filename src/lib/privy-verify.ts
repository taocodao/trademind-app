/**
 * Privy access token verification (WebCrypto, runs in middleware and in Node routes).
 *
 * A token is accepted only if its ES256 signature checks out against the app's published
 * JWKS, it has not expired, and issuer and audience match this Privy app.
 */

const APP_ID = (() => {
    const v = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
    return v && v !== 'FILL_IN' ? v : '';
})();

interface Jwk { kid?: string; kty: string; crv?: string; x?: string; y?: string; alg?: string }
let jwksCache: { keys: Jwk[]; fetchedAt: number } | null = null;
const keyCache = new Map<string, CryptoKey>();
const JWKS_TTL_MS = 60 * 60 * 1000;

export function privyVerificationConfigured(): boolean {
    return APP_ID !== '';
}

async function loadJwks(force = false): Promise<Jwk[] | null> {
    const fresh = jwksCache && Date.now() - jwksCache.fetchedAt < JWKS_TTL_MS;
    if (fresh && !force) return jwksCache!.keys;
    try {
        const res = await fetch(`https://auth.privy.io/api/v1/apps/${APP_ID}/jwks.json`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`jwks ${res.status}`);
        const { keys } = (await res.json()) as { keys?: Jwk[] };
        if (!keys?.length) throw new Error('jwks empty');
        jwksCache = { keys, fetchedAt: Date.now() };
        keyCache.clear();
        return keys;
    } catch {
        // Keep serving the last good key set if Privy is briefly unreachable.
        return jwksCache?.keys ?? null;
    }
}

async function importKey(jwk: Jwk): Promise<CryptoKey> {
    const id = `${jwk.kid ?? ''}:${jwk.x}:${jwk.y}`;
    const hit = keyCache.get(id);
    if (hit) return hit;
    const key = await crypto.subtle.importKey(
        'jwk',
        { kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y, ext: true },
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['verify']
    );
    keyCache.set(id, key);
    return key;
}

function b64urlToBytes(s: string): Uint8Array<ArrayBuffer> {
    const pad = '='.repeat((4 - (s.length % 4)) % 4);
    const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad);
    const out = new Uint8Array(new ArrayBuffer(bin.length));
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
}

/** Returns the Privy DID (sub) of a valid token, otherwise null. */
export async function verifyPrivyToken(token: string | null | undefined): Promise<string | null> {
    if (!token || !APP_ID) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [h, p, s] = parts;
    try {
        const header = JSON.parse(new TextDecoder().decode(b64urlToBytes(h)));
        if (header.alg !== 'ES256') return null;
        const payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(p)));
        if (typeof payload.exp !== 'number' || payload.exp * 1000 < Date.now()) return null;
        if (payload.iss !== 'privy.io') return null;
        const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
        if (!aud.includes(APP_ID)) return null;
        if (typeof payload.sub !== 'string' || !payload.sub) return null;

        const data = new TextEncoder().encode(`${h}.${p}`);
        const sig = b64urlToBytes(s);
        const tryKeys = async (keys: Jwk[]) => {
            const ordered = header.kid ? [...keys.filter((k) => k.kid === header.kid), ...keys.filter((k) => k.kid !== header.kid)] : keys;
            for (const jwk of ordered) {
                if (await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, await importKey(jwk), sig, data)) return true;
            }
            return false;
        };
        let keys = await loadJwks();
        if (!keys) return null;
        if (await tryKeys(keys)) return payload.sub;
        // Unknown signing key: Privy may have rotated, refresh once.
        keys = await loadJwks(true);
        if (keys && (await tryKeys(keys))) return payload.sub;
        return null;
    } catch {
        return null;
    }
}

/** Verified DID when verification is configured. Without an app id there is nothing to verify against, so refuse. */
export async function didFromToken(token: string | null | undefined): Promise<string | null> {
    return verifyPrivyToken(token);
}
