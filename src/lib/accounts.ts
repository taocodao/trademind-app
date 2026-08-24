/**
 * Named Virtual Accounts — account-centric ledger
 * =================================================
 * Each user can create one or more NAMED virtual accounts. Every account is
 * bound to exactly ONE strategy + a risk level, and carries its own cash
 * balance, positions, and activity ledger.
 *
 * Signals fan out per-account: the backend emits one signal per strategy, and
 * each account subscribed to that strategy executes it into its own ledger at
 * the account's selected risk tier, sized to the account's current value.
 *
 * This is the account-centric model. It is ADDITIVE: the legacy strategy-keyed
 * tables (virtual_accounts / shadow_positions / virtual_transactions) are left
 * untouched so existing data and code paths keep working.
 *
 * Tables (created idempotently by initializeAccountTables):
 *   accounts              — id, user_id, name, strategy, risk_level, principal, cash
 *   account_positions     — current holdings per account (symbol, qty, avg_price)
 *   account_activities    — full activity ledger (trades + deposits/withdrawals)
 *   account_pnl_history   — daily NLV snapshots per account
 *   account_signals       — (account, signal) idempotency records
 */

import pool, { query } from '@/lib/db';

// ─── Types ───────────────────────────────────────────────────────────────────

export type RiskLevel = 'conservative' | 'moderate' | 'aggressive';

export interface Account {
    id: number;
    user_id: string;
    name: string;
    strategy: string;
    risk_level: RiskLevel;
    initial_principal: number;
    cash_balance: number;
    /** @deprecated Broker linking was removed Aug 2026. Column kept for back-compat; always 'fidelity'. */
    broker: string;
    /** Per-account alert recipient. Defaults to the Privy login email at creation. */
    alert_email: string | null;
    /** 'active' | 'archived'. Archived accounts keep P&L history but receive no signals. */
    status: string;
    created_at: string;
    updated_at: string;
}

export interface AccountPosition {
    id: number;
    account_id: number;
    symbol: string;
    quantity: number;
    avg_price: number;
    instrument_type: string;
    signal_id: string | null;
    updated_at: string;
}

export type ActivityType = 'buy' | 'sell' | 'deposit' | 'withdraw';
export type ActivitySource = 'signal' | 'manual';

export interface AccountActivity {
    id: number;
    account_id: number;
    type: ActivityType;
    symbol: string | null;
    quantity: number | null;
    price: number | null;
    amount: number;
    signal_id: string | null;
    source: ActivitySource;
    note: string | null;
    created_at: string;
}

// ─── Schema ─────────────────────────────────────────────────────────────────

let _initPromise: Promise<void> | null = null;

/** Idempotently create account tables. Safe to call on every boot/request. */
export function initializeAccountTables(): Promise<void> {
    if (!_initPromise) {
        _initPromise = (async () => {
            await query(`
                CREATE TABLE IF NOT EXISTS accounts (
                    id SERIAL PRIMARY KEY,
                    user_id VARCHAR(128) NOT NULL,
                    name VARCHAR(128) NOT NULL,
                    strategy VARCHAR(64) NOT NULL,
                    risk_level VARCHAR(20) NOT NULL DEFAULT 'moderate',
                    initial_principal DECIMAL(15, 2) NOT NULL DEFAULT 0,
                    cash_balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
                    broker VARCHAR(64) NOT NULL DEFAULT 'fidelity',
                    created_at TIMESTAMPTZ DEFAULT NOW(),
                    updated_at TIMESTAMPTZ DEFAULT NOW(),
                    CONSTRAINT valid_account_risk_level CHECK (risk_level IN ('conservative', 'moderate', 'aggressive'))
                )
            `);
            await query(`CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id)`);
            await query(`CREATE INDEX IF NOT EXISTS idx_accounts_strategy ON accounts(strategy)`);

            await query(`
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
                )
            `);
            await query(`CREATE INDEX IF NOT EXISTS idx_account_positions_account ON account_positions(account_id)`);

            await query(`
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
                )
            `);
            await query(`CREATE INDEX IF NOT EXISTS idx_account_activities_account ON account_activities(account_id)`);
            await query(`CREATE INDEX IF NOT EXISTS idx_account_activities_created ON account_activities(created_at)`);

            await query(`
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
                )
            `);
            await query(`CREATE INDEX IF NOT EXISTS idx_account_pnl_history_account ON account_pnl_history(account_id)`);

            // Idempotency: one record per (account, signal) so a signal executes
            // into a given account exactly once even on retries.
            await query(`
                CREATE TABLE IF NOT EXISTS account_signals (
                    id SERIAL PRIMARY KEY,
                    account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
                    signal_id VARCHAR(128) NOT NULL,
                    status VARCHAR(20) NOT NULL DEFAULT 'executed',
                    created_at TIMESTAMPTZ DEFAULT NOW(),
                    UNIQUE(account_id, signal_id)
                )
            `);
            await query(`CREATE INDEX IF NOT EXISTS idx_account_signals_account ON account_signals(account_id)`);

            // ── Lightweight migrations for pre-existing tables ──────────────
            // CREATE TABLE IF NOT EXISTS does not add columns to a table that
            // already exists, so add any columns introduced after first deploy.
            await query(`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS broker VARCHAR(64) NOT NULL DEFAULT 'fidelity'`);
        })().catch((err) => {
            // Reset so a transient failure doesn't permanently disable init.
            _initPromise = null;
            throw err;
        });
    }
    return _initPromise;
}

// ─── Account CRUD ────────────────────────────────────────────────────────────

export async function createAccount(
    userId: string,
    name: string,
    strategy: string,
    riskLevel: RiskLevel,
    initialPrincipal: number,
    alertEmail?: string | null
): Promise<Account> {
    await initializeAccountTables();
    const res = await query(
        `INSERT INTO accounts (user_id, name, strategy, risk_level, initial_principal, cash_balance, alert_email)
         VALUES ($1, $2, $3, $4, $5, $5, $6)
         RETURNING *`,
        [userId, name.trim(), strategy.toUpperCase(), riskLevel, initialPrincipal, alertEmail ?? null]
    );
    const acct = rowToAccount(res.rows[0]);

    // Record the opening principal as the first activity so the ledger reflects it.
    await insertActivity(acct.id, {
        type: 'deposit',
        symbol: null,
        quantity: null,
        price: null,
        amount: initialPrincipal,
        signal_id: null,
        source: 'manual',
        note: 'Initial principal',
    });

    return acct;
}

export async function listAccounts(userId: string): Promise<Account[]> {
    await initializeAccountTables();
    const res = await query(
        `SELECT * FROM accounts WHERE user_id = $1 ORDER BY created_at ASC`,
        [userId]
    );
    return res.rows.map(rowToAccount);
}

/** All accounts subscribed to a given strategy (used by signal fan-out). */
export async function listAccountsByStrategy(strategy: string): Promise<Account[]> {
    await initializeAccountTables();
    const res = await query(
        `SELECT * FROM accounts WHERE strategy = $1 ORDER BY id ASC`,
        [strategy.toUpperCase()]
    );
    return res.rows.map(rowToAccount);
}

export async function getAccount(accountId: number, userId?: string): Promise<Account | null> {
    await initializeAccountTables();
    const res = await query(`SELECT * FROM accounts WHERE id = $1`, [accountId]);
    if (res.rows.length === 0) return null;
    const acct = rowToAccount(res.rows[0]);
    if (userId && acct.user_id !== userId) return null; // ownership guard
    return acct;
}

export async function renameAccount(accountId: number, userId: string, name: string): Promise<Account | null> {
    await initializeAccountTables();
    const res = await query(
        `UPDATE accounts SET name = $3, updated_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING *`,
        [accountId, userId, name.trim()]
    );
    return res.rows.length ? rowToAccount(res.rows[0]) : null;
}

export async function updateAccountRiskLevel(accountId: number, userId: string, riskLevel: RiskLevel): Promise<Account | null> {
    await initializeAccountTables();
    const res = await query(
        `UPDATE accounts SET risk_level = $3, updated_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING *`,
        [accountId, userId, riskLevel]
    );
    return res.rows.length ? rowToAccount(res.rows[0]) : null;
}

export async function updateAccountAlertEmail(accountId: number, userId: string, alertEmail: string | null): Promise<Account | null> {
    await initializeAccountTables();
    const res = await query(
        `UPDATE accounts SET alert_email = $3, updated_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING *`,
        [accountId, userId, alertEmail]
    );
    return res.rows.length ? rowToAccount(res.rows[0]) : null;
}

/** @deprecated Broker linking was removed Aug 2026. Kept for back-compat only. */
export async function updateAccountBroker(accountId: number, userId: string, broker: string): Promise<Account | null> {
    await initializeAccountTables();
    const res = await query(
        `UPDATE accounts SET broker = $3, updated_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING *`,
        [accountId, userId, broker.toLowerCase()]
    );
    return res.rows.length ? rowToAccount(res.rows[0]) : null;
}

export async function deleteAccount(accountId: number, userId: string): Promise<boolean> {
    await initializeAccountTables();
    const res = await query(
        `DELETE FROM accounts WHERE id = $1 AND user_id = $2`,
        [accountId, userId]
    );
    return (res.rowCount ?? 0) > 0;
}

// ─── Positions ──────────────────────────────────────────────────────────────

export async function getAccountPositions(accountId: number): Promise<AccountPosition[]> {
    await initializeAccountTables();
    const res = await query(
        `SELECT * FROM account_positions WHERE account_id = $1 ORDER BY symbol ASC`,
        [accountId]
    );
    return res.rows.map((r) => ({
        id: r.id,
        account_id: r.account_id,
        symbol: r.symbol,
        quantity: Number(r.quantity),
        avg_price: Number(r.avg_price),
        instrument_type: r.instrument_type,
        signal_id: r.signal_id,
        updated_at: r.updated_at,
    }));
}

// ─── Activities ─────────────────────────────────────────────────────────────

export async function getAccountActivities(accountId: number, limit = 100): Promise<AccountActivity[]> {
    await initializeAccountTables();
    const res = await query(
        `SELECT * FROM account_activities WHERE account_id = $1 ORDER BY created_at DESC, id DESC LIMIT $2`,
        [accountId, limit]
    );
    return res.rows.map(rowToActivity);
}

async function insertActivity(accountId: number, a: Omit<AccountActivity, 'id' | 'account_id' | 'created_at'>): Promise<void> {
    await query(
        `INSERT INTO account_activities (account_id, type, symbol, quantity, price, amount, signal_id, source, note)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [accountId, a.type, a.symbol, a.quantity, a.price, a.amount, a.signal_id, a.source, a.note]
    );
}

/**
 * Apply a trade/cash adjustment to an account: updates cash, upserts/reduces the
 * position, and appends an activity — atomically. Used by both signal execution
 * and manual add/edit/delete reconciliation.
 *
 * Must be called within an open client transaction (pass the client) OR it will
 * open its own. We expose a client param so the executor can batch many orders.
 */
export async function applyActivity(
    client: any,
    accountId: number,
    a: {
        type: ActivityType;
        symbol?: string | null;
        quantity?: number | null;
        price?: number | null;
        signal_id?: string | null;
        source?: ActivitySource;
        note?: string | null;
        /** 'equity' (default) or 'option'. Options carry a 100× contract multiplier. */
        instrument_type?: string | null;
    }
): Promise<void> {
    const qty = a.quantity != null ? Math.abs(Number(a.quantity)) : null;
    const price = a.price != null ? Number(a.price) : null;
    const instrumentType = a.instrument_type === 'option' ? 'option' : 'equity';
    // Options are quoted per share but settle per contract (100 shares).
    const multiplier = instrumentType === 'option' ? 100 : 1;

    // The ledger `amount` is unambiguous per type:
    //   buy/sell        → notional = qty × price × multiplier
    //   deposit/withdraw → the cash amount itself (carried in `quantity` by convention)
    const isTrade = a.type === 'buy' || a.type === 'sell';
    const amount = isTrade
        ? (qty != null && price != null ? qty * price * multiplier : 0)
        : qty != null
          ? qty
          : 0;

    // 1. Cash delta
    let cashDelta = 0;
    if (a.type === 'buy') cashDelta = -amount;
    else if (a.type === 'sell') cashDelta = amount;
    else if (a.type === 'deposit') cashDelta = amount;
    else if (a.type === 'withdraw') cashDelta = -amount;

    await client.query(
        `UPDATE accounts SET cash_balance = cash_balance + $2, updated_at = NOW() WHERE id = $1`,
        [accountId, cashDelta]
    );

    // 2. Position mutation (trades only)
    if ((a.type === 'buy' || a.type === 'sell') && a.symbol && qty != null && qty > 0) {
        if (a.type === 'buy') {
            if (instrumentType === 'option') {
                // Options may be short (negative quantity) via PMCC overlays.
                // Buying back a short moves quantity toward 0; the weighted
                // average formula divides by (quantity + $3), which is 0 on an
                // exact close — keep the prior avg in that case.
                await client.query(
                    `INSERT INTO account_positions (account_id, symbol, quantity, avg_price, instrument_type, signal_id, updated_at)
                     VALUES ($1, $2, $3, $4, $5, $6, NOW())
                     ON CONFLICT (account_id, symbol) DO UPDATE SET
                        quantity  = account_positions.quantity + $3,
                        avg_price = CASE
                            WHEN account_positions.quantity < 0 THEN account_positions.avg_price
                            WHEN account_positions.quantity + $3 = 0 THEN account_positions.avg_price
                            ELSE ((account_positions.quantity * account_positions.avg_price) + ($3 * $4)) / (account_positions.quantity + $3)
                        END,
                        signal_id = $6,
                        updated_at = NOW()`,
                    [accountId, a.symbol, qty, price ?? 0, instrumentType, a.signal_id ?? null]
                );
                await client.query(
                    `DELETE FROM account_positions WHERE account_id = $1 AND symbol = $2 AND quantity = 0`,
                    [accountId, a.symbol]
                );
            } else {
                await client.query(
                    `INSERT INTO account_positions (account_id, symbol, quantity, avg_price, instrument_type, signal_id, updated_at)
                     VALUES ($1, $2, $3, $4, $5, $6, NOW())
                     ON CONFLICT (account_id, symbol) DO UPDATE SET
                        quantity  = account_positions.quantity + $3,
                        avg_price = ((account_positions.quantity * account_positions.avg_price) + ($3 * $4)) / (account_positions.quantity + $3),
                        signal_id = $6,
                        updated_at = NOW()`,
                    [accountId, a.symbol, qty, price ?? 0, instrumentType, a.signal_id ?? null]
                );
            }
        } else {
            if (instrumentType === 'option') {
                // Options may go short (negative quantity): a Sell to Open with
                // no existing row inserts a short; selling against a short
                // adds to it with a weighted avg; selling a long reduces it.
                await client.query(
                    `INSERT INTO account_positions (account_id, symbol, quantity, avg_price, instrument_type, signal_id, updated_at)
                     VALUES ($1, $2, ($3 * -1), $4, $5, $6, NOW())
                     ON CONFLICT (account_id, symbol) DO UPDATE SET
                        quantity  = account_positions.quantity - $3,
                        avg_price = CASE
                            WHEN account_positions.quantity > 0 THEN account_positions.avg_price
                            WHEN account_positions.quantity < 0 THEN ((ABS(account_positions.quantity) * account_positions.avg_price) + ($3 * $4)) / (ABS(account_positions.quantity) + $3)
                            ELSE $4
                        END,
                        signal_id = $6,
                        updated_at = NOW()`,
                    [accountId, a.symbol, qty, price ?? 0, instrumentType, a.signal_id ?? null]
                );
                await client.query(
                    `DELETE FROM account_positions WHERE account_id = $1 AND symbol = $2 AND quantity = 0`,
                    [accountId, a.symbol]
                );
            } else {
                await client.query(
                    `UPDATE account_positions
                     SET quantity = GREATEST(0, quantity - $3), signal_id = $4, updated_at = NOW()
                     WHERE account_id = $1 AND symbol = $2`,
                    [accountId, a.symbol, qty, a.signal_id ?? null]
                );
                await client.query(
                    `DELETE FROM account_positions WHERE account_id = $1 AND symbol = $2 AND quantity <= 0`,
                    [accountId, a.symbol]
                );
            }
        }
    }

    // 3. Activity row
    await client.query(
        `INSERT INTO account_activities (account_id, type, symbol, quantity, price, amount, signal_id, source, note)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
            accountId,
            a.type,
            a.symbol ?? null,
            qty,
            price,
            amount,
            a.signal_id ?? null,
            a.source ?? 'manual',
            a.note ?? null,
        ]
    );
}

/**
 * Reverse the effect of an existing activity (used by delete/edit). Applies the
 * inverse cash + position delta, then removes the activity row.
 */
export async function reverseActivity(accountId: number, activityId: number): Promise<boolean> {
    await initializeAccountTables();
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const res = await client.query(
            `SELECT * FROM account_activities WHERE id = $1 AND account_id = $2 FOR UPDATE`,
            [activityId, accountId]
        );
        if (res.rows.length === 0) {
            await client.query('ROLLBACK');
            return false;
        }
        const a = res.rows[0];
        const qty = a.quantity != null ? Number(a.quantity) : null;
        const price = a.price != null ? Number(a.price) : null;
        const notional = qty != null && price != null ? qty * price : 0;

        // Inverse cash
        let cashDelta = 0;
        if (a.type === 'buy') cashDelta = notional; // refund
        else if (a.type === 'sell') cashDelta = -notional; // take back proceeds
        else if (a.type === 'deposit') cashDelta = -Number(a.amount);
        else if (a.type === 'withdraw') cashDelta = Number(a.amount);

        await client.query(
            `UPDATE accounts SET cash_balance = cash_balance + $2, updated_at = NOW() WHERE id = $1`,
            [accountId, cashDelta]
        );

        // Inverse position
        if ((a.type === 'buy' || a.type === 'sell') && a.symbol && qty != null && qty > 0) {
            if (a.type === 'buy') {
                // undo a buy → reduce position
                await client.query(
                    `UPDATE account_positions SET quantity = GREATEST(0, quantity - $3), updated_at = NOW()
                     WHERE account_id = $1 AND symbol = $2`,
                    [accountId, a.symbol, qty]
                );
                await client.query(
                    `DELETE FROM account_positions WHERE account_id = $1 AND symbol = $2 AND quantity <= 0`,
                    [accountId, a.symbol]
                );
            } else {
                // undo a sell → add position back at the sale price
                await client.query(
                    `INSERT INTO account_positions (account_id, symbol, quantity, avg_price, instrument_type, updated_at)
                     VALUES ($1, $2, $3, $4, 'equity', NOW())
                     ON CONFLICT (account_id, symbol) DO UPDATE SET
                        quantity  = account_positions.quantity + $3,
                        avg_price = ((account_positions.quantity * account_positions.avg_price) + ($3 * $4)) / (account_positions.quantity + $3),
                        updated_at = NOW()`,
                    [accountId, a.symbol, qty, price ?? 0]
                );
            }
        }

        await client.query(`DELETE FROM account_activities WHERE id = $1`, [activityId]);
        await client.query('COMMIT');
        return true;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

/**
 * Edit an activity in place: reverse the original, then apply the corrected one.
 * Keeps the ledger consistent (positions + cash reflect the edit).
 */
export async function editActivity(
    accountId: number,
    activityId: number,
    updated: { type: ActivityType; symbol?: string | null; quantity?: number | null; price?: number | null; note?: string | null }
): Promise<boolean> {
    await initializeAccountTables();
    // Fetch original to preserve signal_id/source
    const orig = await query(
        `SELECT * FROM account_activities WHERE id = $1 AND account_id = $2`,
        [activityId, accountId]
    );
    if (orig.rows.length === 0) return false;
    const o = orig.rows[0];

    const reversed = await reverseActivity(accountId, activityId);
    if (!reversed) return false;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await applyActivity(client, accountId, {
            type: updated.type,
            symbol: updated.symbol ?? o.symbol,
            quantity: updated.quantity ?? o.quantity,
            price: updated.price ?? o.price,
            signal_id: o.signal_id,
            source: o.source,
            note: updated.note ?? o.note,
        });
        await client.query('COMMIT');
        return true;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

/**
 * Add a manual activity (trade or cash) and apply it to the account.
 */
export async function addManualActivity(
    accountId: number,
    a: { type: ActivityType; symbol?: string | null; quantity?: number | null; price?: number | null; note?: string | null }
): Promise<void> {
    await initializeAccountTables();
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await applyActivity(client, accountId, { ...a, source: 'manual' });
        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

// ─── P&L History ─────────────────────────────────────────────────────────────

export async function saveAccountPnlSnapshot(
    accountId: number,
    snapshotDate: string,
    cashBalance: number,
    positionsValue: number,
    initialPrincipal: number | null
): Promise<void> {
    await initializeAccountTables();
    const nlv = cashBalance + positionsValue;
    const cumulativePnl = initialPrincipal != null ? nlv - initialPrincipal : null;
    const cumulativePnlPct =
        initialPrincipal != null && initialPrincipal > 0 ? (nlv - initialPrincipal) / initialPrincipal : null;
    await query(
        `INSERT INTO account_pnl_history (account_id, snapshot_date, cash_balance, positions_value, nlv, initial_principal, cumulative_pnl, cumulative_pnl_pct)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (account_id, snapshot_date) DO UPDATE SET
            cash_balance = EXCLUDED.cash_balance,
            positions_value = EXCLUDED.positions_value,
            nlv = EXCLUDED.nlv,
            cumulative_pnl = EXCLUDED.cumulative_pnl,
            cumulative_pnl_pct = EXCLUDED.cumulative_pnl_pct`,
        [accountId, snapshotDate, cashBalance, positionsValue, nlv, initialPrincipal, cumulativePnl, cumulativePnlPct]
    );
}

export async function getAccountPnlHistory(accountId: number, days = 90): Promise<any[]> {
    await initializeAccountTables();
    const res = await query(
        `SELECT * FROM account_pnl_history WHERE account_id = $1 AND snapshot_date >= CURRENT_DATE - $2 * INTERVAL '1 day'
         ORDER BY snapshot_date ASC`,
        [accountId, days]
    );
    return res.rows;
}

/** Most recent recorded NLV for an account (for phase drawdown detection). */
export async function getLatestAccountNlv(accountId: number): Promise<number | null> {
    await initializeAccountTables();
    const res = await query(
        `SELECT nlv FROM account_pnl_history WHERE account_id = $1 ORDER BY snapshot_date DESC LIMIT 1`,
        [accountId]
    );
    return res.rows[0]?.nlv != null ? Number(res.rows[0].nlv) : null;
}

// ─── Idempotency ─────────────────────────────────────────────────────────────

export async function hasAccountExecutedSignal(accountId: number, signalId: string): Promise<boolean> {
    await initializeAccountTables();
    const res = await query(
        `SELECT 1 FROM account_signals WHERE account_id = $1 AND signal_id = $2`,
        [accountId, signalId]
    );
    return res.rows.length > 0;
}

export async function recordAccountSignal(accountId: number, signalId: string, status = 'executed'): Promise<void> {
    await initializeAccountTables();
    await query(
        `INSERT INTO account_signals (account_id, signal_id, status) VALUES ($1, $2, $3)
         ON CONFLICT (account_id, signal_id) DO NOTHING`,
        [accountId, signalId, status]
    );
}

// ─── Row mappers ─────────────────────────────────────────────────────────────

function rowToAccount(r: any): Account {
    return {
        id: r.id,
        user_id: r.user_id,
        name: r.name,
        strategy: r.strategy,
        risk_level: r.risk_level,
        initial_principal: Number(r.initial_principal),
        cash_balance: Number(r.cash_balance),
        broker: r.broker || 'fidelity',
        alert_email: r.alert_email ?? null,
        status: r.status || 'active',
        created_at: r.created_at,
        updated_at: r.updated_at,
    };
}

function rowToActivity(r: any): AccountActivity {
    return {
        id: r.id,
        account_id: r.account_id,
        type: r.type,
        symbol: r.symbol,
        quantity: r.quantity != null ? Number(r.quantity) : null,
        price: r.price != null ? Number(r.price) : null,
        amount: Number(r.amount),
        signal_id: r.signal_id,
        source: r.source,
        note: r.note,
        created_at: r.created_at,
    };
}
