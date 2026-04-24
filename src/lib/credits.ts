/**
 * Credit System
 * =============
 * Issues, redeems, and queries the user_credits ledger.
 * 1 credit = $0.10 = 10 cents stored as INTEGER.
 */

import { query } from '@/lib/db';

export type CreditSource = 'loyalty' | 'referral_trial' | 'referral_monthly' | 'referral_annual' | 'trial_bonus';

/** Issue credits to a user */
export async function issueCredits(
    userId: string,
    amountCents: number,
    source: CreditSource,
    expiryDays = 90
): Promise<void> {
    await query(
        `INSERT INTO user_credits (user_id, amount, source, expires_at)
         VALUES ($1, $2, $3, NOW() + ($4 || ' days')::INTERVAL)`,
        [userId, amountCents, source, expiryDays]
    );
    console.log(`[Credits] Issued ${amountCents}¢ (${source}) to ${userId}`);
}

/** Get total redeemable credit balance for a user (non-expired, non-redeemed) */
export async function getCreditBalance(userId: string): Promise<number> {
    const result = await query(
        `SELECT COALESCE(SUM(amount), 0) AS balance
         FROM user_credits
         WHERE user_id = $1
           AND redeemed_at IS NULL
           AND (expires_at IS NULL OR expires_at > NOW())`,
        [userId]
    );
    return parseInt(result.rows[0]?.balance ?? '0', 10);
}

/** Mark credits as redeemed against a Stripe invoice/session */
export async function redeemCredits(
    userId: string,
    amountCents: number,
    redeemedAgainst: string
): Promise<number> {
    // Redeem oldest-first (FIFO)
    const result = await query(
        `WITH redeemable AS (
            SELECT id, amount FROM user_credits
            WHERE user_id = $1 AND redeemed_at IS NULL
              AND (expires_at IS NULL OR expires_at > NOW())
            ORDER BY issued_at ASC
         ),
         to_redeem AS (
            SELECT id, amount,
                   SUM(amount) OVER (ORDER BY id) AS running_total
            FROM redeemable
         )
         UPDATE user_credits
         SET redeemed_at = NOW(), redeemed_against = $3
         WHERE id IN (
             SELECT id FROM to_redeem WHERE running_total <= $2
         )
         RETURNING amount`,
        [userId, amountCents, redeemedAgainst]
    );
    const totalRedeemed = result.rows.reduce((s, r) => s + parseInt(r.amount, 10), 0);
    console.log(`[Credits] Redeemed ${totalRedeemed}¢ for user ${userId} against ${redeemedAgainst}`);
    return totalRedeemed;
}

/** Get credit history for display in the account page */
export async function getCreditHistory(userId: string, limit = 20): Promise<any[]> {
    const result = await query(
        `SELECT id, amount, source, issued_at, expires_at, redeemed_at, redeemed_against
         FROM user_credits
         WHERE user_id = $1
         ORDER BY issued_at DESC
         LIMIT $2`,
        [userId, limit]
    );
    return result.rows;
}
