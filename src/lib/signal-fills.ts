/**
 * Signal fill confirmations.
 *
 * Members enter every order at their own broker. When they report their fill,
 * the virtual account re-prices the signal's ledger rows to the reported price
 * (the member decides filled/not-filled and the price; structure, quantity,
 * and instrument always come from the signal and the virtual position).
 *
 * The system price is preserved inside fill_details so a confirmation can be
 * undone and the audit trail shows model vs member prices.
 */

import pool from '@/lib/db';

export interface SignalFillInput {
    activityId: number;
    price: number;
}

export interface StoredFill {
    activityId: number;
    symbol: string | null;
    type: 'buy' | 'sell';
    quantity: number;
    sysPrice: number;
    userPrice: number;
    note: string | null;
}

/**
 * Re-price an executed signal's trade rows to the member-reported fill prices.
 * Refuses signals that are not in 'executed' status or already confirmed.
 */
export async function confirmSignalFill(
    accountId: number,
    signalId: string,
    fills: SignalFillInput[],
    note?: string | null
): Promise<{ ok: boolean; error?: string }> {
    if (!fills.length) return { ok: false, error: 'No fills provided' };
    for (const f of fills) {
        const p = Number(f.price);
        if (!Number.isInteger(f.activityId) || f.activityId <= 0) return { ok: false, error: 'Invalid activity reference' };
        if (!isFinite(p) || p <= 0 || p > 100000) return { ok: false, error: 'Fill price must be between 0 and 100,000' };
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query(`SELECT id FROM accounts WHERE id = $1 FOR UPDATE`, [accountId]);

        const sig = await client.query(
            `SELECT status, confirmed_at FROM account_signals WHERE account_id = $1 AND signal_id = $2`,
            [accountId, signalId]
        );
        if (sig.rows.length === 0) throw new FillError('Signal not delivered to this account');
        if (sig.rows[0].status !== 'executed') throw new FillError('Only executed signals can be confirmed');
        if (sig.rows[0].confirmed_at) throw new FillError('This signal already has a reported fill. Undo it first to change prices.');

        const acts = await client.query(
            `SELECT id, type, symbol, quantity, price, amount, note
             FROM account_activities
             WHERE account_id = $1 AND signal_id = $2 AND source = 'signal' AND type IN ('buy','sell')`,
            [accountId, signalId]
        );
        const byId = new Map<number, any>(acts.rows.map((r: any) => [Number(r.id), r]));

        let cashDelta = 0;
        const stored: StoredFill[] = [];
        for (const f of fills) {
            const row = byId.get(f.activityId);
            if (!row) throw new FillError('Fill references an order that does not belong to this signal');
            const qty = Number(row.quantity);
            const sysPrice = Number(row.price);
            const mult = isOptionSymbol(row.symbol) ? 100 : 1;
            const oldAmount = qty * sysPrice * mult;
            const newAmount = +(qty * f.price * mult).toFixed(2);
            const diff = newAmount - oldAmount;
            cashDelta += row.type === 'buy' ? -diff : diff;

            const stampedNote = `${row.note || row.symbol || 'Signal order'} | Member fill $${f.price} (model $${sysPrice})`;
            await client.query(
                `UPDATE account_activities SET price = $3, amount = $4, note = $5 WHERE id = $1 AND account_id = $2`,
                [f.activityId, accountId, f.price, newAmount, stampedNote]
            );
            stored.push({
                activityId: f.activityId,
                symbol: row.symbol,
                type: row.type,
                quantity: qty,
                sysPrice,
                userPrice: f.price,
                note: row.note,
            });
        }

        if (cashDelta !== 0) {
            await client.query(
                `UPDATE accounts SET cash_balance = cash_balance + $2, updated_at = NOW() WHERE id = $1`,
                [accountId, cashDelta]
            );
        }

        await client.query(
            `UPDATE account_signals SET confirmed_at = NOW(), fill_details = $3, fill_note = $4
             WHERE account_id = $1 AND signal_id = $2`,
            [accountId, signalId, JSON.stringify(stored), note?.slice(0, 500) ?? null]
        );

        await client.query('COMMIT');
        return { ok: true };
    } catch (err) {
        await client.query('ROLLBACK');
        if (err instanceof FillError) return { ok: false, error: err.message };
        throw err;
    } finally {
        client.release();
    }
}

/**
 * Undo a fill confirmation: restore every leg's system price (and original
 * note), correct cash back, and return the card to the "open" state.
 */
export async function clearSignalFillConfirmation(
    accountId: number,
    signalId: string
): Promise<{ ok: boolean; error?: string }> {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query(`SELECT id FROM accounts WHERE id = $1 FOR UPDATE`, [accountId]);

        const sig = await client.query(
            `SELECT status, confirmed_at, fill_details FROM account_signals WHERE account_id = $1 AND signal_id = $2`,
            [accountId, signalId]
        );
        if (sig.rows.length === 0 || !sig.rows[0].confirmed_at || !sig.rows[0].fill_details) {
            throw new FillError('No reported fill to undo');
        }
        const stored: StoredFill[] = typeof sig.rows[0].fill_details === 'string'
            ? JSON.parse(sig.rows[0].fill_details)
            : sig.rows[0].fill_details;

        let cashDelta = 0;
        for (const f of stored) {
            const cur = await client.query(
                `SELECT id, symbol, quantity, price FROM account_activities WHERE id = $1 AND account_id = $2`,
                [f.activityId, accountId]
            );
            if (cur.rows.length === 0) continue;
            const row = cur.rows[0];
            const mult = isOptionSymbol(row.symbol) ? 100 : 1;
            const qty = Number(row.quantity);
            const oldAmount = qty * Number(row.price) * mult;
            const newAmount = +(qty * f.sysPrice * mult).toFixed(2);
            const diff = newAmount - oldAmount;
            cashDelta += f.type === 'buy' ? -diff : diff;

            await client.query(
                `UPDATE account_activities SET price = $3, amount = $4, note = $5 WHERE id = $1 AND account_id = $2`,
                [f.activityId, accountId, f.sysPrice, newAmount, f.note]
            );
        }

        if (cashDelta !== 0) {
            await client.query(
                `UPDATE accounts SET cash_balance = cash_balance + $2, updated_at = NOW() WHERE id = $1`,
                [accountId, cashDelta]
            );
        }

        await client.query(
            `UPDATE account_signals SET confirmed_at = NULL, fill_details = NULL, fill_note = NULL
             WHERE account_id = $1 AND signal_id = $2`,
            [accountId, signalId]
        );

        await client.query('COMMIT');
        return { ok: true };
    } catch (err) {
        await client.query('ROLLBACK');
        if (err instanceof FillError) return { ok: false, error: err.message };
        throw err;
    } finally {
        client.release();
    }
}

class FillError extends Error {}

/** account_activities has no instrument_type column (only positions carry
 *  it); option rows are recognized by their OCC-style contract symbol. */
export function isOptionSymbol(symbol: string | null | undefined): boolean {
    if (!symbol) return false;
    return /^[A-Z.]+_\d{8}[CP]\d/.test(symbol) || /^[A-Z.]+_?\d{4}-\d{2}-\d{2}[CP]\d/.test(symbol);
}
