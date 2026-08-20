-- 006_vested_referrals.sql
-- Vested referral program: referrer +8 months / referee +4 months of free service,
-- credited only after the referee stays active for a vesting window (default 75 days).
--
-- Existing rows are grandfathered as 'vested' (they already paid out under the
-- old flat-credit program). New conversions are inserted as 'pending'.

ALTER TABLE referral_events ADD COLUMN IF NOT EXISTS status          VARCHAR(20) DEFAULT 'vested';
ALTER TABLE referral_events ADD COLUMN IF NOT EXISTS vests_at        TIMESTAMPTZ;
ALTER TABLE referral_events ADD COLUMN IF NOT EXISTS vested_at       TIMESTAMPTZ;
ALTER TABLE referral_events ADD COLUMN IF NOT EXISTS referrer_months INTEGER DEFAULT 0;
ALTER TABLE referral_events ADD COLUMN IF NOT EXISTS referred_months INTEGER DEFAULT 0;
ALTER TABLE referral_events ADD COLUMN IF NOT EXISTS void_reason     VARCHAR(50);

-- Partial index: the daily vesting cron only scans pending rows
CREATE INDEX IF NOT EXISTS idx_referral_events_pending
    ON referral_events (vests_at) WHERE status = 'pending';

-- Trailing-12-month compensation tracking (per-referrer review threshold)
CREATE INDEX IF NOT EXISTS idx_referral_events_referrer_vested
    ON referral_events (referrer_id, vested_at) WHERE status = 'vested';
