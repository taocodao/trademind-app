-- Per-strategy auto-approve columns
-- Run this against your Neon/Postgres database via Vercel or psql
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS turbocore_auto_approve     BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS turbocore_pro_auto_approve BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS leaps_auto_approve         BOOLEAN DEFAULT FALSE;
