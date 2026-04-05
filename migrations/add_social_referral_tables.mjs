/**
 * Migration: Composio Social Referral System
 * 
 * Creates:
 *   1. social_connections  — tracks Composio OAuth accounts per user per platform
 *   2. social_posts        — SEC/FINRA compliance audit log for all AI-generated posts
 * 
 * Also adds missing referral columns to user_settings if not already present:
 *   - referral_code, referral_tier, is_creator, hdyhau, utm_* columns
 * 
 * Usage:
 *   node migrations/add_social_referral_tables.mjs
 */

import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: 'postgresql://erichuang2005:Ya2039349@travelwise-marketplace-db.curmg864eafo.us-east-1.rds.amazonaws.com:5432/ib_trading',
  ssl: { rejectUnauthorized: false },
});

const STEPS = [
  // ── Step 1: user_settings referral columns (from the earlier referral guide) ──
  {
    name: 'Add referral_code column to user_settings',
    sql: `ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS referral_code TEXT;`,
  },
  {
    name: 'Add UNIQUE index on referral_code',
    sql: `CREATE UNIQUE INDEX IF NOT EXISTS idx_user_settings_referral_code ON user_settings(referral_code) WHERE referral_code IS NOT NULL;`,
  },
  {
    name: 'Add referral_tier column to user_settings',
    sql: `ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS referral_tier TEXT DEFAULT 'none';`,
  },
  {
    name: 'Add is_creator column to user_settings',
    sql: `ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS is_creator BOOLEAN DEFAULT false;`,
  },
  {
    name: 'Add hdyhau (how did you hear about us) column to user_settings',
    sql: `ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS hdyhau TEXT;`,
  },
  {
    name: 'Add utm_source column to user_settings',
    sql: `ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS utm_source TEXT;`,
  },
  {
    name: 'Add utm_medium column to user_settings',
    sql: `ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS utm_medium TEXT;`,
  },
  {
    name: 'Add utm_campaign column to user_settings',
    sql: `ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS utm_campaign TEXT;`,
  },
  {
    name: 'Add utm_content column to user_settings',
    sql: `ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS utm_content TEXT;`,
  },

  // ── Step 2: creator_applications table ────────────────────────────────────────
  {
    name: 'Create creator_applications table',
    sql: `
      CREATE TABLE IF NOT EXISTS creator_applications (
        id                   SERIAL PRIMARY KEY,
        user_id              TEXT UNIQUE REFERENCES user_settings(user_id) ON DELETE CASCADE,
        tiktok_handle        TEXT,
        youtube_handle       TEXT,
        instagram_handle     TEXT,
        follower_count       INT,
        content_description  TEXT,
        why_trademind        TEXT,
        status               TEXT DEFAULT 'pending',
        reviewed_at          TIMESTAMPTZ,
        reviewer_notes       TEXT,
        created_at           TIMESTAMPTZ DEFAULT NOW(),
        updated_at           TIMESTAMPTZ DEFAULT NOW()
      );
    `,
  },

  // ── Step 3: social_connections table (Composio OAuth tracking) ────────────────
  {
    name: 'Create social_connections table',
    sql: `
      CREATE TABLE IF NOT EXISTS social_connections (
        id                   SERIAL PRIMARY KEY,
        user_id              TEXT NOT NULL REFERENCES user_settings(user_id) ON DELETE CASCADE,
        platform             TEXT NOT NULL CHECK (platform IN ('linkedin','twitter','facebook','instagram','tiktok')),
        composio_account_id  TEXT,
        status               TEXT DEFAULT 'disconnected'
                             CHECK (status IN ('disconnected','initiated','active','expired')),
        connected_at         TIMESTAMPTZ,
        updated_at           TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, platform)
      );
    `,
  },
  {
    name: 'Create index on social_connections(user_id)',
    sql: `CREATE INDEX IF NOT EXISTS idx_social_connections_user_id ON social_connections(user_id);`,
  },

  // ── Step 4: social_posts table (SEC/FINRA compliance audit log) ───────────────
  {
    name: 'Create social_posts table',
    sql: `
      CREATE TABLE IF NOT EXISTS social_posts (
        id             SERIAL PRIMARY KEY,
        user_id        TEXT NOT NULL REFERENCES user_settings(user_id) ON DELETE CASCADE,
        platform       TEXT NOT NULL
                       CHECK (platform IN ('linkedin','twitter','facebook','instagram','tiktok')),
        post_content   TEXT NOT NULL,
        promo_code     TEXT NOT NULL,
        referral_link  TEXT NOT NULL,
        posted_via     TEXT NOT NULL
                       CHECK (posted_via IN ('composio','intent_url','clipboard','web_share','generated')),
        posted_at      TIMESTAMPTZ DEFAULT NOW()
      );
    `,
  },
  {
    name: 'Create index on social_posts(user_id)',
    sql: `CREATE INDEX IF NOT EXISTS idx_social_posts_user_id ON social_posts(user_id);`,
  },
  {
    name: 'Create index on social_posts(posted_at) for analytics',
    sql: `CREATE INDEX IF NOT EXISTS idx_social_posts_posted_at ON social_posts(posted_at DESC);`,
  },
];

async function migrate() {
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  TradeMind — Composio Social Referral Migration');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  const client = await pool.connect();

  let passed = 0;
  let failed = 0;

  try {
    for (const step of STEPS) {
      try {
        process.stdout.write(`  ⟳  ${step.name}...`);
        await client.query(step.sql);
        console.log(`\r  ✅ ${step.name}`);
        passed++;
      } catch (err) {
        console.log(`\r  ❌ ${step.name}`);
        console.error(`     Error: ${err.message}`);
        failed++;
        // Continue to next step — partial migrations are still useful
      }
    }
  } finally {
    client.release();
    await pool.end();
  }

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  if (failed === 0) {
    console.log('  🎉 All migrations completed successfully!');
    console.log('');
    console.log('  Next steps:');
    console.log('  1. Add Composio env vars to Vercel and .env.local');
    console.log('  2. Set up Auth Configs in dashboard.composio.dev');
    console.log('  3. Deploy — the /refer and /settings/social-connections pages are live');
  } else {
    console.log('  ⚠️  Some steps failed. Review errors above and re-run if needed.');
    console.log('     All statements use IF NOT EXISTS / IF NOT EXISTS — safe to re-run.');
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  process.exit(failed > 0 ? 1 : 0);
}

migrate();
