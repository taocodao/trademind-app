/**
 * Public live record
 * ==================
 * The public track record is a real TradeMind virtual account that follows the
 * published signals exactly like a member account does (signal, fan-out, virtual
 * fill, 9:45 AM exit checks). It is NOT the old EC2 model portfolio.
 *
 * Source account: PUBLIC_RECORD_ACCOUNT_ID (default 18, eric@trademind.bot). Every
 * other account of the same owner is included by strategy, so adding a QQQ Basic
 * subscription to that login extends the record with no code change.
 *
 * Privacy and edge protection: only events at least PUBLIC_DELAY_DAYS old are
 * shown, nothing identifies the owner, and no account ids or emails leave this file.
 */

import { query } from '@/lib/db';
import { initializeAccountTables } from '@/lib/accounts';
import { todayET } from '@/lib/option-lots';
import { parseOptionSymbol } from '@/lib/option-symbols';

export const PUBLIC_DELAY_DAYS = 5;
const SOURCE_ACCOUNT_ID = Number(process.env.PUBLIC_RECORD_ACCOUNT_ID || 18);

const STRATEGIES: Array<{ key: string; name: string }> = [
    { key: 'QQQ_LEAPS', name: 'QQQ LEAPS' },
    { key: 'TQQQ_TURBOCORE_PRO', name: 'QQQ Defensive' },
];

export interface PublicLot {
    contract: string;
    contracts: number;
    entryDate: string;
    entryPrice: number;
    exitDate: string | null;
    exitPrice: number | null;
    exitReason: string | null;
    open: boolean;
}

export interface PublicTrade {
    date: string;
    side: 'Buy' | 'Sell';
    instrument: string;
    quantity: number;
    price: number;
}

export interface PublicAccountRecord {
    strategy: string;
    name: string;
    startDate: string;
    startingValue: number;
    dataThrough: string | null;
    firstVisibleOn: string | null;
    value: number | null;
    returnPct: number | null;
    worstDropPct: number | null;
    series: Array<{ date: string; value: number }>;
    lots: PublicLot[];
    trades: PublicTrade[];
    heldBackEvents: number;
}

export interface PublicRecord {
    delayDays: number;
    cutoff: string;
    generatedAt: string;
    accounts: PublicAccountRecord[];
}

function addDays(dateStr: string, n: number): string {
    const d = new Date(`${dateStr}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
}

const ET_DATE = `(created_at AT TIME ZONE 'America/New_York')::date`;

export async function getPublicRecord(): Promise<PublicRecord> {
    await initializeAccountTables();
    const cutoff = addDays(todayET(), -PUBLIC_DELAY_DAYS);

    const owner = await query(`SELECT user_id FROM accounts WHERE id = $1`, [SOURCE_ACCOUNT_ID]);
    const userId: string | undefined = owner.rows[0]?.user_id;
    const out: PublicAccountRecord[] = [];

    if (userId) {
        for (const s of STRATEGIES) {
            const acc = await query(
                `SELECT id, initial_principal, to_char((created_at AT TIME ZONE 'America/New_York')::date, 'YYYY-MM-DD') AS start_date
                 FROM accounts WHERE user_id = $1 AND strategy = $2 AND COALESCE(status, 'active') <> 'deleted'
                 ORDER BY id ASC LIMIT 1`,
                [userId, s.key]
            );
            if (acc.rows.length === 0) continue;
            const id = Number(acc.rows[0].id);
            const startDate: string = acc.rows[0].start_date;
            const initial = Number(acc.rows[0].initial_principal);

            const hist = await query(
                `SELECT to_char(snapshot_date, 'YYYY-MM-DD') AS d, nlv FROM account_pnl_history
                 WHERE account_id = $1 ORDER BY snapshot_date ASC`,
                [id]
            );
            const allSeries = hist.rows.map((r: any) => ({ date: r.d as string, value: Number(r.nlv) }));
            const series = allSeries.filter((p) => p.date <= cutoff);
            const firstVisibleOn = allSeries.length > 0 ? addDays(allSeries[0].date, PUBLIC_DELAY_DAYS) : null;

            // Money put in and taken out after the first day must not count as return.
            const flows = await query(
                `SELECT COALESCE(SUM(CASE WHEN type = 'deposit' THEN amount WHEN type = 'withdraw' THEN -amount ELSE 0 END), 0) AS net
                 FROM account_activities WHERE account_id = $1 AND ${ET_DATE} <= $2::date`,
                [id, cutoff]
            );
            const base = Number(flows.rows[0].net) > 0 ? Number(flows.rows[0].net) : initial;

            let peak = 0;
            let worst = 0;
            for (const p of series) {
                if (p.value > peak) peak = p.value;
                if (peak > 0) worst = Math.min(worst, (p.value - peak) / peak);
            }
            const last = series.length > 0 ? series[series.length - 1] : null;

            let lots: PublicLot[] = [];
            if (s.key === 'QQQ_LEAPS') {
                const lr = await query(
                    `SELECT symbol, contracts, status, entry_price, exit_price, exit_reason,
                            to_char(entry_date, 'YYYY-MM-DD') AS entry_date, to_char(exit_date, 'YYYY-MM-DD') AS exit_date
                     FROM account_option_lots
                     WHERE account_id = $1 AND status IN ('open', 'closed', 'expired') AND entry_date <= $2::date
                     ORDER BY entry_date DESC, id DESC`,
                    [id, cutoff]
                );
                lots = lr.rows.map((r: any) => {
                    const p = parseOptionSymbol(r.symbol);
                    const exitedInView = r.exit_date && r.exit_date <= cutoff;
                    return {
                        contract: p ? `QQQ $${p.strike} call, expires ${p.expiry}` : String(r.symbol),
                        contracts: Number(r.contracts),
                        entryDate: r.entry_date,
                        entryPrice: Number(r.entry_price),
                        exitDate: exitedInView ? r.exit_date : null,
                        exitPrice: exitedInView && r.exit_price != null ? Number(r.exit_price) : null,
                        exitReason: exitedInView ? r.exit_reason : null,
                        open: !exitedInView,
                    };
                });
            }

            const tr = await query(
                `SELECT to_char(${ET_DATE}, 'YYYY-MM-DD') AS d, type, symbol, quantity, price
                 FROM account_activities
                 WHERE account_id = $1 AND type IN ('buy', 'sell') AND symbol IS NOT NULL AND ${ET_DATE} <= $2::date
                 ORDER BY created_at DESC, id DESC LIMIT 100`,
                [id, cutoff]
            );
            const trades: PublicTrade[] = tr.rows.map((r: any) => {
                const p = parseOptionSymbol(r.symbol);
                return {
                    date: r.d,
                    side: r.type === 'buy' ? 'Buy' : 'Sell',
                    instrument: p ? `QQQ $${p.strike} call, expires ${p.expiry}` : String(r.symbol),
                    quantity: Number(r.quantity),
                    price: Number(r.price),
                };
            });

            const held = await query(
                `SELECT COUNT(*)::int AS n FROM account_activities
                 WHERE account_id = $1 AND type IN ('buy', 'sell') AND ${ET_DATE} > $2::date`,
                [id, cutoff]
            );

            out.push({
                strategy: s.key,
                name: s.name,
                startDate,
                startingValue: initial,
                dataThrough: last?.date ?? null,
                firstVisibleOn,
                value: last ? last.value : null,
                returnPct: last && base > 0 ? ((last.value - base) / base) * 100 : null,
                worstDropPct: series.length > 1 ? worst * 100 : null,
                series: series.slice(-400),
                lots,
                trades,
                heldBackEvents: Number(held.rows[0].n),
            });
        }
    }

    return { delayDays: PUBLIC_DELAY_DAYS, cutoff, generatedAt: new Date().toISOString(), accounts: out };
}
