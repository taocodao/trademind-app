import { createHash } from 'crypto';
import pool from '@/lib/db';
import { previousMarketDay, isEarlyClose } from './calendar';
import { ensureBriefingTables } from './db';
import type { FactsRun, StrategyFacts } from './types';

const ET_DAY = `((created_at AT TIME ZONE 'UTC') AT TIME ZONE 'America/New_York')::date`;

interface Row { id: number; data: any }

async function latestSignal(strategy: string, date: string, actions?: string[]): Promise<Row | null> {
    const params: any[] = [strategy, date];
    let extra = '';
    if (actions) {
        params.push(actions);
        extra = ` AND data->>'action' = ANY($3) AND COALESCE(data->>'rationale','') NOT ILIKE '%test%'`;
    }
    const { rows } = await pool.query(
        `SELECT id, data FROM signals WHERE strategy = $1 AND ${ET_DAY} = $2::date${extra} ORDER BY created_at DESC LIMIT 1`,
        params
    );
    if (!rows[0]) return null;
    const data = typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data;
    return { id: rows[0].id, data };
}

function weightsOf(data: any): StrategyFacts['weights'] {
    const tiers = data?.risk_tiers || {};
    const out: StrategyFacts['weights'] = [];
    for (const level of ['conservative', 'moderate', 'aggressive']) {
        const alloc = tiers[level]?.target_allocation;
        if (!alloc) continue;
        const items = Object.entries(alloc as Record<string, number>)
            .filter(([, v]) => Number(v) > 0)
            .map(([symbol, v]) => ({ symbol, pct: Math.round(Number(v) * 1000) / 10 }))
            .sort((a, b) => b.pct - a.pct);
        out.push({ level, items });
    }
    return out;
}

const sameWeights = (a: StrategyFacts['weights'], b: StrategyFacts['weights']) => JSON.stringify(a) === JSON.stringify(b);

async function defensiveFacts(date: string): Promise<StrategyFacts> {
    const today = await latestSignal('TQQQ_TURBOCORE_PRO', date);
    const base: StrategyFacts = {
        strategy: 'TQQQ_TURBOCORE_PRO', display_name: 'QQQ Defensive', status: 'DELAYED', run_verified: false,
        source_signal_id: null, as_of: null, regime: null, confidence_pct: null, qqq_close: null,
        weights: [], previous_weights_differ: null, instructions: [], gates: [],
    };
    if (!today) return base;
    const d = today.data;
    const prev = await latestSignal('TQQQ_TURBOCORE_PRO', previousMarketDay(date));
    const weights = weightsOf(d);
    if (!weights.length) return { ...base, status: 'RUN_FAILED' };
    const differs = prev ? !sameWeights(weights, weightsOf(prev.data)) : null;
    const close = /QQQ close:\s*([\d.]+)/.exec(String(d.rationale || ''));
    const instructions = differs
        ? weights.map((w) => `${w.level[0].toUpperCase()}${w.level.slice(1)} level model weights: ${w.items.map((i) => `${i.symbol} ${i.pct}%`).join(', ')}`)
        : [];
    return {
        ...base,
        status: differs === null ? 'UNVERIFIED' : differs ? 'CHANGE' : 'NO_CHANGE',
        run_verified: true,
        source_signal_id: String(d.id || today.id),
        as_of: String(d.timestamp || ''),
        regime: d.regime ? String(d.regime) : null,
        confidence_pct: typeof d.confidence === 'number' ? Math.round(d.confidence * 100) : null,
        qqq_close: close ? Number(close[1]) : null,
        weights, previous_weights_differ: differs, instructions,
        gates: [
            { name: 'Market regime', value: String(d.regime ?? 'unknown') },
            { name: '200-day average gate', value: d.sma200_gate ? 'passed' : 'not passed' },
            { name: 'Short-term trend signal', value: d.ema_signal === 1 ? 'positive' : 'not positive' },
        ],
    };
}

async function leapsFacts(date: string): Promise<StrategyFacts> {
    const base: StrategyFacts = {
        strategy: 'QQQ_LEAPS', display_name: 'QQQ LEAPS', status: 'UNVERIFIED', run_verified: false,
        source_signal_id: null, as_of: null, regime: null, confidence_pct: null, qqq_close: null,
        weights: [], previous_weights_differ: null, instructions: [], gates: [],
    };
    const change = await latestSignal('QQQ_LEAPS', date, ['ENTER', 'EXIT', 'ROLL', 'CLOSE']);
    if (change) {
        const d = change.data;
        const legs: any[] = Array.isArray(d.legs) ? d.legs : [];
        const lines = legs.map((l) => {
            const verb = String(l.action || d.action || '').toUpperCase() === 'ENTER' ? 'Buy to open' : 'Close';
            return `${verb} QQQ call, strike ${l.strike}, expiry ${l.expiry}, target delta ${l.delta}. Size to your own plan.`;
        });
        return {
            ...base, status: 'CHANGE', run_verified: true, source_signal_id: String(d.id || change.id),
            as_of: String(d.timestamp || ''), regime: d.regime ? String(d.regime) : null,
            confidence_pct: typeof d.confidence === 'number' ? Math.round(d.confidence * 100) : null,
            instructions: lines.length ? lines : [],
        };
    }
    // No change is only claimed when the engine reported a successful run for the day.
    const { rows } = await pool.query(`SELECT ok FROM engine_heartbeat WHERE strategy = 'QQQ_LEAPS' AND run_date = $1::date`, [date]);
    if (rows[0]?.ok === true) return { ...base, status: 'NO_CHANGE', run_verified: true };
    if (rows[0]?.ok === false) return { ...base, status: 'RUN_FAILED' };
    return base;
}

export async function buildFacts(date: string): Promise<FactsRun> {
    await ensureBriefingTables();
    const strategies = [await leapsFacts(date), await defensiveFacts(date)];
    const def = strategies[1];
    const payload = {
        run_id: `${date}-1500-daily`,
        run_date: date,
        record_type: 'live_model' as const,
        early_close: isEarlyClose(date),
        strategies,
        benchmark: { symbol: 'QQQ' as const, close: def.qqq_close },
        engine_note: 'Facts are read from stored signals. A strategy is called NO_CHANGE only when its run is verified.',
    };
    const hash = createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    return { ...payload, hash };
}

/** Stores the facts for a date once. Later calls return the stored record unchanged. */
export async function lockFacts(date: string): Promise<FactsRun> {
    await ensureBriefingTables();
    const existing = await pool.query(`SELECT payload, hash FROM facts_run WHERE run_date = $1::date`, [date]);
    if (existing.rows[0]) return { ...existing.rows[0].payload, hash: existing.rows[0].hash };
    const facts = await buildFacts(date);
    const { hash, ...payload } = facts;
    await pool.query(
        `INSERT INTO facts_run (run_id, run_date, payload, hash) VALUES ($1, $2::date, $3, $4) ON CONFLICT (run_date) DO NOTHING`,
        [facts.run_id, date, JSON.stringify(payload), hash]
    );
    return facts;
}
