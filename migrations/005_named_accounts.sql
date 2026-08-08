-- Migration 005: Named Virtual Accounts (account-centric ledger)
-- ==============================================================
-- Each user creates named virtual accounts; every account binds to ONE
-- strategy + risk level with its own cash, positions, and activity ledger.
-- ADDITIVE: legacy strategy-keyed tables are untouched.

BEGIN;

-- Named accounts
CREATE TABLE IF NOT EXISTS accounts (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(128) NOT NULL,
    name VARCHAR(128) NOT NULL,
    strategy VARCHAR(64) NOT NULL,
    risk_level VARCHAR(20) NOT NULL DEFAULT 'moderate',
    initial_principal DECIMAL(15, 2) NOT NULL DEFAULT 0,
    cash_balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_account_risk_level CHECK (risk_level IN ('conservative', 'moderate', 'aggressive'))
);
CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_strategy ON accounts(strategy);

-- Current holdings per account
CREATE TABLE IF NOT EXISTS account_positions (
    id SERIAL PRIMARY KEY,
    account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    symbol VARCHAR(64) NOT NULL,
    quantity DECIMAL(15, 6) NOT NULL DEFAULT 0,
    avg_price DECIMAL(15, 4) NOT NULL DEFAULT 0,
    instrument_type VARCHAR(20) NOT NULL DEFAULT 'equity',
    signal_id VARCHAR(128),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(account_id, symbol)
);
CREATE INDEX IF NOT EXISTS idx_account_positions_account ON account_positions(account_id);

-- Full activity ledger (trades + cash), source = signal | manual
CREATE TABLE IF NOT EXISTS account_activities (
    id SERIAL PRIMARY KEY,
    account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL,
    symbol VARCHAR(64),
    quantity DECIMAL(15, 6),
    price DECIMAL(15, 4),
    amount DECIMAL(15, 2) NOT NULL,
    signal_id VARCHAR(128),
    source VARCHAR(20) NOT NULL DEFAULT 'manual',
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_activity_type CHECK (type IN ('buy', 'sell', 'deposit', 'withdraw')),
    CONSTRAINT valid_activity_source CHECK (source IN ('signal', 'manual'))
);
CREATE INDEX IF NOT EXISTS idx_account_activities_account ON account_activities(account_id);
CREATE INDEX IF NOT EXISTS idx_account_activities_created ON account_activities(created_at);

-- Daily NLV snapshots per account
CREATE TABLE IF NOT EXISTS account_pnl_history (
    id SERIAL PRIMARY KEY,
    account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL,
    cash_balance DECIMAL(15, 2) NOT NULL,
    positions_value DECIMAL(15, 2) NOT NULL DEFAULT 0,
    nlv DECIMAL(15, 2) NOT NULL,
    initial_principal DECIMAL(15, 2),
    cumulative_pnl DECIMAL(15, 2),
    cumulative_pnl_pct DECIMAL(10, 6),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(account_id, snapshot_date)
);
CREATE INDEX IF NOT EXISTS idx_account_pnl_history_account ON account_pnl_history(account_id);

-- (account, signal) idempotency records
CREATE TABLE IF NOT EXISTS account_signals (
    id SERIAL PRIMARY KEY,
    account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    signal_id VARCHAR(128) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'executed',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(account_id, signal_id)
);
CREATE INDEX IF NOT EXISTS idx_account_signals_account ON account_signals(account_id);

COMMIT;
