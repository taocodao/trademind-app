import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: 'postgresql://erichuang2005:Ya2039349@travelwise-marketplace-db.curmg864eafo.us-east-1.rds.amazonaws.com:5432/ib_trading',
  ssl: { rejectUnauthorized: false },
});

async function migrate() {
  try {
    console.log('Starting AI tables migration...');

    await pool.query(`
        ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS ai_messages_used INTEGER DEFAULT 0;
        ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS ai_messages_limit INTEGER DEFAULT 10;
        ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS ai_bonus_messages INTEGER DEFAULT 0;
        ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS ai_reset_date TIMESTAMPTZ;
        ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS push_subscription JSONB;
        ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS briefing_enabled BOOLEAN DEFAULT true;
        ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS debrief_enabled BOOLEAN DEFAULT true;
    `);

    // AI COPILOT: Compliance conversation log
    await pool.query(`
        CREATE TABLE IF NOT EXISTS ai_chat_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            privy_did VARCHAR(128) NOT NULL,
            session_id UUID NOT NULL,
            feature_type VARCHAR(32) NOT NULL,
            role VARCHAR(16) NOT NULL,
            content TEXT NOT NULL,
            model_used VARCHAR(32),
            tokens_input INTEGER,
            tokens_output INTEGER,
            messages_cost INTEGER DEFAULT 1,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
    `);

    // AI COPILOT: Shared morning briefings
    await pool.query(`
        CREATE TABLE IF NOT EXISTS ai_briefings (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            date DATE UNIQUE NOT NULL,
            regime VARCHAR(16),
            confidence INTEGER,
            ml_score INTEGER,
            content JSONB NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
    `);

    // AI COPILOT: Per-user weekly debriefs
    await pool.query(`
        CREATE TABLE IF NOT EXISTS ai_debriefs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            privy_did VARCHAR(128) NOT NULL,
            week_start DATE NOT NULL,
            content JSONB NOT NULL,
            pdf_url VARCHAR(512),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(privy_did, week_start)
        )
    `);

    // AI COPILOT: Deep dive 15-min cache log
    await pool.query(`
        CREATE TABLE IF NOT EXISTS ai_deepdive_cache (
            ticker VARCHAR(16) PRIMARY KEY,
            content JSONB NOT NULL,
            expires_at TIMESTAMPTZ NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
    `);

    // AI COPILOT: Message budget transactions
    await pool.query(`
        CREATE TABLE IF NOT EXISTS ai_message_transactions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            privy_did VARCHAR(128) NOT NULL,
            feature_type VARCHAR(32) NOT NULL,
            messages_used INTEGER NOT NULL,
            tokens_in INTEGER,
            tokens_out INTEGER,
            session_id UUID,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
    `);

    console.log('AI Tables created successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await pool.end();
  }
}
migrate();
