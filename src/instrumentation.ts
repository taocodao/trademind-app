/**
 * Next.js Instrumentation Hook
 * Runs once on server startup. Handles idempotent DB migrations.
 *
 * All migrations are idempotent (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).
 * Safe to run on every cold start — skips silently if already applied.
 */
export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        try {
            const { query } = await import('@/lib/db');

            // ── Migration 1: preferred_language ──────────────────────────────
            await query(
                `ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(5) DEFAULT 'en'`
            );

            // ── Migration 2: bilateral referral model ─────────────────────────
            await query(
                `ALTER TABLE referrals ADD COLUMN IF NOT EXISTS signup_bonus_paid BOOLEAN DEFAULT FALSE`
            );

            // ── Migration 3: Whop identity columns (split to avoid PG multi-ALTER errors) ──
            await query(`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS whop_user_id   TEXT`);
            await query(`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS whop_plan_id   TEXT`);
            await query(`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS billing_source VARCHAR(20) DEFAULT 'stripe'`);
            await query(`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS auth_provider  VARCHAR(20) DEFAULT 'privy'`);
            await query(`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS referral_code  VARCHAR(30)`);
            await query(`CREATE INDEX IF NOT EXISTS idx_user_settings_whop_user ON user_settings(whop_user_id)`);

            // ── Migration 4: whop_trials ──────────────────────────────────────
            await query(`
                CREATE TABLE IF NOT EXISTS whop_trials (
                    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    whop_user_id       TEXT NOT NULL,
                    whop_member_id     TEXT,
                    whop_membership_id TEXT,
                    email              TEXT NOT NULL,
                    name               TEXT,
                    trial_started_at   TIMESTAMPTZ DEFAULT NOW(),
                    trial_ends_at      TIMESTAMPTZ NOT NULL,
                    warning_sent_at    TIMESTAMPTZ,
                    migration_sent_at  TIMESTAMPTZ,
                    migrated           BOOLEAN DEFAULT FALSE,
                    migrated_at        TIMESTAMPTZ,
                    migrated_tier      TEXT,
                    UNIQUE(whop_user_id)
                )
            `);
            await query(`CREATE INDEX IF NOT EXISTS idx_whop_trials_email ON whop_trials(email)`);

            // ── Migration 5: migration_tokens ─────────────────────────────────
            await query(`
                CREATE TABLE IF NOT EXISTS migration_tokens (
                    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    token        TEXT NOT NULL UNIQUE,
                    user_email   TEXT NOT NULL,
                    whop_user_id TEXT,
                    expires_at   TIMESTAMPTZ NOT NULL,
                    used         BOOLEAN DEFAULT FALSE,
                    used_at      TIMESTAMPTZ,
                    created_at   TIMESTAMPTZ DEFAULT NOW()
                )
            `);

            // ── Migration 6: whop_events (audit log) ──────────────────────────
            await query(`
                CREATE TABLE IF NOT EXISTS whop_events (
                    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    event_type TEXT NOT NULL,
                    user_id    TEXT,
                    metadata   JSONB,
                    created_at TIMESTAMPTZ DEFAULT NOW()
                )
            `);
            await query(`CREATE INDEX IF NOT EXISTS idx_whop_events_user ON whop_events(user_id)`);

            // ── Migration 7: whop_posts (signal bridge idempotency) ───────────
            await query(`
                CREATE TABLE IF NOT EXISTS whop_posts (
                    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    post_type   TEXT NOT NULL,
                    channel_id  TEXT,
                    content     TEXT,
                    signal_date DATE,
                    regime      TEXT,
                    confidence  INTEGER,
                    created_at  TIMESTAMPTZ DEFAULT NOW(),
                    UNIQUE(post_type, signal_date)
                )
            `);

            // ── Migration 8: scheduled_messages (winback queue) ───────────────
            await query(`
                CREATE TABLE IF NOT EXISTS scheduled_messages (
                    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    user_id      TEXT NOT NULL,
                    message_type TEXT NOT NULL,
                    tier         TEXT,
                    content      TEXT,
                    send_at      TIMESTAMPTZ NOT NULL,
                    sent         BOOLEAN DEFAULT FALSE,
                    sent_at      TIMESTAMPTZ,
                    created_at   TIMESTAMPTZ DEFAULT NOW()
                )
            `);
            await query(`CREATE INDEX IF NOT EXISTS idx_scheduled_messages_pending ON scheduled_messages(send_at) WHERE sent = FALSE`);

            // ── Migration 9: trial_conversions (Whop → Stripe tracking) ───────
            await query(`
                CREATE TABLE IF NOT EXISTS trial_conversions (
                    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    user_id          TEXT NOT NULL,
                    trial_source     TEXT DEFAULT 'whop',
                    trial_started_at TIMESTAMPTZ DEFAULT NOW(),
                    trial_ended_at   TIMESTAMPTZ,
                    converted        BOOLEAN DEFAULT FALSE,
                    converted_plan   TEXT,
                    converted_at     TIMESTAMPTZ,
                    promo_code_used  TEXT,
                    UNIQUE(user_id)
                )
            `);


            // ── Migration 10: whop_posts return enrichment columns ────────────
            // Populated by EC2 scripts/populate_signal_returns.py after market close
            await query(`ALTER TABLE whop_posts ADD COLUMN IF NOT EXISTS qqq_return_5d         NUMERIC(6,2)`);
            await query(`ALTER TABLE whop_posts ADD COLUMN IF NOT EXISTS qqq_price_signal_date NUMERIC(10,2)`);
            await query(`ALTER TABLE whop_posts ADD COLUMN IF NOT EXISTS qqq_price_5d_later    NUMERIC(10,2)`);
            await query(`ALTER TABLE whop_posts ADD COLUMN IF NOT EXISTS return_populated_at   TIMESTAMPTZ`);

            console.log('[instrumentation] DB migrations complete');

        } catch (e: any) {
            console.warn('[instrumentation] Migration skipped:', e.message);
        }
    }
}

