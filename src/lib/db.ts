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
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);

        // Migrate user_id columns from UUID to TEXT for Privy DID support
        // This handles cases where tables were created with UUID type
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
                -- Log but don't fail on migration errors
                RAISE NOTICE 'Migration warning: %', SQLERRM;
            END $$
        `);

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

        console.log('✅ User tables initialized and migrated');
    } catch (error) {
        console.error('❌ Failed to initialize user tables:', error);
        throw error;
    }
}

export default pool;
