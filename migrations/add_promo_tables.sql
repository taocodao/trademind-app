-- ============================================================
-- TradeMind Ambassador Hub: Promo Post Generator Tables
-- Migration: add_promo_tables.sql
-- Run: psql $DATABASE_URL -f migrations/add_promo_tables.sql
-- ============================================================

-- Track all AI-generated posts
CREATE TABLE IF NOT EXISTS generated_posts (
  id               SERIAL PRIMARY KEY,
  user_id          TEXT REFERENCES usersettings(userid) ON DELETE SET NULL,
  platform         TEXT NOT NULL,
  theme            TEXT NOT NULL,
  tone             TEXT NOT NULL,
  variation_index  INT NOT NULL DEFAULT 0,
  post_content     TEXT NOT NULL,
  referral_code    TEXT,
  char_count       INT,
  saved_to_library BOOLEAN NOT NULL DEFAULT FALSE,
  compliance_verified BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User's curated post library (saved subset of generated_posts)
CREATE TABLE IF NOT EXISTS post_library (
  id                  SERIAL PRIMARY KEY,
  user_id             TEXT REFERENCES usersettings(userid) ON DELETE CASCADE,
  generated_post_id   INT REFERENCES generated_posts(id) ON DELETE SET NULL,
  platform            TEXT NOT NULL,
  post_content        TEXT NOT NULL,
  label               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_generated_posts_user      ON generated_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_posts_platform  ON generated_posts(platform);
CREATE INDEX IF NOT EXISTS idx_generated_posts_created   ON generated_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_library_user         ON post_library(user_id);
CREATE INDEX IF NOT EXISTS idx_post_library_platform     ON post_library(platform);
