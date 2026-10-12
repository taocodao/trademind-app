import { cookies } from 'next/headers';
import { didFromToken } from '@/lib/privy-verify';

/** Extract the verified Privy user id from the session cookie. Returns null if unauthenticated or the token is invalid. */
export async function getUserId(): Promise<string | null> {
    const cookieStore = await cookies();
    const privyToken = cookieStore.get('privy-token')?.value;
    if (!privyToken) return null;
    return didFromToken(privyToken);
}
