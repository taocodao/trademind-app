/**
 * QQQ LEAPS lots
 * ==============
 * Every long call a virtual account holds is its own lot, so each one can be
 * managed (exit rules, member adjustments) on its own terms instead of being
 * treated as one blob. account_positions stays the per-contract aggregate of a
 * account's open lots and is rebuilt from them (syncPositionForSymbol).
 *
 * Money rules (all within one transaction per action):
 *   - activity rows are the ledger; a lot points at its entry and exit rows
 *   - re-pricing or resizing a row moves cash by the difference only
 *   - the model price is always kept next to the member's price
 *   - changes only touch the member's own account; the public track record
 *     is computed from the model, never from these rows
 */

import pool, { query } from '@/lib/db';
import { initializeAccountTables, applyActivity } from '@/lib/accounts';
import { buildOptionSymbol, parseOptionSymbol } from '@/lib/option-symbols';

export const MAX_LOTS_PER_ACCOUNT = 3;
/** Members can adjust a lot for this many trading days after the signal, then it locks. */
export const EDIT_WINDOW_TRADING_DAYS = 5;

export type LotStatus = 'open' | 'closed' | 'expired' | 'skipped';

export interface OptionLot {
    id: number;
    accountId: number;
    underlying: string;
    symbol: string;
    strike: number;
    expiry: string; // YYYY-MM-DD
    contracts: number;
    status: LotStatus;
    source: 'signal' | 'manual';
    entrySignalId: string | null;
    entryDate: string;
    entryActivityId: number | null;
    modelEntryPrice: number | null;
    entryPrice: number;
    exitSignalId: string | null;
    exitDate: string | null;
    exitActivityId: number | null;
    modelExitPrice: number | null;
    exitPrice: number | null;
    exitReason: string | null;
    stillHolding: boolean;
    adjusted: boolean;
    memberNote: string | null;
}

const LOT_COLUMNS = `id, account_id, underlying, symbol, strike, to_char(expiry, 'YYYY-MM-DD') AS expiry,
    contracts, status, source, entry_signal_id, to_char(entry_date, 'YYYY-MM-DD') AS entry_date,
    entry_activity_id, model_entry_price, entry_price, exit_signal_id,
    to_char(exit_date, 'YYYY-MM-DD') AS exit_date, exit_activity_id, model_exit_price, exit_price,
    exit_reason, still_holding, adjusted, member_note`;

function num(v: unknown): number | null {
    return v == null ? null : Number(v);
}

function rowToLot(r: any): OptionLot {
    return {
        id: Number(r.id),
        accountId: Number(r.account_id),
        underlying: r.underlying,
        symbol: r.symbol,
        strike: Number(r.strike),
        expiry: r.expiry,
        contracts: Number(r.contracts),
        status: r.status,
        source: r.source,
        entrySignalId: r.entry_signal_id,
        entryDate: r.entry_date,
        entryActivityId: r.entry_activity_id != null ? Number(r.entry_activity_id) : null,
        modelEntryPrice: num(r.model_entry_price),
        entryPrice: Number(r.entry_price),
        exitSignalId: r.exit_signal_id,
        exitDate: r.exit_date,
        exitActivityId: r.exit_activity_id != null ? Number(r.exit_activity_id) : null,
        modelExitPrice: num(r.model_exit_price),
        exitPrice: num(r.exit_price),
        exitReason: r.exit_reason,
        stillHolding: !!r.still_holding,
        adjusted: !!r.adjusted,
        memberNote: r.member_note,
    };
}

export function todayET(): string {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}

/** Whole weekdays elapsed from a YYYY-MM-DD date to today (ET). Holidays are not modelled. */
export function tradingDaysSince(dateStr: string | null): number {
    if (!dateStr) return 0;
    const start = new Date(`${dateStr}T00:00:00Z`);
    const end = new Date(`${todayET()}T00:00:00Z`);
    let n = 0;
    const d = new Date(start);
    while (d < end) {
        d.setUTCDate(d.getUTCDate() + 1);
        const dow = d.getUTCDay();
        if (dow !== 0 && dow !== 6) n++;
    }
    return n;
}

export function isWithinEditWindow(dateStr: string | null): boolean {
    return tradingDaysSince(dateStr) <= EDIT_WINDOW_TRADING_DAYS;
}

// ─── Reads ──────────────────────────────────────────────────────────────

export async function getAccountLots(accountId: number, opts: { openOnly?: boolean } = {}): Promise<OptionLot[]> {
    await initializeAccountTables();
    const res = await query(
        `SELECT ${LOT_COLUMNS} FROM account_option_lots
         WHERE account_id = $1 ${opts.openOnly ? `AND status = 'open'` : ''}
         ORDER BY entry_date DESC, id DESC`,
        [accountId]
    );
    return res.rows.map(rowToLot);
}

export async function getLot(accountId: number, lotId: number): Promise<OptionLot | null> {
    await initializeAccountTables();
    const res = await query(
        `SELECT ${LOT_COLUMNS} FROM account_option_lots WHERE id = $1 AND account_id = $2`,
        [lotId, accountId]
    );
    return res.rows[0] ? rowToLot(res.rows[0]) : null;
}

/** Lots tied to any of these signals (as entry or exit), for the signal cards. */
export async function getLotsForSignals(accountId: number, signalIds: string[]): Promise<OptionLot[]> {
    if (signalIds.length === 0) return [];
    await initializeAccountTables();
    const res = await query(
        `SELECT ${LOT_COLUMNS} FROM account_option_lots
         WHERE account_id = $1 AND (entry_signal_id = ANY($2) OR exit_signal_id = ANY($2))
         ORDER BY id ASC`,
        [accountId, signalIds]
    );
    return res.rows.map(rowToLot);
}

export async function countOpenLots(accountId: number): Promise<number> {
    await initializeAccountTables();
    const res = await query(
        `SELECT COUNT(*)::int AS n FROM account_option_lots WHERE account_id = $1 AND status = 'open'`,
        [accountId]
    );
    return Number(res.rows[0]?.n ?? 0);
}

// ─── Option marks (latest known mid per contract) ───────────────────────────

export interface OptionMark {
    symbol: string;
    mid: number;
    bid: number | null;
    ask: number | null;
    delta: number | null;
    source: string | null;
    asOf: string;
}

export async function getOptionMarks(symbols: string[]): Promise<Record<string, OptionMark>> {
    if (symbols.length === 0) return {};
    await initializeAccountTables();
    const res = await query(
        `SELECT symbol, mid, bid, ask, delta, source, as_of FROM option_marks WHERE symbol = ANY($1)`,
        [symbols]
    );
    const out: Record<string, OptionMark> = {};
    for (const r of res.rows) {
        out[r.symbol] = {
            symbol: r.symbol,
            mid: Number(r.mid),
            bid: num(r.bid),
            ask: num(r.ask),
            delta: num(r.delta),
            source: r.source,
            asOf: new Date(r.as_of).toISOString(),
        };
    }
    return out;
}

export async function saveOptionMark(m: { symbol: string; mid: number; bid?: number | null; ask?: number | null; delta?: number | null; source?: string }): Promise<void> {
    if (!(m.mid > 0)) return;
    await initializeAccountTables();
    await query(
        `INSERT INTO option_marks (symbol, mid, bid, ask, delta, source, as_of)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         ON CONFLICT (symbol) DO UPDATE SET mid = $2, bid = $3, ask = $4, delta = $5, source = $6, as_of = NOW()`,
        [m.symbol, m.mid, m.bid ?? null, m.ask ?? null, m.delta ?? null, m.source ?? 'quote']
    );
}

// ─── Ledger primitives (transaction scoped) ──────────────────────────────

/** Rebuild the aggregate position for one contract from the account's open lots. */
export async function syncPositionForSymbol(client: any, accountId: number, symbol: string): Promise<void> {
    const agg = await client.query(
        `SELECT COALESCE(SUM(contracts), 0)::numeric AS qty,
                COALESCE(SUM(contracts * entry_price), 0)::numeric AS cost,
                (SELECT entry_signal_id FROM account_option_lots
                  WHERE account_id = $1 AND symbol = $2 AND status = 'open' ORDER BY id DESC LIMIT 1) AS sig
         FROM account_option_lots WHERE account_id = $1 AND symbol = $2 AND status = 'open'`,
        [accountId, symbol]
    );
    const qty = Number(agg.rows[0].qty);
    const cost = Number(agg.rows[0].cost);
    if (qty <= 0) {
        // Only remove a long; never touch a short written against the same symbol.
        await client.query(
            `DELETE FROM account_positions WHERE account_id = $1 AND symbol = $2 AND quantity > 0`,
            [accountId, symbol]
        );
        return;
    }
    await client.query(
        `INSERT INTO account_positions (account_id, symbol, quantity, avg_price, instrument_type, signal_id, updated_at)
         VALUES ($1, $2, $3, $4, 'option', $5, NOW())
         ON CONFLICT (account_id, symbol) DO UPDATE SET
            quantity = $3, avg_price = $4, instrument_type = 'option',
            signal_id = COALESCE($5, account_positions.signal_id), updated_at = NOW()`,
        [accountId, symbol, qty, cost / qty, agg.rows[0].sig ?? null]
    );
}

async function adjustCash(client: any, accountId: number, delta: number): Promise<void> {
    if (!delta) return;
    await client.query(
        `UPDATE accounts SET cash_balance = cash_balance + $2, updated_at = NOW() WHERE id = $1`,
        [accountId, +delta.toFixed(2)]
    );
}

/** Re-state a ledger row (quantity, price, symbol, note); moves cash by the difference only. */
async function restampActivity(
    client: any,
    accountId: number,
    activityId: number,
    patch: { quantity?: number; price?: number; symbol?: string; note?: string }
): Promise<void> {
    const cur = await client.query(
        `SELECT type, symbol, quantity, price, amount, note FROM account_activities WHERE id = $1 AND account_id = $2 FOR UPDATE`,
        [activityId, accountId]
    );
    if (cur.rows.length === 0) throw new LotError('The ledger row for this trade was not found');
    const row = cur.rows[0];
    const qty = patch.quantity ?? Number(row.quantity);
    const price = patch.price ?? Number(row.price);
    const symbol = patch.symbol ?? row.symbol;
    const oldAmount = Number(row.amount);
    const newAmount = +(qty * price * 100).toFixed(2);
    await client.query(
        `UPDATE account_activities SET quantity = $3, price = $4, amount = $5, symbol = $6, note = $7 WHERE id = $1 AND account_id = $2`,
        [activityId, accountId, qty, price, newAmount, symbol, patch.note ?? row.note]
    );
    const diff = newAmount - oldAmount;
    await adjustCash(client, accountId, row.type === 'buy' ? -diff : diff);
}

/** Delete a ledger row and undo its cash effect (positions are rebuilt from lots by the caller). */
async function removeActivityRow(client: any, accountId: number, activityId: number): Promise<void> {
    const cur = await client.query(
        `SELECT type, amount FROM account_activities WHERE id = $1 AND account_id = $2 FOR UPDATE`,
        [activityId, accountId]
    );
    if (cur.rows.length === 0) return;
    const { type, amount } = cur.rows[0];
    await adjustCash(client, accountId, type === 'buy' ? Number(amount) : -Number(amount));
    await client.query(`DELETE FROM account_activities WHERE id = $1`, [activityId]);
}

// ─── Lot lifecycle used by the fan-out executor ─────────────────────────────

export async function createLotFromBuy(
    client: any,
    p: {
        accountId: number;
        symbol: string;
        contracts: number;
        price: number;
        modelPrice?: number | null;
        signalId: string | null;
        activityId: number | null;
        source?: 'signal' | 'manual';
        entryDate?: string;
    }
): Promise<number | null> {
    const parsed = parseOptionSymbol(p.symbol);
    if (!parsed || parsed.right !== 'C') return null;
    const res = await client.query(
        `INSERT INTO account_option_lots
            (account_id, underlying, symbol, strike, expiry, contracts, source, entry_signal_id, entry_date,
             entry_activity_id, model_entry_price, entry_price)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`,
        [
            p.accountId, parsed.underlying, p.symbol, parsed.strike, parsed.expiry, p.contracts,
            p.source ?? 'signal', p.signalId, p.entryDate ?? todayET(), p.activityId,
            p.modelPrice ?? p.price, p.price,
        ]
    );
    await syncPositionForSymbol(client, p.accountId, p.symbol);
    return Number(res.rows[0].id);
}

export async function closeLot(
    client: any,
    p: {
        lotId: number;
        accountId: number;
        price: number;
        modelPrice?: number | null;
        signalId: string | null;
        activityId: number | null;
        reason: string | null;
        status?: 'closed' | 'expired';
    }
): Promise<void> {
    const cur = await client.query(
        `SELECT symbol FROM account_option_lots WHERE id = $1 AND account_id = $2 AND status = 'open' FOR UPDATE`,
        [p.lotId, p.accountId]
    );
    if (cur.rows.length === 0) return;
    await client.query(
        `UPDATE account_option_lots SET status = $3, exit_signal_id = $4, exit_date = $5, exit_activity_id = $6,
            model_exit_price = $7, exit_price = $8, exit_reason = $9, still_holding = FALSE, updated_at = NOW()
         WHERE id = $1 AND account_id = $2`,
        [p.lotId, p.accountId, p.status ?? 'closed', p.signalId, todayET(), p.activityId, p.modelPrice ?? p.price, p.price, p.reason]
    );
    await syncPositionForSymbol(client, p.accountId, cur.rows[0].symbol);
}

/** Legacy exit (no lot named): close open lots of this contract, oldest first, up to qty. */
export async function closeLotsForSell(
    client: any,
    p: { accountId: number; symbol: string; contracts: number; price: number; signalId: string | null; activityId: number | null; reason: string }
): Promise<void> {
    const res = await client.query(
        `SELECT id, contracts FROM account_option_lots
         WHERE account_id = $1 AND symbol = $2 AND status = 'open' ORDER BY id ASC FOR UPDATE`,
        [p.accountId, p.symbol]
    );
    let remaining = p.contracts;
    for (const r of res.rows) {
        if (remaining <= 0) break;
        const n = Number(r.contracts);
        if (n > remaining) break; // never split a lot silently; the aggregate row still matches
        await closeLot(client, { lotId: Number(r.id), accountId: p.accountId, price: p.price, signalId: p.signalId, activityId: p.activityId, reason: p.reason });
        remaining -= n;
    }
}

// ─── Member adjustments ──────────────────────────────────────────────────

export class LotError extends Error {}

async function withLot<T>(
    accountId: number,
    lotId: number,
    fn: (client: any, lot: OptionLot) => Promise<T>
): Promise<T> {
    await initializeAccountTables();
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query(`SELECT id FROM accounts WHERE id = $1 FOR UPDATE`, [accountId]);
        const r = await client.query(
            `SELECT ${LOT_COLUMNS} FROM account_option_lots WHERE id = $1 AND account_id = $2 FOR UPDATE`,
            [lotId, accountId]
        );
        if (r.rows.length === 0) throw new LotError('Position not found');
        const out = await fn(client, rowToLot(r.rows[0]));
        await client.query('COMMIT');
        return out;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

function assertPrice(p: unknown): number {
    const n = Number(p);
    if (!isFinite(n) || n <= 0 || n > 10000) throw new LotError('Price must be between 0 and 10,000');
    return n;
}

function assertEntryEditable(lot: OptionLot) {
    if (lot.status === 'expired') throw new LotError('This position has expired and cannot be changed');
    if (!isWithinEditWindow(lot.entryDate)) {
        throw new LotError(`Entries lock ${EDIT_WINDOW_TRADING_DAYS} trading days after the signal. This one is locked.`);
    }
}

function assertExitEditable(lot: OptionLot) {
    if (!isWithinEditWindow(lot.exitDate)) {
        throw new LotError(`Exits lock ${EDIT_WINDOW_TRADING_DAYS} trading days after the signal. This one is locked.`);
    }
}

function mark(note: string | null | undefined, extra: string): string {
    return `${note || ''}${note ? ' | ' : ''}${extra}`.slice(0, 480);
}

/** I did not buy this one: remove it and give the cash back. */
export async function skipLot(accountId: number, lotId: number): Promise<void> {
    await withLot(accountId, lotId, async (client, lot) => {
        if (lot.status !== 'open') throw new LotError('Only an open position can be marked as not bought');
        assertEntryEditable(lot);
        if (lot.entryActivityId) await removeActivityRow(client, accountId, lot.entryActivityId);
        await client.query(
            `UPDATE account_option_lots SET status = 'skipped', adjusted = TRUE, entry_activity_id = NULL,
                still_holding = FALSE, member_note = $3, updated_at = NOW() WHERE id = $1 AND account_id = $2`,
            [lotId, accountId, 'Member did not buy this order']
        );
        await syncPositionForSymbol(client, accountId, lot.symbol);
    });
}

/** I bought fewer contracts than the signal sized: shrink the lot and refund the rest. */
export async function partialFillLot(accountId: number, lotId: number, contracts: number, price?: number): Promise<void> {
    const n = Math.floor(Number(contracts));
    await withLot(accountId, lotId, async (client, lot) => {
        if (lot.status !== 'open') throw new LotError('Only an open position can be resized');
        assertEntryEditable(lot);
        if (!(n >= 1) || n >= lot.contracts) throw new LotError(`Enter a whole number from 1 to ${lot.contracts - 1}`);
        const px = price != null ? assertPrice(price) : lot.entryPrice;
        if (lot.entryActivityId) {
            await restampActivity(client, accountId, lot.entryActivityId, {
                quantity: n, price: px,
                note: mark(null, `Member filled ${n} of ${lot.contracts} at $${px} (model $${lot.modelEntryPrice ?? lot.entryPrice})`),
            });
        }
        await client.query(
            `UPDATE account_option_lots SET contracts = $3, entry_price = $4, adjusted = TRUE, updated_at = NOW()
             WHERE id = $1 AND account_id = $2`,
            [lotId, accountId, n, px]
        );
        await syncPositionForSymbol(client, accountId, lot.symbol);
    });
}

/** Re-price the entry (the member's real fill). */
export async function repriceEntry(accountId: number, lotId: number, price: number): Promise<void> {
    const px = assertPrice(price);
    await withLot(accountId, lotId, async (client, lot) => {
        if (lot.status !== 'open' && lot.status !== 'closed') throw new LotError('This position cannot be re-priced');
        assertEntryEditable(lot);
        if (lot.entryActivityId) {
            await restampActivity(client, accountId, lot.entryActivityId, {
                price: px, note: mark(null, `Member fill $${px} (model $${lot.modelEntryPrice ?? lot.entryPrice})`),
            });
        }
        await client.query(
            `UPDATE account_option_lots SET entry_price = $3, adjusted = TRUE, updated_at = NOW() WHERE id = $1 AND account_id = $2`,
            [lotId, accountId, px]
        );
        await syncPositionForSymbol(client, accountId, lot.symbol);
    });
}

/** I bought a different strike or expiry than the signal named. */
export async function differentContractLot(
    accountId: number,
    lotId: number,
    input: { strike: number; expiry: string; price: number; contracts?: number }
): Promise<void> {
    const strike = Number(input.strike);
    if (!Number.isInteger(strike) || strike < 50 || strike > 2000) throw new LotError('Strike must be a whole number between 50 and 2000');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.expiry)) throw new LotError('Expiry must be a date like 2028-01-21');
    const days = Math.round((new Date(`${input.expiry}T00:00:00Z`).getTime() - new Date(`${todayET()}T00:00:00Z`).getTime()) / 86400000);
    if (days < 30 || days > 1200) throw new LotError('Expiry must be between 30 days and about 3 years out');
    const px = assertPrice(input.price);

    await withLot(accountId, lotId, async (client, lot) => {
        if (lot.status !== 'open') throw new LotError('Only an open position can be changed to a different contract');
        assertEntryEditable(lot);
        const n = input.contracts != null ? Math.floor(Number(input.contracts)) : lot.contracts;
        if (!(n >= 1) || n > lot.contracts) throw new LotError(`Contracts must be from 1 to ${lot.contracts}`);
        const newSymbol = buildOptionSymbol(lot.underlying, input.expiry, 'C', strike);
        if (lot.entryActivityId) {
            await restampActivity(client, accountId, lot.entryActivityId, {
                symbol: newSymbol, quantity: n, price: px,
                note: mark(null, `Member bought ${lot.underlying} $${strike} exp ${input.expiry} at $${px} (signal named ${lot.symbol})`),
            });
        }
        await client.query(
            `UPDATE account_option_lots SET symbol = $3, strike = $4, expiry = $5, contracts = $6, entry_price = $7,
                adjusted = TRUE, updated_at = NOW() WHERE id = $1 AND account_id = $2`,
            [lotId, accountId, newSymbol, strike, input.expiry, n, px]
        );
        await syncPositionForSymbol(client, accountId, lot.symbol);
        await syncPositionForSymbol(client, accountId, newSymbol);
    });
}

/** I have not sold yet: reopen the lot so the next 9:45 AM check evaluates it again. */
export async function stillHoldingLot(accountId: number, lotId: number): Promise<void> {
    await withLot(accountId, lotId, async (client, lot) => {
        if (lot.status !== 'closed') throw new LotError('Only a position closed by a signal can be marked as still held');
        assertExitEditable(lot);
        if (lot.exitActivityId) await removeActivityRow(client, accountId, lot.exitActivityId);
        await client.query(
            `UPDATE account_option_lots SET status = 'open', still_holding = TRUE, adjusted = TRUE, exit_signal_id = NULL,
                exit_date = NULL, exit_activity_id = NULL, model_exit_price = NULL, exit_price = NULL,
                member_note = $3, updated_at = NOW() WHERE id = $1 AND account_id = $2`,
            [lotId, accountId, `Member still holds; previous exit: ${lot.exitReason || 'signal'}`]
        );
        await syncPositionForSymbol(client, accountId, lot.symbol);
    });
}

/** I sold at a different price than the signal's mid. */
export async function soldAtPrice(accountId: number, lotId: number, price: number): Promise<void> {
    const px = assertPrice(price);
    await withLot(accountId, lotId, async (client, lot) => {
        if (lot.status !== 'closed') throw new LotError('Only a closed position can be re-priced here');
        assertExitEditable(lot);
        if (lot.exitActivityId) {
            await restampActivity(client, accountId, lot.exitActivityId, {
                price: px, note: mark(null, `Member sold at $${px} (model $${lot.modelExitPrice ?? lot.exitPrice})`),
            });
        }
        await client.query(
            `UPDATE account_option_lots SET exit_price = $3, adjusted = TRUE, updated_at = NOW() WHERE id = $1 AND account_id = $2`,
            [lotId, accountId, px]
        );
    });
}

/** Add a call the member already holds so the exit rules manage it too. Cash is debited like a buy. */
export async function addExistingHolding(
    accountId: number,
    input: { strike: number; expiry: string; contracts: number; price: number; entryDate?: string; underlying?: string }
): Promise<number> {
    await initializeAccountTables();
    const underlying = (input.underlying || 'QQQ').toUpperCase();
    if (underlying !== 'QQQ') throw new LotError('Only QQQ calls are supported');
    const strike = Number(input.strike);
    if (!Number.isInteger(strike) || strike < 50 || strike > 2000) throw new LotError('Strike must be a whole number between 50 and 2000');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.expiry)) throw new LotError('Expiry must be a date like 2028-01-21');
    const days = Math.round((new Date(`${input.expiry}T00:00:00Z`).getTime() - new Date(`${todayET()}T00:00:00Z`).getTime()) / 86400000);
    if (days < 30 || days > 1200) throw new LotError('Expiry must be between 30 days and about 3 years out');
    const contracts = Math.floor(Number(input.contracts));
    if (!(contracts >= 1) || contracts > 100) throw new LotError('Contracts must be a whole number from 1 to 100');
    const px = assertPrice(input.price);
    const entryDate = input.entryDate && /^\d{4}-\d{2}-\d{2}$/.test(input.entryDate) && input.entryDate <= todayET() ? input.entryDate : todayET();

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const acct = await client.query(`SELECT cash_balance FROM accounts WHERE id = $1 FOR UPDATE`, [accountId]);
        if (acct.rows.length === 0) throw new LotError('Account not found');
        const open = await client.query(
            `SELECT COUNT(*)::int AS n FROM account_option_lots WHERE account_id = $1 AND status = 'open'`,
            [accountId]
        );
        if (Number(open.rows[0].n) >= MAX_LOTS_PER_ACCOUNT) {
            throw new LotError(`An account can hold up to ${MAX_LOTS_PER_ACCOUNT} QQQ calls at once`);
        }
        const cost = contracts * px * 100;
        if (Number(acct.rows[0].cash_balance) < cost) {
            throw new LotError(`Not enough virtual cash ($${Number(acct.rows[0].cash_balance).toFixed(0)}) for this position ($${cost.toFixed(0)})`);
        }
        const symbol = buildOptionSymbol(underlying, input.expiry, 'C', strike);
        const activityId = await applyActivity(client, accountId, {
            type: 'buy', symbol, quantity: contracts, price: px, source: 'manual',
            instrument_type: 'option',
            note: `Existing holding added by member: ${contracts} ${underlying} $${strike} Call exp ${input.expiry} at $${px}`,
        });
        const lotId = await createLotFromBuy(client, {
            accountId, symbol, contracts, price: px, modelPrice: px, signalId: null, activityId,
            source: 'manual', entryDate,
        });
        await client.query(`UPDATE account_option_lots SET adjusted = TRUE WHERE id = $1`, [lotId]);
        await client.query('COMMIT');
        return Number(lotId);
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

/** True when an activity belongs to a lot (the general activity editor must not touch it). */
export async function isLotLinkedActivity(accountId: number, activityId: number): Promise<boolean> {
    await initializeAccountTables();
    const res = await query(
        `SELECT 1 FROM account_option_lots WHERE account_id = $1 AND (entry_activity_id = $2 OR exit_activity_id = $2) LIMIT 1`,
        [accountId, activityId]
    );
    return res.rows.length > 0;
}

/**
 * Close lots whose contract has passed its expiry date, at intrinsic value
 * (never below zero). Called by the daily valuation job.
 */
export async function settleExpiredLots(spotByUnderlying: Record<string, number>): Promise<{ settled: number; skipped: number }> {
    await initializeAccountTables();
    const res = await query(
        `SELECT ${LOT_COLUMNS} FROM account_option_lots WHERE status = 'open' AND expiry < (NOW() AT TIME ZONE 'America/New_York')::date`
    );
    let settled = 0;
    let skipped = 0;
    for (const row of res.rows) {
        const lot = rowToLot(row);
        const spot = spotByUnderlying[lot.underlying];
        if (!spot || spot <= 0) { skipped++; continue; }
        const intrinsic = Math.max(0, spot - lot.strike);
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await client.query(`SELECT id FROM accounts WHERE id = $1 FOR UPDATE`, [lot.accountId]);
            const activityId = await applyActivity(client, lot.accountId, {
                type: 'sell', symbol: lot.symbol, quantity: lot.contracts, price: +intrinsic.toFixed(2),
                source: 'signal', signal_id: null, instrument_type: 'option',
                note: `Expired ${lot.expiry}: settled at intrinsic value ${intrinsic.toFixed(2)} (${lot.underlying} ${spot.toFixed(2)} vs strike ${lot.strike})`,
            });
            await closeLot(client, {
                lotId: lot.id, accountId: lot.accountId, price: +intrinsic.toFixed(2), signalId: null, activityId,
                reason: `EXPIRED (settled at intrinsic ${intrinsic.toFixed(2)})`, status: 'expired',
            });
            await client.query('COMMIT');
            settled++;
        } catch (err) {
            await client.query('ROLLBACK');
            console.error(`[Lots] expiry settlement failed for lot ${lot.id}:`, err);
            skipped++;
        } finally {
            client.release();
        }
    }
    return { settled, skipped };
}
