import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: 'postgresql://erichuang2005:Ya2039349@travelwise-marketplace-db.curmg864eafo.us-east-1.rds.amazonaws.com:5432/ib_trading',
  ssl: { rejectUnauthorized: false },
});

async function migrate() {
  try {
    console.log('Phase 2 migration starting...');

    // 1. Add new columns to user_settings
    await pool.query(`
        ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS free_features_selected INTEGER DEFAULT 0;
        ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS free_features_limit INTEGER DEFAULT 0;
    `);

    // 2. Set free_features_limit based on existing tiers
    await pool.query(`
        UPDATE user_settings SET free_features_limit = CASE
            WHEN subscription_tier = 'turbocore' THEN 1
            WHEN subscription_tier = 'turbocore_pro' THEN 1
            WHEN subscription_tier = 'both_bundle' THEN 2
            ELSE 0
        END
        WHERE free_features_limit = 0;
    `);

    // 3. Create ai_feature_subscriptions table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS ai_feature_subscriptions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id VARCHAR(128) NOT NULL,
            feature_key VARCHAR(32) NOT NULL,
            is_free_entitlement BOOLEAN DEFAULT false,
            stripe_subscription_item_id VARCHAR(128),
            status VARCHAR(20) DEFAULT 'active',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(user_id, feature_key)
        )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_ai_feature_subs_user ON ai_feature_subscriptions(user_id)`);

    // 4. Create referral_activity table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS referral_activity (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            referral_id INTEGER REFERENCES referrals(id),
            event_type VARCHAR(32) NOT NULL,
            credit_amount NUMERIC(10,2) DEFAULT 0,
            description TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_referral_activity_referral ON referral_activity(referral_id)`);

    console.log('Phase 2 migration completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await pool.end();
  }
}
migrate();
