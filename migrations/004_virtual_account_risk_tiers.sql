-- Virtual Account Risk Tiers Migration
-- Adds per-strategy principal, per-strategy risk level, and P&L history tracking
-- Run this on AWS RDS PostgreSQL

-- ── 1. Add initial_principal to virtual_accounts ────────────────────────────
-- Tracks the starting capital the user set for each strategy's virtual account.
-- cash_balance continues to track current deployable cash; initial_principal
-- is the fixed baseline used to compute cumulative P&L vs principal.
ALTER TABLE virtual_accounts
ADD COLUMN IF NOT EXISTS initial_principal DECIMAL(15, 2) DEFAULT NULL;

COMMENT ON COLUMN virtual_accounts.initial_principal IS 'User-set starting capital for this strategy virtual account. NULL means not yet configured (legacy account).';

-- ── 2. Per-strategy risk level settings ─────────────────────────────────────
-- Replaces the global user_settings.risk_level for signal generation.
-- Each (user, strategy) pair gets its own risk tier that selects which
-- backend-computed signal variant (conservative/moderate/aggressive) to use.
CREATE TABLE IF NOT EXISTS user_strategy_settings (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(128) NOT NULL,
    strategy VARCHAR(64) NOT NULL,
    risk_level VARCHAR(20) NOT NULL DEFAULT 'moderate',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, strategy),
    CONSTRAINT valid_risk_level CHECK (risk_level IN ('conservative', 'moderate', 'aggressive'))
);

CREATE INDEX IF NOT EXISTS idx_user_strategy_settings_user ON user_strategy_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_strategy_settings_strategy ON user_strategy_settings(strategy);

COMMENT ON TABLE user_strategy_settings IS 'Per-user, per-strategy configuration. risk_level selects which backend signal tier to use.';
COMMENT ON COLUMN user_strategy_settings.risk_level IS 'Signal tier: conservative, moderate, or aggressive';

-- ── 3. Virtual P&L history ──────────────────────────────────────────────────
-- Daily snapshot of each virtual account's net liquidation value vs its
-- initial_principal, for charting and performance tracking over time.
CREATE TABLE IF NOT EXISTS virtual_pnl_history (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(128) NOT NULL,
    strategy VARCHAR(64) NOT NULL,
    snapshot_date DATE NOT NULL,
    cash_balance DECIMAL(15, 2) NOT NULL,
    positions_value DECIMAL(15, 2) NOT NULL DEFAULT 0,
    nlv DECIMAL(15, 2) NOT NULL,
    initial_principal DECIMAL(15, 2),
    cumulative_pnl DECIMAL(15, 2),
    cumulative_pnl_pct DECIMAL(10, 6),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, strategy, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_virtual_pnl_history_user ON virtual_pnl_history(user_id);
CREATE INDEX IF NOT EXISTS idx_virtual_pnl_history_strategy ON virtual_pnl_history(strategy);
CREATE INDEX IF NOT EXISTS idx_virtual_pnl_history_date ON virtual_pnl_history(snapshot_date);

COMMENT ON TABLE virtual_pnl_history IS 'Daily NLV snapshot per virtual account for P&L tracking vs initial principal';
COMMENT ON COLUMN virtual_pnl_history.nlv IS 'Net liquidation value = cash_balance + positions_value';
COMMENT ON COLUMN virtual_pnl_history.cumulative_pnl IS 'nlv - initial_principal';
COMMENT ON COLUMN virtual_pnl_history.cumulative_pnl_pct IS '(nlv - initial_principal) / initial_principal';
