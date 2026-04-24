/**
 * PostgreSQL Database Client
 * Connects to AWS RDS PostgreSQL (same as EC2 backend)
 * 
 * This provides a unified database for both backend (EC2) and frontend (Vercel).
 */

import { Pool, QueryResult } from 'pg';

// Database connection pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false  // Required for AWS RDS
    },
    max: 10,           // Max pool size
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
});

// Test connection on startup
pool.on('connect', () => {
    console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
    console.error('❌ PostgreSQL pool error:', err);
});

/**
 * Execute a query with parameters
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function query(
    text: string,
    params?: unknown[]
): Promise<QueryResult<any>> {
    const start = Date.now();
    try {
        const result = await pool.query(text, params);
        const duration = Date.now() - start;
        console.log('📊 Query executed', { text: text.substring(0, 50), duration, rows: result.rowCount });
        return result;
    } catch (error) {
        console.error('❌ Query error:', { text: text.substring(0, 50), error });
        throw error;
    }
}

/**
 * Get a client from the pool for transactions
 */
export async function getClient() {
    return await pool.query('SELECT NOW()');
}

// ============================================================
// USER SETTINGS
// ============================================================

export interface UserSettings {
    user_id: string;
    risk_level: string;
    notifications_enabled: boolean;
    created_at: Date;
    updated_at: Date;
}

export async function getUserSettings(userId: string): Promise<UserSettings | null> {
    const result = await query(
        `SELECT * FROM user_settings WHERE user_id = $1`,
        [userId]
    );
    return result.rows[0] || null;
}

export async function setUserRiskLevel(userId: string, riskLevel: string): Promise<void> {
    await query(
        `INSERT INTO user_settings (user_id, risk_level, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (user_id) 
         DO UPDATE SET risk_level = $2, updated_at = NOW()`,
        [userId, riskLevel]
    );
}

// ============================================================
// USER POSITIONS
// ============================================================

export interface UserPosition {
    id: string;
    user_id: string;
    signal_id: string | null;
    symbol: string;
    strategy: string;
    strike: number;
    expiration: string;
    contracts: number;
    entry_price: number;
    capital_required: number;
    current_price: number | null;
    unrealized_pnl: number | null;
    risk_level: string;
    status: string;
    closed_at: Date | null;
    exit_pnl: number | null;
    exit_reason: string | null;
    created_at: Date;
    updated_at: Date;
}

export interface CreatePositionData {
    id: string;              // Tastytrade order ID
    userId: string;
    signalId?: string;
    symbol: string;
    strategy?: string;       // 'theta', 'calendar', etc.
    strike: number;
    expiration: string;      // For theta: put expiry. For calendar: front expiry
    backExpiry?: string;     // For calendar spreads only
    contracts: number;
    entryPrice: number;      // For theta: credit received. For calendar: debit paid
    capitalRequired: number;
    riskLevel: string;
    direction?: string;      // For calendar: 'bullish' or 'bearish'
}

export async function createPosition(data: CreatePositionData): Promise<UserPosition> {
    // Determine strategy and entry value
    const strategy = data.strategy || 'theta';
    const isCalendar = strategy.toLowerCase().includes('calendar');

    // For theta (selling puts): entry is credit (negative debit)
    // For calendar (buying spread): entry is debit (positive)
    const entryDebit = isCalendar ? data.entryPrice : -data.entryPrice;

    const result = await query(
        `INSERT INTO positions (
            id, user_id, signal_id, symbol, strategy, strike, 
            front_expiry, back_expiry, quantity, entry_debit, direction, status, created_at
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'open', NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
            updated_at = NOW()
        RETURNING *`,
        [
            data.id,
            data.userId,
            data.signalId || null,
            data.symbol,
            strategy,
            data.strike,
            data.expiration,
            data.backExpiry || null,  // Only for calendar spreads
            data.contracts,
            entryDebit,
            data.direction || null    // bullish/bearish for calendar
        ]
    );
    return result.rows[0];
}

export async function getUserPositions(
    userId: string,
    status?: string
): Promise<UserPosition[]> {
    let queryText = `SELECT * FROM positions WHERE user_id = $1`;
    const params: unknown[] = [userId];

    if (status) {
        queryText += ` AND status = $2`;
        params.push(status);
    }

    queryText += ` ORDER BY created_at DESC`;

    const result = await query(queryText, params);
    return result.rows;
}

export async function updatePositionPrice(
    positionId: string,
    currentPrice: number,
    unrealizedPnl: number
): Promise<void> {
    await query(
        `UPDATE positions 
         SET current_value = $1,
             unrealized_pnl = $2,
             last_checked = NOW(),
             updated_at = NOW()
         WHERE id = $3`,
        [currentPrice, unrealizedPnl, positionId]
    );
}

export async function closePosition(
    positionId: string,
    exitPnl: number,
    exitReason: string
): Promise<void> {
    await query(
        `UPDATE positions 
         SET status = 'closed',
             closed_at = NOW(),
             exit_pnl = $1,
             exit_reason = $2,
             updated_at = NOW()
         WHERE id = $3`,
        [exitPnl, exitReason, positionId]
    );
}

// ============================================================
// SHADOW POSITIONS
// ============================================================

export interface ShadowPosition {
    id: number;
    user_id: string;
    strategy: string;
    symbol: string;
    quantity: number;
    avg_price: number;
    signal_id: string | null;
    executed_at: Date;
}

export async function createShadowPosition(
    userId: string,
    strategy: string,
    symbol: string,
    quantity: number,
    avgPrice: number,
    signalId?: string
): Promise<ShadowPosition> {
    const result = await query(
        `INSERT INTO shadow_positions (
            user_id, strategy, symbol, quantity, avg_price, signal_id, executed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (user_id, strategy, symbol) DO UPDATE SET
            quantity = shadow_positions.quantity + $4,
            avg_price = CASE WHEN shadow_positions.quantity + $4 > 0 
                             THEN ((shadow_positions.avg_price * shadow_positions.quantity) + ($5 * $4)) / (shadow_positions.quantity + $4)
                             ELSE 0 END,
            executed_at = NOW()
        RETURNING *`,
        [userId, strategy, symbol, quantity, avgPrice, signalId || null]
    );
    return result.rows[0];
}

export async function clearShadowPositions(userId: string, strategy: string): Promise<void> {
    await query(
        `DELETE FROM shadow_positions WHERE user_id = $1 AND strategy = $2`,
        [userId, strategy]
    );
}

export async function getShadowPositions(userId: string, strategy?: string): Promise<ShadowPosition[]> {
    let queryText = `SELECT * FROM shadow_positions WHERE user_id = $1`;
    const params: unknown[] = [userId];

    if (strategy) {
        queryText += ` AND strategy = $2`;
        params.push(strategy);
    }

    queryText += ` ORDER BY symbol ASC`;

    const result = await query(queryText, params);
    return result.rows;
}

// ============================================================
// VIRTUAL ACCOUNTS & TRANSACTIONS
// ============================================================

export interface VirtualAccount {
    id: number;
    user_id: string;
    strategy: string;
    cash_balance: number;
    created_at: Date;
    updated_at: Date;
}

export function getDefaultVirtualBalance(strategy: string): number {
    const strategyUpper = String(strategy).toUpperCase();
    // Pro strategies start with $25,000; Core and others start with $5,000
    const isProStrategy = strategyUpper.includes('PRO') || strategyUpper === 'TQQQ_TURBOCORE_PRO';
    return isProStrategy ? 25000 : 5000;
}

export async function getVirtualBalance(userId: string, strategy: string): Promise<{ balance: number; isDefault: boolean }> {
    const result = await query(
        `SELECT cash_balance FROM virtual_accounts WHERE user_id = $1 AND strategy = $2`,
        [userId, strategy]
    );
    if (result.rows.length === 0) {
        // Initialize based on strategy: Pro = $25k, Core = $5k
        const defaultBalance = getDefaultVirtualBalance(strategy);
        const init = await query(
            `INSERT INTO virtual_accounts (user_id, strategy, cash_balance) VALUES ($1, $2, $3) RETURNING cash_balance`,
            [userId, strategy, defaultBalance]
        );
        return { balance: parseFloat(init.rows[0].cash_balance), isDefault: true };
    }
    return { balance: parseFloat(result.rows[0].cash_balance), isDefault: false };
}

export async function logVirtualTransaction(
    userId: string,
    strategy: string,
    type: 'buy' | 'sell' | 'deposit' | 'withdraw',
    amount: number, // positive for everything, we just log the absolute magnitude
    symbol?: string,
    quantity?: number,
    price?: number,
    signalId?: string
) {
    await query(
        `INSERT INTO virtual_transactions (
            user_id, strategy, type, symbol, quantity, price, amount, signal_id, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [userId, strategy, type, symbol || null, quantity || null, price || null, Math.abs(amount), signalId || null]
    );
}

export async function updateVirtualBalance(
    userId: string,
    strategy: string,
    deltaAmount: number, // Positive adds to balance, negative subtracts from balance
    transactionType?: 'deposit' | 'withdraw'
): Promise<number> {
    // Upsert the balance
    const result = await query(
        `INSERT INTO virtual_accounts (user_id, strategy, cash_balance)
         VALUES ($1, $2, 25000.00 + $3)
         ON CONFLICT (user_id, strategy) 
         DO UPDATE SET cash_balance = virtual_accounts.cash_balance + $3, updated_at = NOW()
         RETURNING cash_balance`,
        [userId, strategy, deltaAmount]
    );
    
    const newBalance = parseFloat(result.rows[0].cash_balance);
    
    if (transactionType) {
        await logVirtualTransaction(userId, strategy, transactionType, Math.abs(deltaAmount));
    }
    
    return newBalance;
}

// ============================================================
// USER SIGNAL EXECUTIONS
// ============================================================

export interface UserSignalExecution {
    id: number;
    user_id: string;
    signal_id: string;
    status: string;
    order_id: string | null;
    error_message: string | null;
    created_at: Date;
    approved_at: Date | null;
    executed_at: Date | null;
}

export async function createUserExecution(
    userId: string,
    signalId: string,
    status: string,
    orderId?: string,
    source?: string
): Promise<UserSignalExecution> {
    const result = await query(
        `INSERT INTO user_signal_executions (
            user_id, signal_id, status, order_id, source, created_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT (user_id, signal_id) 
        DO UPDATE SET 
            status = $3,
            order_id = COALESCE($4, user_signal_executions.order_id),
            source = COALESCE($5, user_signal_executions.source),
            executed_at = CASE WHEN $3 = 'executed' THEN NOW() ELSE user_signal_executions.executed_at END
        RETURNING *`,
        [userId, signalId, status, orderId || null, source || 'manual']
    );
    return result.rows[0];
}

export async function getUserExecution(
    userId: string,
    signalId: string
): Promise<UserSignalExecution | null> {
    const result = await query(
        `SELECT * FROM user_signal_executions 
         WHERE user_id = $1 AND signal_id = $2`,
        [userId, signalId]
    );
    return result.rows[0] || null;
}

// Alias for semantic clarity
export const getUserExecutionForSignal = getUserExecution;

export interface OrderLineData {
    execution_id: number;
    user_id: string;
    symbol: string;
    action: string;
    quantity: number;
    notional_value: number | null;
    price: number;
    order_id: string | null;
    is_virtual: boolean;
}

export async function createOrderLines(lines: OrderLineData[]): Promise<void> {
    if (lines.length === 0) return;
    
    // Batch insert using UNNEST
    const executionIds = lines.map(l => l.execution_id);
    const userIds = lines.map(l => l.user_id);
    const symbols = lines.map(l => l.symbol);
    const actions = lines.map(l => l.action);
    const quantities = lines.map(l => l.quantity);
    const nominalValues = lines.map(l => l.notional_value);
    const prices = lines.map(l => l.price);
    const orderIds = lines.map(l => l.order_id);
    const isVirtuals = lines.map(l => l.is_virtual);

    await query(`
        INSERT INTO user_order_lines (
            execution_id, user_id, symbol, action, quantity, notional_value, price, order_id, is_virtual
        )
        SELECT * FROM UNNEST (
            $1::int[], $2::varchar[], $3::varchar[], $4::varchar[], $5::numeric[], $6::numeric[], $7::numeric[], $8::varchar[], $9::boolean[]
        )
    `, [executionIds, userIds, symbols, actions, quantities, nominalValues, prices, orderIds, isVirtuals]);
}

// ============================================================
// SIGNALS (Read-only from frontend)
// ============================================================

export interface Signal {
    id: string;
    symbol: string;
    strategy: string;
    status: string;
    data: Record<string, unknown>;
    created_at: Date;
    expires_at: Date | null;
}

export async function getPendingSignals(): Promise<Signal[]> {
    const result = await query(
        `SELECT * FROM signals 
         WHERE status = 'pending' 
         AND (expires_at IS NULL OR expires_at > NOW())
         ORDER BY created_at DESC`
    );
    return result.rows;
}

export async function getSignal(signalId: string): Promise<Signal | null> {
    const result = await query(
        `SELECT * FROM signals WHERE id = $1`,
        [signalId]
    );
    return result.rows[0] || null;
}

// ============================================================
// DATABASE INITIALIZATION
// ============================================================

export async function initializeUserTables(): Promise<void> {
    try {
        // User settings table with TEXT user_id for Privy DID format
        await query(`
            CREATE TABLE IF NOT EXISTS user_settings (
                user_id VARCHAR(128) PRIMARY KEY,
                risk_level VARCHAR(20) DEFAULT 'moderate',
                notifications_enabled BOOLEAN DEFAULT true,
                subscription_tier VARCHAR(20) DEFAULT 'observer',
                stripe_customer_id VARCHAR(128),
                stripe_subscription_id VARCHAR(128),
                first_name VARCHAR(64),
                last_name VARCHAR(64),
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);

        // Gamification: User Streaks
        await query(`
            CREATE TABLE IF NOT EXISTS user_streaks (
                user_id VARCHAR(128) PRIMARY KEY,
                current_streak INTEGER DEFAULT 0,
                longest_streak INTEGER DEFAULT 0,
                last_trade_date DATE,
                total_trades INTEGER DEFAULT 0,
                total_profit DECIMAL(12,2) DEFAULT 0.00,
                win_rate DECIMAL(5,2) DEFAULT 0.00,
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);

        // Gamification: User Badges
        await query(`
            CREATE TABLE IF NOT EXISTS user_badges (
                id SERIAL PRIMARY KEY,
                user_id VARCHAR(128) NOT NULL,
                badge_id VARCHAR(50) NOT NULL,
                unlocked_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(user_id, badge_id)
            )
        `);

        // Shadow Positions
        await query(`
            CREATE TABLE IF NOT EXISTS shadow_positions (
                id SERIAL PRIMARY KEY,
                user_id VARCHAR(128) NOT NULL,
                strategy VARCHAR(64) NOT NULL,
                symbol VARCHAR(64) NOT NULL,
                quantity DECIMAL(15, 6) DEFAULT 0,
                avg_price DECIMAL(15, 4) DEFAULT 0,
                signal_id VARCHAR(128),
                executed_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(user_id, strategy, symbol)
            )
        `);
        await query(`ALTER TABLE virtual_transactions ALTER COLUMN symbol TYPE VARCHAR(64)`);

        // AI COPILOT: Compliance conversation log
        await query(`
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
        await query(`
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
        await query(`
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
        await query(`
            CREATE TABLE IF NOT EXISTS ai_deepdive_cache (
                ticker VARCHAR(16) PRIMARY KEY,
                content JSONB NOT NULL,
                expires_at TIMESTAMPTZ NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);
        // AI COPILOT: Message budget transactions
        await query(`
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

        // ── AI Feature Subscriptions (per-feature $5/mo add-ons) ──────────────
        await query(`
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
        await query(`CREATE INDEX IF NOT EXISTS idx_ai_feature_subs_user ON ai_feature_subscriptions(user_id)`);

        // ── Referral Activity Feed ────────────────────────────────────────────
        await query(`
            CREATE TABLE IF NOT EXISTS referral_activity (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                referral_id INTEGER REFERENCES referrals(id),
                event_type VARCHAR(32) NOT NULL,
                credit_amount NUMERIC(10,2) DEFAULT 0,
                description TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);
        await query(`CREATE INDEX IF NOT EXISTS idx_referral_activity_referral ON referral_activity(referral_id)`);

        // ── Migrate user_settings columns ─────────────────────────────────
        await query(`
            DO $$ 
            BEGIN
                -- Migrate user_settings.user_id if it's UUID type
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'user_settings' 
                    AND column_name = 'user_id' 
                    AND data_type = 'uuid'
                ) THEN
                    ALTER TABLE user_settings ALTER COLUMN user_id TYPE VARCHAR(128) USING user_id::VARCHAR;
                END IF;

                -- Existing Stripe columns
                ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(32) DEFAULT 'observer';
                ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(128);
                ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(128);
                ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS first_name VARCHAR(64);
                ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS last_name VARCHAR(64);
                ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS email VARCHAR(256);
                ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS email_signal_alerts BOOLEAN DEFAULT true;

                -- New Stripe columns (billing detail + fraud prevention + env flag)
                ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS stripe_price_id VARCHAR(128);
                ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(32);
                ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS billing_interval VARCHAR(8);
                ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ;
                ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS trial_end TIMESTAMPTZ;
                ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS has_had_trial BOOLEAN DEFAULT FALSE;
                ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS card_fingerprint VARCHAR(64);
                ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS livemode BOOLEAN DEFAULT FALSE;

                -- AI Copilot columns
                ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS ai_messages_used INTEGER DEFAULT 0;
                ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS ai_messages_limit INTEGER DEFAULT 50;
                ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS ai_bonus_messages INTEGER DEFAULT 0;
                ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS ai_reset_date DATE DEFAULT date_trunc('month', NOW());
                ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS push_subscription JSONB;
                ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS briefing_enabled BOOLEAN DEFAULT true;
                ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS debrief_enabled BOOLEAN DEFAULT true;

                -- AI Feature system columns  
                ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS card_fingerprint VARCHAR(64);
                ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS livemode BOOLEAN DEFAULT FALSE;

                -- In-app free trial tracking (up to 2 trials per unique email)
                ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS app_trial_count INTEGER DEFAULT 0;
                ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS app_trial_started_at TIMESTAMPTZ;
                ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS app_trial_tier VARCHAR(32) DEFAULT 'both_bundle';
                ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS app_trial_2_started_at TIMESTAMPTZ;

                ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS free_features_selected INTEGER DEFAULT 0;
                ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS free_features_limit INTEGER DEFAULT 0;

                -- Indexes for fast webhook lookups
                CREATE INDEX IF NOT EXISTS idx_user_settings_stripe_customer ON user_settings (stripe_customer_id);
                CREATE INDEX IF NOT EXISTS idx_user_settings_card_fingerprint ON user_settings (card_fingerprint);

                -- Migrate positions.user_id if it's UUID type
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'positions' 
                    AND column_name = 'user_id' 
                    AND data_type = 'uuid'
                ) THEN
                    ALTER TABLE positions ALTER COLUMN user_id TYPE VARCHAR(128) USING user_id::VARCHAR;
                END IF;

                -- Migrate user_signal_executions.user_id if it's UUID type
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'user_signal_executions' 
                    AND column_name = 'user_id' 
                    AND data_type = 'uuid'
                ) THEN
                    ALTER TABLE user_signal_executions ALTER COLUMN user_id TYPE VARCHAR(128) USING user_id::VARCHAR;
                END IF;
            EXCEPTION WHEN others THEN
                RAISE NOTICE 'Migration warning: %', SQLERRM;
            END $$
        `);

        // ── Referrals table (2-stage credits) ─────────────────────────────
        await query(`
            CREATE TABLE IF NOT EXISTS referrals (
                id SERIAL PRIMARY KEY,
                referrer_user_id VARCHAR(128) NOT NULL,
                referred_user_id VARCHAR(128) NOT NULL,
                referred_stripe_customer_id VARCHAR(128) NOT NULL,
                stage1_paid BOOLEAN DEFAULT FALSE,
                stage2_paid BOOLEAN DEFAULT FALSE,
                annual_bonus_paid BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(referred_user_id)
            )
        `);
        await query(`CREATE INDEX IF NOT EXISTS idx_referrals_referred_stripe ON referrals (referred_stripe_customer_id)`);

        // Add unique constraint for user_signal_executions if not exists
        await query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint 
                    WHERE conname = 'user_signal_executions_user_signal_unique'
                ) THEN
                    ALTER TABLE user_signal_executions 
                    ADD CONSTRAINT user_signal_executions_user_signal_unique 
                    UNIQUE (user_id, signal_id);
                END IF;
            EXCEPTION WHEN others THEN
                -- Constraint might already exist
                NULL;
            END $$
        `);

        // Add source column to user_signal_executions if not exists
        await query(`
            ALTER TABLE user_signal_executions 
            ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'manual'
        `);

        // ── shadow_positions: options spread columns ───────────────────────
        // instrument_type: 'equity' (default) | 'options'
        // leg_action:      SELL_TO_OPEN | BUY_TO_OPEN | BUY_TO_CLOSE | SELL_TO_CLOSE
        await query(`ALTER TABLE shadow_positions ADD COLUMN IF NOT EXISTS instrument_type VARCHAR(20) DEFAULT 'equity'`);
        await query(`ALTER TABLE shadow_positions ADD COLUMN IF NOT EXISTS leg_action VARCHAR(30)`);
        await query(`ALTER TABLE shadow_positions ALTER COLUMN symbol TYPE VARCHAR(64)`);

        // ── Signal Execution Order Lines (Itemized) ───────────────────────
        await query(`
            CREATE TABLE IF NOT EXISTS user_order_lines (
                id SERIAL PRIMARY KEY,
                execution_id INTEGER NOT NULL REFERENCES user_signal_executions(id) ON DELETE CASCADE,
                user_id VARCHAR(128) NOT NULL,
                symbol VARCHAR(64) NOT NULL,
                action VARCHAR(10) NOT NULL,           -- 'buy' or 'sell'
                quantity DECIMAL(15, 6) NOT NULL,      -- Can be fractional for TastyTrade, forced integer for Virtual
                notional_value DECIMAL(15, 2),         -- dollar amount
                price DECIMAL(15, 4) NOT NULL,         -- execution/market price
                order_id VARCHAR(128),                 -- Tastytrade order ID (null for virtual)
                is_virtual BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        // ── Virtual Accounts (DB-backed balances) ─────────────────────────
        await query(`ALTER TABLE user_order_lines ALTER COLUMN symbol TYPE VARCHAR(64)`);

        await query(`
            CREATE TABLE IF NOT EXISTS virtual_accounts (
                id SERIAL PRIMARY KEY,
                user_id VARCHAR(128) NOT NULL,
                strategy VARCHAR(64) NOT NULL,
                cash_balance DECIMAL(15, 2) DEFAULT 25000.00,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(user_id, strategy)
            )
        `);

        // ── Virtual Transactions (Activity Log) ───────────────────────────
        await query(`
            CREATE TABLE IF NOT EXISTS virtual_transactions (
                id SERIAL PRIMARY KEY,
                user_id VARCHAR(128) NOT NULL,
                strategy VARCHAR(64) NOT NULL,
                type VARCHAR(20) NOT NULL,    -- 'buy', 'sell', 'deposit', 'withdraw'
                symbol VARCHAR(64),
                quantity DECIMAL(15, 6),
                price DECIMAL(15, 4),
                amount DECIMAL(15, 2) NOT NULL,
                signal_id VARCHAR(128),
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);


        // ── Demo Performance (public track record, 3-day delayed) ────────────
        await query(`
            CREATE TABLE IF NOT EXISTS demo_performance (
                id           SERIAL PRIMARY KEY,
                account_id   VARCHAR(64) NOT NULL,
                trade_date   DATE NOT NULL,
                portfolio_nlv DECIMAL(15, 4) NOT NULL,
                cash_balance  DECIMAL(15, 4) NOT NULL,
                day_pnl      DECIMAL(15, 4),
                pct_return   DECIMAL(10, 6),
                strategy_mode VARCHAR(10),
                published_at  TIMESTAMPTZ,
                created_at    TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(account_id, trade_date)
            )
        `);

        // ── Seed demo virtual accounts (idempotent) ─────────────────────────
        // demo_turbocore_core → $5K Core strategy
        // demo_turbocore_pro  → $25K Pro strategy
        await query(`
            INSERT INTO virtual_accounts (user_id, strategy, cash_balance)
            VALUES
                ('demo_turbocore_core', 'TQQQ_TURBOCORE',     5000.00),
                ('demo_turbocore_pro',  'TQQQ_TURBOCORE_PRO', 25000.00)
            ON CONFLICT (user_id, strategy) DO NOTHING
        `);

        // Ensure demo users exist in user_settings so Ghost Executor can find them
        await query(`
            INSERT INTO user_settings (user_id, subscription_tier, subscription_status, global_auto_approve)
            VALUES
                ('demo_turbocore_core', 'turbocore',     'active', TRUE),
                ('demo_turbocore_pro',  'turbocore_pro', 'active', TRUE)
            ON CONFLICT (user_id) DO UPDATE SET
                global_auto_approve = TRUE,
                subscription_status = 'active'
        `);


        // ── Whop Integration Columns ──────────────────────────────────────────
        await query(`
            ALTER TABLE user_settings
              ADD COLUMN IF NOT EXISTS whop_user_id   VARCHAR(128) UNIQUE,
              ADD COLUMN IF NOT EXISTS whop_plan_id   VARCHAR(128),
              ADD COLUMN IF NOT EXISTS billing_source VARCHAR(20) DEFAULT 'stripe',
              ADD COLUMN IF NOT EXISTS auth_provider  VARCHAR(20) DEFAULT 'privy',
              ADD COLUMN IF NOT EXISTS referral_code  VARCHAR(30) UNIQUE
        `);
        await query(`CREATE INDEX IF NOT EXISTS idx_user_settings_whop_user ON user_settings(whop_user_id)`);
        await query(`CREATE INDEX IF NOT EXISTS idx_user_settings_referral_code ON user_settings(referral_code)`);

        // ── User Credits Ledger ───────────────────────────────────────────────
        // 1 credit = $0.10 = 10 cents stored as INTEGER
        await query(`
            CREATE TABLE IF NOT EXISTS user_credits (
                id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id          VARCHAR(128) NOT NULL,
                amount           INTEGER NOT NULL,
                source           VARCHAR(50) NOT NULL,
                issued_at        TIMESTAMPTZ DEFAULT NOW(),
                expires_at       TIMESTAMPTZ,
                redeemed_at      TIMESTAMPTZ,
                redeemed_against VARCHAR(128)
            )
        `);
        await query(`CREATE INDEX IF NOT EXISTS idx_user_credits_user ON user_credits(user_id)`);
        await query(`CREATE INDEX IF NOT EXISTS idx_user_credits_unredeemed ON user_credits(user_id) WHERE redeemed_at IS NULL`);

        // ── Referral Events ───────────────────────────────────────────────────
        await query(`
            CREATE TABLE IF NOT EXISTS referral_events (
                id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                referrer_id      VARCHAR(128) NOT NULL,
                referred_id      VARCHAR(128) NOT NULL,
                referral_code    VARCHAR(30),
                converted_plan   VARCHAR(50),
                converted_at     TIMESTAMPTZ DEFAULT NOW(),
                referrer_credit  INTEGER DEFAULT 0,
                referred_credit  INTEGER DEFAULT 0,
                billing_source   VARCHAR(20) DEFAULT 'stripe',
                UNIQUE(referred_id)
            )
        `);
        await query(`CREATE INDEX IF NOT EXISTS idx_referral_events_referrer ON referral_events(referrer_id)`);

        // ── Trial Conversions ─────────────────────────────────────────────────
        await query(`
            CREATE TABLE IF NOT EXISTS trial_conversions (
                id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id           VARCHAR(128) NOT NULL,
                trial_source      VARCHAR(20) DEFAULT 'whop',
                trial_started_at  TIMESTAMPTZ DEFAULT NOW(),
                trial_ended_at    TIMESTAMPTZ,
                converted         BOOLEAN DEFAULT FALSE,
                converted_plan    VARCHAR(50),
                converted_at      TIMESTAMPTZ,
                promo_code_used   VARCHAR(30),
                UNIQUE(user_id)
            )
        `);
        await query(`CREATE INDEX IF NOT EXISTS idx_trial_conversions_user ON trial_conversions(user_id)`);

        console.log('✅ User tables initialized and migrated');

    } catch (error) {
        console.error('❌ Failed to initialize user tables:', error);
        throw error;
    }
}

export default pool;
