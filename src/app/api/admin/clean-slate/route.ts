/**
 * POST /api/admin/clean-slate
 *
 * One-shot cutover for the account-based membership model (approved Aug 23,
 * 2026: "any existing data can be removed"; confirmed no live paying
 * subscribers). Truncates every account / subscription / trial / referral /
 * legacy virtual-account table and resets per-user subscription fields.
 *
 * Protected by the INTERNAL_API_SECRET bearer token (same secret the EC2
 * publishers use). Idempotent: each truncate is independent and missing
 * tables are skipped.
 */
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { initializeMembershipTables } from '@/lib/membership';

export const dynamic = 'force-dynamic';

const TRUNCATE_TABLES = [
    'account_signals',
    'account_pnl_history',
    'account_activities',
    'account_positions',
    'account_memberships',
    'accounts',
    'referral_activity',
    'referral_events',
    'referrals',
    'user_credits',
    'trial_conversions',
    'virtual_transactions',
    'shadow_positions',
    'virtual_accounts',
    'user_positions',
];

export async function POST(req: NextRequest) {
    const auth = req.headers.get('authorization') || '';
    const bearer = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
    const secret = process.env.INTERNAL_API_SECRET;
    if (!secret || bearer !== secret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Ensure the new membership schema exists before truncating, so a fresh
    // production database is migrated and reset in one call.
    await initializeMembershipTables();

    const truncated: string[] = [];
    const skipped: string[] = [];
    for (const table of TRUNCATE_TABLES) {
        try {
            await pool.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`);
            truncated.push(table);
        } catch (err) {
            skipped.push(`${table}: ${err instanceof Error ? err.message : String(err)}`);
        }
    }

    // Reset per-user subscription state; keep identity columns (names,
    // referral codes, login emails) intact.
    let settingsReset = 0;
    try {
        const r = await pool.query(
            `UPDATE user_settings SET
                subscription_tier = 'observer',
                stripe_subscription_id = NULL,
                referral_reward_account_id = NULL,
                updated_at = NOW()`
        );
        settingsReset = r.rowCount ?? 0;
    } catch (err) {
        skipped.push(`user_settings reset: ${err instanceof Error ? err.message : String(err)}`);
    }

    console.log(`[CleanSlate] truncated=${truncated.length} skipped=${skipped.length} settingsReset=${settingsReset}`);
    return NextResponse.json({ truncated, settingsReset, skipped });
}
