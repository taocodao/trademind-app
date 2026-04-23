import { NextResponse } from 'next/server';

/**
 * PUBLIC endpoint — returns 5-day delayed virtual portfolio summary
 * for all 3 strategies (TurboCore, TurboCore Pro, QQQ LEAPS).
 * No authentication required.
 *
 * If the DB table doesn't exist yet (first run), returns hardcoded placeholder data.
 */

const DISPLAY_NAMES: Record<string, string> = {
    TQQQ_TURBOCORE: 'TurboCore',
    TURBOCORE_PRO:  'TurboCore Pro',
    QQQ_LEAPS:      'QQQ LEAPS',
};

const INITIAL_PRINCIPALS: Record<string, number> = {
    TQQQ_TURBOCORE: 5_000,
    TURBOCORE_PRO:  25_000,
    QQQ_LEAPS:      25_000,
};

// Strategy sort order for display
const STRATEGY_ORDER = ['TQQQ_TURBOCORE', 'TURBOCORE_PRO', 'QQQ_LEAPS'];

// Cache in-memory for 5 minutes to avoid hammering DB on every scroll
let _cache: { data: unknown; ts: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function GET() {
    // --- Return from cache if fresh ---
    if (_cache && Date.now() - _cache.ts < CACHE_TTL_MS) {
        return NextResponse.json(_cache.data, {
            headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' }
        });
    }

    try {
        const { query } = await import('@/lib/db');

        // Check if table exists and has data
        const tableCheck = await query(`
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables
                WHERE table_name = 'virtual_portfolio_snapshots'
            ) AS exists
        `);

        if (!tableCheck.rows[0]?.exists) {
            return _placeholder();
        }

        const result = await query(`
            SELECT strategy, name, initial, nav, total_return, cagr, max_drawdown,
                   trade_count, inception_date, last_data_date, nav_history,
                   delay_days, generated_at, data_through
            FROM virtual_portfolio_snapshots
            ORDER BY strategy
        `);

        if (result.rows.length === 0) {
            return _placeholder();
        }

        // Build response in fixed display order
        const rowMap: Record<string, typeof result.rows[0]> = {};
        for (const row of result.rows) {
            rowMap[row.strategy] = row;
        }

        const accounts = STRATEGY_ORDER.map((strat) => {
            const row = rowMap[strat];
            if (!row) {
                // Placeholder for a strategy not yet seeded
                return {
                    strategy:     strat,
                    name:         DISPLAY_NAMES[strat] ?? strat,
                    initial:      INITIAL_PRINCIPALS[strat] ?? 25000,
                    nav:          INITIAL_PRINCIPALS[strat] ?? 25000,
                    total_return: 0,
                    cagr:         0,
                    max_drawdown: 0,
                    trade_count:  0,
                    inception_date: null,
                    last_data_date: null,
                    nav_history:  [],
                    is_placeholder: true,
                };
            }
            return {
                strategy:      row.strategy,
                name:          row.name ?? DISPLAY_NAMES[row.strategy] ?? row.strategy,
                initial:       parseFloat(row.initial),
                nav:           parseFloat(row.nav),
                total_return:  parseFloat(row.total_return),
                cagr:          parseFloat(row.cagr),
                max_drawdown:  parseFloat(row.max_drawdown),
                trade_count:   parseInt(row.trade_count),
                inception_date: row.inception_date,
                last_data_date: row.last_data_date,
                nav_history:   typeof row.nav_history === 'string'
                                   ? JSON.parse(row.nav_history)
                                   : row.nav_history ?? [],
                is_placeholder: false,
            };
        });

        const latestRow = result.rows[0];
        const response = {
            accounts,
            delay_days:   latestRow.delay_days ?? 5,
            generated_at: latestRow.generated_at,
            data_through: latestRow.data_through,
        };

        _cache = { data: response, ts: Date.now() };
        return NextResponse.json(response, {
            headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' }
        });

    } catch (error) {
        console.error('[portfolio-summary] DB error:', error);
        return _placeholder();
    }
}

/** Returns placeholder data when DB is not yet seeded. */
function _placeholder() {
    const placeholder = {
        accounts: STRATEGY_ORDER.map((strat) => ({
            strategy:      strat,
            name:          DISPLAY_NAMES[strat],
            initial:       INITIAL_PRINCIPALS[strat],
            nav:           INITIAL_PRINCIPALS[strat],
            total_return:  0,
            cagr:          0,
            max_drawdown:  0,
            trade_count:   0,
            inception_date: null,
            last_data_date: null,
            nav_history:   [],
            is_placeholder: true,
        })),
        delay_days:   5,
        generated_at: new Date().toISOString(),
        data_through: null,
    };
    return NextResponse.json(placeholder, {
        headers: { 'Cache-Control': 'public, s-maxage=60' }
    });
}
