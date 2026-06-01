import { NextRequest } from 'next/server';
import { getPrivyUserId } from '@/lib/auth-helpers';

export interface PromoSession {
  userId: string;
}

/**
 * Extracts the Privy user ID for promo API routes.
 * Delegates to the existing app-wide auth helper (decodes JWT locally,
 * checks privy-user-id cookie, then privy-token, then Bearer header).
 */
export async function getServerSession(req: NextRequest): Promise<PromoSession | null> {
  const userId = await getPrivyUserId(req);
  if (!userId) return null;
  return { userId };
}
