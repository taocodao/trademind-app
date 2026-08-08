import { cookies } from 'next/headers';

/** Extract the Privy user id from the session cookie. Returns null if unauthenticated. */
export async function getUserId(): Promise<string | null> {
    const cookieStore = await cookies();
    const privyToken = cookieStore.get('privy-token')?.value;
    if (!privyToken) return null;
    try {
        const payload = privyToken.split('.')[1];
        const decoded = JSON.parse(atob(payload));
        return decoded.sub || decoded.privy_did || decoded.userId || null;
    } catch {
        return null;
    }
}
