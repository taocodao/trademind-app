-- 007_account_memberships.sql
-- Account-based membership model (locked Aug 23, 2026).
-- Membership is per account. One login can hold multiple accounts in any
-- strategy combination; each account has its own membership and its own bill.

-- ── account_memberships ─────────────────────────────────────────────────────
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
);
CREATE INDEX IF NOT EXISTS idx_account_memberships_user ON account_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_account_memberships_status ON account_memberships(status);
CREATE INDEX IF NOT EXISTS idx_account_memberships_free_month_end ON account_memberships(free_month_ends_at) WHERE status = 'free_month';
CREATE UNIQUE INDEX IF NOT EXISTS idx_account_memberships_sub ON account_memberships(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

-- ── accounts additions ──────────────────────────────────────────────────────
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS alert_email TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active';
-- One account name per login. Created after clean-slate truncate; on a dirty
-- database this fails harmlessly and is retried on the next boot.
CREATE UNIQUE INDEX IF NOT EXISTS accounts_user_name_uidx ON accounts(user_id, name);

-- ── user_settings additions ─────────────────────────────────────────────────
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS login_email TEXT;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS referral_reward_account_id INTEGER;

-- ── referral_events additions (day-grant program) ───────────────────────────
ALTER TABLE referral_events ADD COLUMN IF NOT EXISTS referrer_reward_account_id INTEGER;
ALTER TABLE referral_events ADD COLUMN IF NOT EXISTS referred_account_id INTEGER;
ALTER TABLE referral_events ADD COLUMN IF NOT EXISTS referrer_days INTEGER;
ALTER TABLE referral_events ADD COLUMN IF NOT EXISTS referred_days INTEGER;
ALTER TABLE referral_events ADD COLUMN IF NOT EXISTS referred_plan VARCHAR(50);
ALTER TABLE referral_events ADD COLUMN IF NOT EXISTS referrer_applied_at TIMESTAMPTZ;
ALTER TABLE referral_events ADD COLUMN IF NOT EXISTS referred_applied_at TIMESTAMPTZ;
