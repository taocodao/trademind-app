/**
 * Migration Token System
 * ======================
 * Generates and validates JWT magic links for frictionless
 * Whop-trial → trademind.bot migration at Day 30.
 *
 * Flow:
 *   1. Trial ends → webhook calls generateMigrationToken()
 *   2. Token stored in migration_tokens table (7-day TTL)
 *   3. Link sent via Whop DM + Resend email
 *   4. User clicks link → /api/auth/migrate validates token,
 *      creates session, redirects to /upgrade?from=trial&ref=whop
 */

import jwt from 'jsonwebtoken';
import { query } from '@/lib/db';

const JWT_SECRET = process.env.TRADEMIND_MAGIC_LINK_SECRET ?? '';
const TOKEN_TTL_DAYS = 7;

export interface MigrationPayload {
    email:        string;
    whop_user_id: string;
    trial_id:     string;
    purpose:      'trial_migration';
    iat?:         number;
    exp?:         number;
}

/**
 * Generate a signed JWT magic link token and persist it to the DB.
 * Returns the raw token string (embed in URL).
 */
export async function generateMigrationToken(params: {
    email:        string;
    whop_user_id: string;
    trial_id:     string;
}): Promise<string> {
    if (!JWT_SECRET) {
        throw new Error('[Migration] TRADEMIND_MAGIC_LINK_SECRET is not set');
    }

    const payload: Omit<MigrationPayload, 'iat' | 'exp'> = {
        email:        params.email,
        whop_user_id: params.whop_user_id,
        trial_id:     params.trial_id,
        purpose:      'trial_migration',
    };

    const token = jwt.sign(payload, JWT_SECRET, {
        expiresIn: `${TOKEN_TTL_DAYS}d`,
    });

    const expiresAt = new Date(Date.now() + TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

    await query(
        `INSERT INTO migration_tokens (token, user_email, whop_user_id, expires_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (token) DO NOTHING`,
        [token, params.email, params.whop_user_id, expiresAt.toISOString()]
    );

    return token;
}

/**
 * Validate a magic link token.
 * Returns the payload if valid and unused, null otherwise.
 */
export async function validateMigrationToken(token: string): Promise<MigrationPayload | null> {
    if (!JWT_SECRET) return null;

    // 1. Verify JWT signature + expiry
    let payload: MigrationPayload;
    try {
        payload = jwt.verify(token, JWT_SECRET) as MigrationPayload;
    } catch {
        return null;
    }

    if (payload.purpose !== 'trial_migration') return null;

    // 2. Check DB — token must exist and be unused
    const result = await query(
        `SELECT id, used FROM migration_tokens WHERE token = $1 AND expires_at > NOW()`,
        [token]
    );
    if (!result.rows.length || result.rows[0].used) return null;

    return payload;
}

/**
 * Mark a token as used (call after successful session creation).
 */
export async function consumeMigrationToken(token: string): Promise<void> {
    await query(
        `UPDATE migration_tokens SET used = TRUE, used_at = NOW() WHERE token = $1`,
        [token]
    );
}
