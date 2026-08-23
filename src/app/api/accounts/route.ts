import { NextRequest, NextResponse } from 'next/server';
import { createAccount, listAccounts, type RiskLevel } from '@/lib/accounts';
import { getStrategy } from '@/lib/strategies';
import { getUserId } from '@/lib/auth';
import pool from '@/lib/db';
import {
    createMembershipForAccount,
    listMembershipsForUser,
    initializeMembershipTables,
} from '@/lib/membership';

// GET /api/accounts — list the user's named accounts, each with its membership
export async function GET() {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
        const [accounts, memberships] = await Promise.all([
            listAccounts(userId),
            listMembershipsForUser(userId),
        ]);
        const byAccount = new Map(memberships.map((m) => [m.account_id, m]));
        return NextResponse.json({
            accounts: accounts.map((a) => ({ ...a, membership: byAccount.get(a.id) ?? null })),
        });
    } catch (err) {
        console.error('[accounts] list failed:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST /api/accounts — create a named account plus its membership.
// Non-referred signups get a 30-day free month per account; referred signups
// (unattached referral attribution exists) start as awaiting_payment — the
// referee bonus is paid in days at first payment instead.
export async function POST(req: NextRequest) {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
        const body = await req.json();
        const { name, strategy, riskLevel, initialPrincipal, alertEmail } = body;

        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return NextResponse.json({ error: 'Account name is required' }, { status: 400 });
        }
        if (!strategy || !getStrategy(strategy)) {
            return NextResponse.json({ error: 'A valid strategy is required' }, { status: 400 });
        }
        const risk: RiskLevel = ['conservative', 'moderate', 'aggressive'].includes(riskLevel) ? riskLevel : 'moderate';
        const principal = Number(initialPrincipal);
        if (!isFinite(principal) || principal < 0) {
            return NextResponse.json({ error: 'Initial principal must be a non-negative number' }, { status: 400 });
        }
        const alert = typeof alertEmail === 'string' && alertEmail.includes('@') ? alertEmail.trim() : null;

        await initializeMembershipTables();

        // Referral attribution: an unattached referral_events row means this
        // signup came through a referral link. The FIRST account they create
        // is the referred account (no free month); later accounts are normal.
        const ref = await pool.query(
            `SELECT id FROM referral_events
             WHERE referred_id = $1 AND referred_account_id IS NULL
             ORDER BY converted_at ASC LIMIT 1`,
            [userId]
        );
        const referralEventId: string | null = ref.rows[0]?.id ?? null;

        // Default the alert email to the login email recorded at auth time.
        let defaultAlert = alert;
        if (!defaultAlert) {
            const us = await pool.query(
                `SELECT COALESCE(login_email, email) AS e FROM user_settings WHERE user_id = $1`,
                [userId]
            );
            defaultAlert = us.rows[0]?.e ?? null;
        }

        let account;
        try {
            account = await createAccount(userId, name, strategy, risk, principal, defaultAlert);
        } catch (err) {
            // UNIQUE(user_id, name) violation
            if (err instanceof Error && err.message.includes('accounts_user_name_uidx')) {
                return NextResponse.json({ error: 'You already have an account with that name' }, { status: 409 });
            }
            throw err;
        }

        const membership = await createMembershipForAccount({
            accountId: account.id,
            userId,
            strategy: account.strategy,
            referredSignup: !!referralEventId,
            referralEventId,
        });

        if (referralEventId) {
            await pool.query(
                `UPDATE referral_events SET referred_account_id = $2 WHERE id = $1`,
                [referralEventId, account.id]
            );
        }

        return NextResponse.json({ account, membership }, { status: 201 });
    } catch (err) {
        console.error('[accounts] create failed:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
