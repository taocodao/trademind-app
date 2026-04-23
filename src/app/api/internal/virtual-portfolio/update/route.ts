import { NextResponse } from 'next/server';

/**
 * Internal endpoint: receives daily virtual portfolio snapshot from EC2.
 * EC2 pushes a JSON object with all 3 strategy NAV histories (5-day delayed).
 * We store it in the virtual_portfolio_snapshots table for the landing page.
 *
 * Auth: INTERNAL_API_SECRET bearer token (same as Ghost Executor).
 */
export async function POST(req: Request) {
    // --- Auth check ---
    const authHeader = req.headers.get('Authorization') || '';
    const secret = process.env.INTERNAL_API_SECRET;
    if (!secret || authHeader !== `Bearer ${secret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { accounts, delay_days, generated_at, data_through } = body;

        if (!accounts || !Array.isArray(accounts)) {
            return NextResponse.json({ error: 'Invalid payload: missing accounts array' }, { status: 400 });
        }

        // Upsert into DB: one row per strategy (keyed by strategy name)
        const { query } = await import('@/lib/db');

        // Ensure table exists
        await query(`
            CREATE TABLE IF NOT EXISTS virtual_portfolio_snapshots (
                strategy        VARCHAR(64) PRIMARY KEY,
                name            VARCHAR(128),
                initial         NUMERIC(15,2),
                nav             NUMERIC(15,2),
                total_return    NUMERIC(10,4),
                cagr            NUMERIC(10,4),
                max_drawdown    NUMERIC(10,4),
                trade_count     INTEGER DEFAULT 0,
                inception_date  DATE,
                last_data_date  DATE,
                nav_history     JSONB,
                delay_days      INTEGER DEFAULT 5,
                generated_at    TIMESTAMPTZ,
                data_through    DATE,
                updated_at      TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        for (const acct of accounts) {
            await query(`
                INSERT INTO virtual_portfolio_snapshots (
                    strategy, name, initial, nav, total_return, cagr, max_drawdown,
                    trade_count, inception_date, last_data_date, nav_history,
                    delay_days, generated_at, data_through, updated_at
                ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14, NOW())
                ON CONFLICT (strategy) DO UPDATE SET
                    name            = $2,
                    initial         = $3,
                    nav             = $4,
                    total_return    = $5,
                    cagr            = $6,
                    max_drawdown    = $7,
                    trade_count     = $8,
                    inception_date  = $9,
                    last_data_date  = $10,
                    nav_history     = $11,
                    delay_days      = $12,
                    generated_at    = $13,
                    data_through    = $14,
                    updated_at      = NOW()
            `, [
                acct.strategy,
                acct.name,
                acct.initial,
                acct.nav,
                acct.total_return,
                acct.cagr,
                acct.max_drawdown,
                acct.trade_count,
                acct.inception_date || null,
                acct.last_data_date || null,
                JSON.stringify(acct.nav_history || []),
                delay_days ?? 5,
                generated_at || new Date().toISOString(),
                data_through || null,
            ]);
        }

        return NextResponse.json({ success: true, strategies_updated: accounts.length });

    } catch (error) {
        console.error('[virtual-portfolio/update] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
