import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { query } from '@/lib/db';

const VALID_FEATURES = ['screenshot', 'deepdive', 'briefing', 'strategy', 'debrief', 'chat'];

export async function getUserFromRequest(req: NextRequest) {
  const cookieStore = await cookies();
  const privyToken = cookieStore.get('privy-token')?.value;
  if (!privyToken) throw new Error('Unauthorized');
  
  const payload = privyToken.split('.')[1];
  const decoded = JSON.parse(Buffer.from(payload, 'base64').toString());
  const privyDid = decoded.sub || decoded.privy_did;
  
  if (!privyDid) throw new Error('Unauthorized');

  const result = await query(
    `SELECT * FROM user_settings WHERE user_id = $1`,
    [privyDid]
  );
  
  if (!result.rows.length) {
    throw new Error('User settings not found');
  }

  return {
    privyDid,
    tier: result.rows[0].subscription_tier || 'observer',
  };
}

/**
 * Check if a user has access to a specific AI feature.
 * - `chat` is always allowed for non-observer tiers
 * - Other features require an active row in ai_feature_subscriptions
 */
export async function checkFeatureAccess(privyDid: string, featureKey: string): Promise<{ allowed: boolean }> {
    if (!VALID_FEATURES.includes(featureKey)) return { allowed: false };
    
    // Free Chat is always included for paid tiers
    if (featureKey === 'chat') {
        const user = await query(`SELECT subscription_tier FROM user_settings WHERE user_id = $1`, [privyDid]);
        return { allowed: (user.rows[0]?.subscription_tier || 'observer') !== 'observer' };
    }
    
    const result = await query(
        `SELECT id FROM ai_feature_subscriptions WHERE user_id = $1 AND feature_key = $2 AND status = 'active'`,
        [privyDid, featureKey]
    );
    return { allowed: result.rows.length > 0 };
}
