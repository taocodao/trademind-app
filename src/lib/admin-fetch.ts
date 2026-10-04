'use client';

/**
 * fetch() for admin API calls. Attaches a fresh Privy access token (the SDK
 * refreshes it when it has expired, e.g. after the tab sat idle) and retries
 * once on 401, so an idle admin page keeps working without a re-login.
 */
type TokenGetter = () => Promise<string | null>;
let getToken: TokenGetter | null = null;

export function setAdminTokenGetter(fn: TokenGetter | null) {
    getToken = fn;
}

async function withToken(init: RequestInit | undefined): Promise<RequestInit> {
    const headers = new Headers(init?.headers);
    try {
        const token = getToken ? await getToken() : null;
        if (token) headers.set('Authorization', `Bearer ${token}`);
    } catch { /* fall back to the cookie */ }
    return { ...init, headers, credentials: 'same-origin' };
}

export async function adminFetch(input: string, init?: RequestInit): Promise<Response> {
    let res = await fetch(input, await withToken(init));
    if (res.status === 401) res = await fetch(input, await withToken(init));
    return res;
}

/** Current access token (refreshed if needed), or null. */
export async function adminToken(): Promise<string | null> {
    try { return getToken ? await getToken() : null; } catch { return null; }
}
