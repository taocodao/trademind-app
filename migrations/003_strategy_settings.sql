-- Strategy Settings Table Migration
-- Run this on AWS RDS PostgreSQL

CREATE TABLE IF NOT EXISTS strategy_settings (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(128) NOT NULL UNIQUE,
    
    -- Global Settings
    global_risk_level VARCHAR(20) DEFAULT 'smart',
    confidence INTEGER DEFAULT 75,
    trailing_stop DECIMAL(5,2) DEFAULT -0.45,
    max_heat DECIMAL(5,2) DEFAULT 0.15,
    
    -- Theta Sprint Settings
    theta_enabled BOOLEAN DEFAULT TRUE,
    theta_capital DECIMAL(12,2) DEFAULT 0,
    theta_dte_min INTEGER DEFAULT 21,
    theta_dte_max INTEGER DEFAULT 45,
    theta_delta DECIMAL(4,2) DEFAULT 0.20,
    theta_trades_week INTEGER DEFAULT 3,
    
    -- Calendar Spread Settings
    calendar_enabled BOOLEAN DEFAULT TRUE,
    calendar_capital DECIMAL(12,2) DEFAULT 0,
    calendar_dte_min INTEGER DEFAULT 5,
    calendar_dte_max INTEGER DEFAULT 14,
    calendar_trades_week INTEGER DEFAULT 5,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_strategy_settings_user ON strategy_settings(user_id);

-- Add applied_filters to positions table for tracking
ALTER TABLE positions 
ADD COLUMN IF NOT EXISTS applied_filters JSONB DEFAULT NULL;

COMMENT ON TABLE strategy_settings IS 'User-specific trading strategy configurations';
COMMENT ON COLUMN strategy_settings.global_risk_level IS 'Risk preset: safe, smart, or bold';
COMMENT ON COLUMN strategy_settings.trailing_stop IS 'Trailing stop loss percentage (negative)';
COMMENT ON COLUMN strategy_settings.max_heat IS 'Maximum portfolio heat percentage';
COMMENT ON COLUMN positions.applied_filters IS 'Snapshot of filters used when position was opened';
