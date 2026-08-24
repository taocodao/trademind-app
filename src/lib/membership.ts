/**
 * Account Memberships
 * ===================
 * Membership is PER ACCOUNT, not per login. One login can hold multiple
 * accounts in any strategy combination (including two accounts on the same
 * strategy); each account has its own membership and its own Stripe
 * subscription.
 *
 * Lifecycle:
 *   free_month        — 30-day free month from account creation (all signups,
 *                       referred or not). Entitled until free_month_ends_at.
 *   awaiting_payment  — legacy status (referred signups used to skip the free
 *                       month); no longer assigned, kept for existing rows.
 *   active            — Stripe subscription paid and current.
 *   past_due          — renewal payment failed; still entitled (grace).
 *   canceled          — canceled; entitled until current_period_end, then
 *                       flipped to expired by the free-month/lifecycle cron.
 *   expired           — not entitled. Signals stop; P&L stays readable.
 *
 * Day math: bonus days = floor(dollars x 30 / effectiveMonthly), where
 * effectiveMonthly is annual / 12 ($21 Basic, $28 LEAPS). $100 -> 142 days
 * on Basic / 107 on LEAPS; $50 -> 71 / 53.
 */

import { query } from '@/lib/db';
import { PRICING, type PlanKey } from '@/lib/pricing-config';
import type { Account } from '@/lib/accounts';

// ─── Types ───────────────────────────────────────────────────────────────────

export type MembershipPlan = 'basic' | 'leaps';
export type MembershipStatus =
    | 'free_month'
    | 'awaiting_payment'
    | 'active'
    | 'past_due'
    | 'canceled'
    | 'expired';

export interface AccountMembership {
    id: number;
    account_id: number;
    user_id: string;
    plan: MembershipPlan;
    status: MembershipStatus;
    free_month_ends_at: string | null;
    stripe_subscription_id: string | null;
    stripe_schedule_id: string | null;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
    referred_signup: boolean;
    referral_event_id: string | null;
    pending_bonus_days: number;
    created_at: string;
    updated_at: string;
}

/** Membership joined with its account (for list views). */
export interface MembershipWithAccount extends AccountMembership {
    account_name: string;
    account_strategy: string;
}

export const FREE_MONTH_DAYS = 30;

// ─── Plan mapping ────────────────────────────────────────────────────────────

/** DB strategy key -> membership plan. */
export function planForStrategy(strategy: string): MembershipPlan {
    return strategy.toUpperCase() === 'QQQ_LEAPS' ? 'leaps' : 'basic';
}

/** Membership plan -> pricing-config plan key. */
export function priceKeyForPlan(plan: MembershipPlan): PlanKey {
    return plan === 'leaps' ? 'qqq_leaps' : 'turbocore_pro_bundle';
}

/** Effective monthly rate (annual / 12) for a membership plan. */
export function effectiveMonthlyForPlan(plan: MembershipPlan): number {
    return PRICING.plans[priceKeyForPlan(plan)].annualPerMonth;
}

/**
 * Convert dollars of referral reward into subscription days at a plan's
 * effective monthly rate: floor(dollars x 30 / effectiveMonthly).
 */
export function daysForDollars(dollars: number, plan: MembershipPlan): number {
    const eff = effectiveMonthlyForPlan(plan);
    if (dollars <= 0 || eff <= 0) return 0;
    return Math.floor((dollars * 30) / eff);
}

// ─── Table init (runtime, idempotent — mirrors migrations/007) ──────────────

let _initPromise: Promise<void> | null = null;

export function initializeMembershipTables(): Promise<void> {
    if (!_initPromise) {
        _initPromise = (async () => {
            await query(`
                CREATE TABLE IF NOT EXISTS account_memberships (
                    id                          SERIAL PRIMARY KEY,
                    account_id                  INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
                    user_id                     VARCHAR(128) NOT NULL,
                    plan                        VARCHAR(20) NOT NULL CHECK (plan IN ('basic', 'leaps')),
                    status                      VARCHAR(20) NOT NULL DEFAULT 'free_month'
                                                CHECK (status IN ('free_month', 'awaiting_payment', 'active', 'past_due', 'canceled', 'expired')),
                    free_month_ends_at          TIMESTAMPTZ,
                    stripe_subscription_id      VARCHAR(128),
                    stripe_schedule_id          VARCHAR(128),
                    current_period_end          TIMESTAMPTZ,
                    cancel_at_period_end        BOOLEAN NOT NULL DEFAULT FALSE,
                    referred_signup             BOOLEAN NOT NULL DEFAULT FALSE,
                    referral_event_id           UUID,
                    pending_bonus_days          INTEGER NOT NULL DEFAULT 0,
                    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    UNIQUE(account_id)
                )
            `);
            await query(`CREATE INDEX IF NOT EXISTS idx_account_memberships_user ON account_memberships(user_id)`);
            await query(`CREATE INDEX IF NOT EXISTS idx_account_memberships_status ON account_memberships(status)`);
            await query(`CREATE INDEX IF NOT EXISTS idx_account_memberships_free_month_end ON account_memberships(free_month_ends_at) WHERE status = 'free_month'`);
            await query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_account_memberships_sub ON account_memberships(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL`);

            // accounts additions
            await query(`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS alert_email TEXT`).catch(() => {});
            await query(`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active'`).catch(() => {});
            // One account name per login. Fails harmlessly on a dirty database
            // (pre-clean-slate duplicates) and succeeds on the next boot.
            await query(`CREATE UNIQUE INDEX IF NOT EXISTS accounts_user_name_uidx ON accounts(user_id, name)`).catch(() => {});

            // user_settings additions
            await query(`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS login_email TEXT`).catch(() => {});
            await query(`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS referral_reward_account_id INTEGER`).catch(() => {});

            // referral_events additions (day-grant program)
            for (const stmt of [
                `ALTER TABLE referral_events ADD COLUMN IF NOT EXISTS referrer_reward_account_id INTEGER`,
                `ALTER TABLE referral_events ADD COLUMN IF NOT EXISTS referred_account_id INTEGER`,
                `ALTER TABLE referral_events ADD COLUMN IF NOT EXISTS referrer_days INTEGER`,
                `ALTER TABLE referral_events ADD COLUMN IF NOT EXISTS referred_days INTEGER`,
                `ALTER TABLE referral_events ADD COLUMN IF NOT EXISTS referred_plan VARCHAR(50)`,
                `ALTER TABLE referral_events ADD COLUMN IF NOT EXISTS referrer_applied_at TIMESTAMPTZ`,
                `ALTER TABLE referral_events ADD COLUMN IF NOT EXISTS referred_applied_at TIMESTAMPTZ`,
            ]) {
                await query(stmt).catch(() => {});
            }
        })().catch((err) => {
            _initPromise = null;
            throw err;
        });
    }
    return _initPromise;
}

// ─── Row mapping ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToMembership(row: any): AccountMembership {
    return {
        id: row.id,
        account_id: row.account_id,
        user_id: row.user_id,
        plan: row.plan,
        status: row.status,
        free_month_ends_at: row.free_month_ends_at ? new Date(row.free_month_ends_at).toISOString() : null,
        stripe_subscription_id: row.stripe_subscription_id ?? null,
        stripe_schedule_id: row.stripe_schedule_id ?? null,
        current_period_end: row.current_period_end ? new Date(row.current_period_end).toISOString() : null,
        cancel_at_period_end: !!row.cancel_at_period_end,
        referred_signup: !!row.referred_signup,
        referral_event_id: row.referral_event_id ?? null,
        pending_bonus_days: row.pending_bonus_days ?? 0,
        created_at: new Date(row.created_at).toISOString(),
        updated_at: new Date(row.updated_at).toISOString(),
    };
}

// ─── CRUD ────────────────────────────────────────────────────────────────────

/**
 * Create the membership for a freshly created account.
 * Every account starts with the 30-day free month, referred or not. For
 * referred signups the attribution (referred_signup + referral_event_id) is
 * stored here so the referee day grant and the referrer's vesting grant are
 * applied when the referee makes their first payment.
 */
export async function createMembershipForAccount(opts: {
    accountId: number;
    userId: string;
    strategy: string;
    referredSignup: boolean;
    referralEventId?: string | null;
}): Promise<AccountMembership> {
    await initializeMembershipTables();
    const plan = planForStrategy(opts.strategy);
    const status: MembershipStatus = 'free_month';
    const freeMonthEnds = new Date(Date.now() + FREE_MONTH_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const res = await query(
        `INSERT INTO account_memberships
            (account_id, user_id, plan, status, free_month_ends_at, referred_signup, referral_event_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (account_id) DO UPDATE SET updated_at = NOW()
         RETURNING *`,
        [opts.accountId, opts.userId, plan, status, freeMonthEnds, opts.referredSignup, opts.referralEventId ?? null]
    );
    return rowToMembership(res.rows[0]);
}

export async function getMembershipByAccount(accountId: number): Promise<AccountMembership | null> {
    await initializeMembershipTables();
    const res = await query(`SELECT * FROM account_memberships WHERE account_id = $1`, [accountId]);
    return res.rows[0] ? rowToMembership(res.rows[0]) : null;
}

export async function getMembershipByStripeSubscription(subscriptionId: string): Promise<AccountMembership | null> {
    await initializeMembershipTables();
    const res = await query(
        `SELECT * FROM account_memberships WHERE stripe_subscription_id = $1`,
        [subscriptionId]
    );
    return res.rows[0] ? rowToMembership(res.rows[0]) : null;
}

export async function listMembershipsForUser(userId: string): Promise<MembershipWithAccount[]> {
    await initializeMembershipTables();
    const res = await query(
        `SELECT m.*, a.name AS account_name, a.strategy AS account_strategy
         FROM account_memberships m
         JOIN accounts a ON a.id = m.account_id
         WHERE m.user_id = $1
         ORDER BY m.created_at ASC`,
        [userId]
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return res.rows.map((r: any) => ({ ...rowToMembership(r), account_name: r.account_name, account_strategy: r.account_strategy }));
}

export async function updateMembership(
    accountId: number,
    fields: Partial<Pick<AccountMembership,
        'status' | 'stripe_subscription_id' | 'stripe_schedule_id' | 'current_period_end' |
        'cancel_at_period_end' | 'pending_bonus_days' | 'free_month_ends_at'>>
): Promise<void> {
    await initializeMembershipTables();
    const sets: string[] = [];
    const vals: unknown[] = [];
    let i = 1;
    for (const [k, v] of Object.entries(fields)) {
        sets.push(`${k} = $${i++}`);
        vals.push(v);
    }
    if (sets.length === 0) return;
    sets.push(`updated_at = NOW()`);
    vals.push(accountId);
    await query(`UPDATE account_memberships SET ${sets.join(', ')} WHERE account_id = $${i}`, vals);
}

// ─── Entitlement ─────────────────────────────────────────────────────────────

/** Pure entitlement check on a membership row. */
export function isMembershipEntitled(m: Pick<AccountMembership, 'status' | 'free_month_ends_at' | 'current_period_end'>): boolean {
    const now = Date.now();
    switch (m.status) {
        case 'active':
        case 'past_due':
            return true;
        case 'free_month':
            return !!m.free_month_ends_at && new Date(m.free_month_ends_at).getTime() > now;
        case 'canceled':
            // Paid-through access: still entitled until the period end.
            return !!m.current_period_end && new Date(m.current_period_end).getTime() > now;
        default:
            return false; // awaiting_payment, expired
    }
}

export async function isAccountEntitled(accountId: number): Promise<boolean> {
    const m = await getMembershipByAccount(accountId);
    return m ? isMembershipEntitled(m) : false;
}

/**
 * All accounts subscribed to a strategy whose membership is currently
 * entitled. This is the ONLY list the signal fan-out may use.
 */
export async function listEntitledAccountsByStrategy(strategy: string): Promise<Account[]> {
    await initializeMembershipTables();
    const res = await query(
        `SELECT a.* FROM accounts a
         JOIN account_memberships m ON m.account_id = a.id
         WHERE a.strategy = $1
           AND a.status = 'active'
           AND (
                m.status IN ('active', 'past_due')
                OR (m.status = 'free_month' AND m.free_month_ends_at > NOW())
                OR (m.status = 'canceled' AND m.current_period_end > NOW())
           )
         ORDER BY a.id ASC`,
        [strategy.toUpperCase()]
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return res.rows.map((r: any) => ({
        id: r.id,
        user_id: r.user_id,
        name: r.name,
        strategy: r.strategy,
        risk_level: r.risk_level,
        initial_principal: parseFloat(r.initial_principal),
        cash_balance: parseFloat(r.cash_balance),
        broker: r.broker,
        alert_email: r.alert_email ?? null,
        status: r.status || 'active',
        created_at: r.created_at,
        updated_at: r.updated_at,
    }));
}
