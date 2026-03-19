import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
const TIER_LIMITS = {
  observer: 10,
  core: 50,
  pro: 400,
  bundle: 1500
};

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

export async function checkAIBudget(privyDid: string, cost: number) {
  const result = await query(
    `SELECT ai_messages_used, ai_messages_limit, ai_bonus_messages, ai_reset_date,
            subscription_tier
     FROM user_settings
     WHERE user_id = $1`,
    [privyDid]
  );

  const row = result.rows[0];
  if (!row) throw new Error('User not found');

  const today = new Date();
  const resetDate = new Date(row.ai_reset_date);
  
  // Reset monthly budget if new month
  if (today.getMonth() !== resetDate.getMonth() || today.getFullYear() !== resetDate.getFullYear()) {
    await query(
      `UPDATE user_settings SET ai_messages_used = 0, ai_reset_date = date_trunc('month', NOW())
       WHERE user_id = $1`,
      [privyDid]
    );
    row.ai_messages_used = 0;
  }

  const baseLimit = TIER_LIMITS[row.subscription_tier as keyof typeof TIER_LIMITS] ?? 50;
  const totalLimit = baseLimit + (row.ai_bonus_messages || 0);
  const remaining = totalLimit - (row.ai_messages_used || 0);

  return {
    allowed: remaining >= cost,
    used: row.ai_messages_used || 0,
    limit: totalLimit,
    remaining,
    tier: row.subscription_tier
  };
}

export async function consumeMessages(
  privyDid: string,
  cost: number,
  featureType: string,
  usage?: { prompt_tokens: number; completion_tokens: number },
  sessionId?: string
) {
  await Promise.all([
    query(
      `UPDATE user_settings SET ai_messages_used = COALESCE(ai_messages_used, 0) + $1 WHERE user_id = $2`,
      [cost, privyDid]
    ),
    query(
      `INSERT INTO ai_message_transactions (privy_did, feature_type, messages_used, tokens_in, tokens_out, session_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [privyDid, featureType, cost, usage?.prompt_tokens, usage?.completion_tokens, sessionId]
    )
  ]);
}
