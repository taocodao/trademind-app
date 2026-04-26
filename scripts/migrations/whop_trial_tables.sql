-- =============================================================
-- TradeMind Whop Trial + Automation Tables
-- Run on production PostgreSQL DB
-- =============================================================

-- ── whop_trials: Full trial lifecycle tracking ─────────────────
CREATE TABLE IF NOT EXISTS whop_trials (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  whop_user_id        VARCHAR(100) NOT NULL UNIQUE,
  whop_member_id      VARCHAR(100),
  whop_membership_id  VARCHAR(100),
  email               VARCHAR(255) NOT NULL,
  name                VARCHAR(255),
  trial_started_at    TIMESTAMPTZ NOT NULL,
  trial_ends_at       TIMESTAMPTZ NOT NULL,
  warning_sent_at     TIMESTAMPTZ,          -- Day 25 DM/email timestamp
  migration_sent_at   TIMESTAMPTZ,          -- Day 30 magic link sent timestamp
  migrated            BOOLEAN DEFAULT FALSE,
  migrated_at         TIMESTAMPTZ,
  migrated_tier       VARCHAR(20),          -- 'turbocore' | 'turbocore_pro' | 'both_bundle'
  cancelled_early     BOOLEAN DEFAULT FALSE,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whop_trials_ends_at
  ON whop_trials (trial_ends_at)
  WHERE warning_sent_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_whop_trials_deactivated
  ON whop_trials (migrated, migration_sent_at)
  WHERE migrated = FALSE;

-- ── migration_tokens: Secure one-time magic links ──────────────
CREATE TABLE IF NOT EXISTS migration_tokens (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token        VARCHAR(512) NOT NULL UNIQUE,
  user_email   VARCHAR(255) NOT NULL,
  whop_user_id VARCHAR(100) NOT NULL,
  expires_at   TIMESTAMPTZ NOT NULL,
  used         BOOLEAN DEFAULT FALSE,
  used_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_migration_tokens_lookup
  ON migration_tokens (token)
  WHERE used = FALSE;

-- ── scheduled_messages: Queued DMs for winback/nudges ──────────
CREATE TABLE IF NOT EXISTS scheduled_messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      VARCHAR(100) NOT NULL,        -- Whop user_id
  message_type VARCHAR(50)  NOT NULL,        -- 'winback' | 'nudge' | 'upgrade_prompt'
  tier         VARCHAR(20),
  content      TEXT,
  send_at      TIMESTAMPTZ NOT NULL,
  sent         BOOLEAN DEFAULT FALSE,
  sent_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_messages_pending
  ON scheduled_messages (send_at)
  WHERE sent = FALSE;

-- ── whop_events: Event log for analytics/auditing ─────────────
CREATE TABLE IF NOT EXISTS whop_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type   VARCHAR(50)  NOT NULL,
  user_id      VARCHAR(100),
  tier         VARCHAR(20),
  experience_id VARCHAR(100),
  metadata     JSONB,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whop_events_user
  ON whop_events (user_id, event_type, created_at DESC);

-- ── whop_posts: Track every announcement posted to Whop ────────
CREATE TABLE IF NOT EXISTS whop_posts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_type       VARCHAR(50) NOT NULL,  -- 'morning_brief' | 'signal' | 'weekly_debrief'
  channel_id      VARCHAR(100),
  content         TEXT,
  whop_message_id VARCHAR(100),
  signal_date     DATE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_whop_posts_signal_date
  ON whop_posts (post_type, signal_date)
  WHERE signal_date IS NOT NULL;

-- ── Verify ─────────────────────────────────────────────────────
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('whop_trials', 'migration_tokens', 'scheduled_messages', 'whop_events', 'whop_posts')
ORDER BY table_name;
