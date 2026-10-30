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
import simRecord from '@/data/simulated-record.json';
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

export interface PublicLeg {
    contract: string;
    /** Positive for long, negative for short. */
    quantity: number;
    openedOn: string;
    openingPrice: number;
}

export interface PublicTrade {
    date: string;
    side: 'Buy' | 'Sell';
    instrument: string;
    quantity: number;
    price: number;
    seed: boolean;
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
    /** The two year simulation that came before the virtual account, and the combined view since its start. */
    sim: {
        startDate: string;
        endDate: string;
        startingValue: number;
        endValue: number;
        returnPct: number;
        worstDropPct: number;
        combinedReturnPct: number | null;
        combinedWorstDropPct: number | null;
        combinedSeries: Array<{ date: string; value: number; live: boolean }>;
        /** QQQ buy and hold, same dates and same starting money as combinedSeries. Empty when prices are unavailable. */
        benchmarkSeries: number[];
        benchmarkSimReturnPct: number;
        benchmarkReturnPct: number | null;
        benchmarkWorstDropPct: number | null;
    } | null;
    lots: PublicLot[];
    legs: PublicLeg[];
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

function contractLabel(symbol: string): string {
    const p = parseOptionSymbol(symbol);
    return p ? `${p.underlying} $${p.strike} ${p.right === 'C' ? 'call' : 'put'}, expires ${p.expiry}` : symbol;
}

async function qqqCloses(from: string, to: string): Promise<Record<string, number>> {
    try {
        const p1 = Math.floor(new Date(`${from}T00:00:00Z`).getTime() / 1000) - 86400;
        const p2 = Math.floor(new Date(`${to}T00:00:00Z`).getTime() / 1000) + 86400 * 2;
        const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/QQQ?interval=1d&period1=${p1}&period2=${p2}`, { headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' }, next: { revalidate: 3600 } });
        if (!res.ok) return {};
        const r = (await res.json()).chart?.result?.[0];
        const out: Record<string, number> = {};
        (r?.timestamp ?? []).forEach((t: number, i: number) => {
            const c = r.indicators?.quote?.[0]?.close?.[i];
            if (c != null) out[new Date(t * 1000).toLocaleDateString('en-CA', { timeZone: 'America/New_York' })] = Number(c);
        });
        return out;
    } catch { return {}; }
}

async function buildSim(key: string, live: Array<{ date: string; value: number }>, lastValue: number | null): Promise<PublicAccountRecord['sim']> {
    const sk = key === 'QQQ_LEAPS' ? 'QQQ_LEAPS' : 'QQQ_DEFENSIVE';
    const sim = (simRecord as any).strategies.find((x: any) => x.key === sk);
    if (!sim) return null;
    const daily: Array<{ date: string; value: number }> = sim.daily.map((d: any) => ({ date: d.date, value: Number(d.value) }));
    // The virtual account opens at the simulation's final value, so the first live day replaces the last simulated day.
    const liveFrom = live.length > 0 ? live[0].date : null;
    const simPart = daily.filter((d) => !liveFrom || d.date < liveFrom).map((d) => ({ ...d, live: false }));
    const combinedSeries = [...simPart, ...live.map((d) => ({ ...d, live: true }))];
    let peak = 0, worst = 0;
    for (const p of combinedSeries) { if (p.value > peak) peak = p.value; if (peak > 0) worst = Math.min(worst, (p.value - peak) / peak); }
    const principal = Number(sim.principal);
    // QQQ buy and hold: the simulation's own benchmark, then QQQ closes scaled from the simulation's final benchmark value.
    const simBench = new Map<string, number>(sim.daily.map((d: any) => [d.date, Number(d.benchmark)]));
    const benchEnd = Number(sim.benchmarkFinal);
    const closes = live.length > 0 ? await qqqCloses(sim.end, live[live.length - 1].date) : {};
    const baseClose = closes[sim.end];
    let benchmarkSeries: number[] = [];
    let carry = principal;
    let okBench = true;
    for (const p of combinedSeries) {
        if (!p.live) { carry = simBench.get(p.date) ?? carry; benchmarkSeries.push(carry); }
        else if (baseClose && closes[p.date]) { carry = benchEnd * (closes[p.date] / baseClose); benchmarkSeries.push(carry); }
        else if (baseClose) benchmarkSeries.push(carry);
        else okBench = false;
    }
    if (!okBench) benchmarkSeries = [];
    let bpeak = 0, bworst = 0;
    for (const v of benchmarkSeries) { if (v > bpeak) bpeak = v; if (bpeak > 0) bworst = Math.min(bworst, (v - bpeak) / bpeak); }
    const benchLast = benchmarkSeries.length ? benchmarkSeries[benchmarkSeries.length - 1] : null;
    return {
        startDate: sim.start,
        endDate: sim.end,
        startingValue: principal,
        endValue: Number(sim.finalValue),
        returnPct: Number(sim.pnlPct),
        worstDropPct: Number(sim.maxDrawdownPct),
        combinedReturnPct: lastValue != null ? ((lastValue - principal) / principal) * 100 : null,
        combinedWorstDropPct: live.length > 0 ? worst * 100 : null,
        combinedSeries,
        benchmarkSeries,
        benchmarkSimReturnPct: Number(sim.benchmarkPct),
        benchmarkReturnPct: benchLast != null ? ((benchLast - principal) / principal) * 100 : null,
        benchmarkWorstDropPct: benchLast != null ? bworst * 100 : null,
    };
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
                        contract: contractLabel(String(r.symbol)),
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

            // Other open option legs (written calls, spreads) that are not managed as lots.
            let legs: PublicLeg[] = [];
            if (s.key === 'QQQ_LEAPS') {
                const lg = await query(
                    `SELECT p.symbol, p.quantity, p.avg_price,
                            (SELECT to_char(MIN(${ET_DATE}), 'YYYY-MM-DD') FROM account_activities a WHERE a.account_id = p.account_id AND a.symbol = p.symbol) AS opened
                     FROM account_positions p
                     WHERE p.account_id = $1 AND p.instrument_type = 'option' AND p.quantity <> 0
                       AND p.symbol NOT IN (SELECT symbol FROM account_option_lots WHERE account_id = $1 AND status = 'open')
                     ORDER BY p.symbol`,
                    [id]
                );
                legs = lg.rows
                    .filter((r: any) => r.opened && r.opened <= cutoff)
                    .map((r: any) => ({ contract: contractLabel(r.symbol), quantity: Number(r.quantity), openedOn: r.opened, openingPrice: Number(r.avg_price) }));
            }

            const tr = await query(
                `SELECT to_char(${ET_DATE}, 'YYYY-MM-DD') AS d, type, symbol, quantity, price, (COALESCE(note, '') ILIKE '%seeded%') AS seed
                 FROM account_activities
                 WHERE account_id = $1 AND type IN ('buy', 'sell') AND symbol IS NOT NULL AND ${ET_DATE} <= $2::date
                 ORDER BY created_at DESC, id DESC LIMIT 100`,
                [id, cutoff]
            );
            const trades: PublicTrade[] = tr.rows.map((r: any) => {
                return {
                    date: r.d,
                    side: r.type === 'buy' ? 'Buy' : 'Sell',
                    instrument: contractLabel(String(r.symbol)),
                    quantity: Number(r.quantity),
                    price: Number(r.price),
                    seed: !!r.seed,
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
                sim: await buildSim(s.key, series, last ? last.value : null),
                lots,
                legs,
                trades,
                heldBackEvents: Number(held.rows[0].n),
            });
        }
    }

    return { delayDays: PUBLIC_DELAY_DAYS, cutoff, generatedAt: new Date().toISOString(), accounts: out };
}
