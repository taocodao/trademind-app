import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

export interface PromoSession {
  userId: string;
  email?: string;
}

/**
 * Extracts the Privy session from the request.
 * Privy sets a `privy-token` cookie after login.
 * On the server we verify it via Privy's verification endpoint.
 */
export async function getServerSession(req: NextRequest): Promise<PromoSession | null> {
  try {
    const cookieStore = await cookies();
    const privyToken = cookieStore.get('privy-token')?.value;

    if (!privyToken) return null;

    // Verify with Privy
    const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
    const privySecret = process.env.PRIVY_APP_SECRET;

    if (!privyAppId || !privySecret) return null;

    const verifyRes = await fetch(`https://auth.privy.io/api/v1/users/me`, {
      headers: {
        Authorization: `Bearer ${privyToken}`,
        'privy-app-id': privyAppId,
      },
    });

    if (!verifyRes.ok) return null;

    const user = await verifyRes.json();
    return {
      userId: user.id,
      email: user.email?.address,
    };
  } catch {
    return null;
  }
}
