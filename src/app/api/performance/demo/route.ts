import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const DELAY_DAYS = 3; // Show data 3 trading days old

/**
 * Public API — no auth required.
 * Returns the demo portfolio performance with a 3-day delay.
 * Used on the marketing/landing page to show live strategy track record.
 */
export async function GET() {
    try {
        // Publish any records that are now old enough (> DELAY_DAYS trading days)
        // A "trading day" = weekday; we use calendar days as a conservative proxy
        await pool.query(`
            UPDATE demo_performance
            SET published_at = NOW()
            WHERE published_at IS NULL
              AND trade_date <= CURRENT_DATE - INTERVAL '${DELAY_DAYS} days'
        `);

        // Fetch published records for both demo accounts
        const res = await pool.query(`
            SELECT
                account_id,
                trade_date,
                portfolio_nlv,
                cash_balance,
                day_pnl,
                pct_return,
                strategy_mode
            FROM demo_performance
            WHERE published_at IS NOT NULL
            ORDER BY account_id, trade_date ASC
        `);

        const rows: any[] = res.rows;

        // Split by account and build response
        const coreRows = rows.filter(r => r.account_id === 'demo_turbocore_core');
        const proRows  = rows.filter(r => r.account_id === 'demo_turbocore_pro');

        const buildSummary = (
            accountRows: any[],
            startingBalance: number,
            label: string
        ) => {
            if (accountRows.length === 0) {
                return {
                    label,
                    startingBalance,
                    currentNlv: startingBalance,
                    totalReturnPct: 0,
                    totalReturnDollar: 0,
                    dayCount: 0,
                    history: [],
                };
            }

            const latest = accountRows[accountRows.length - 1];
            const currentNlv = parseFloat(latest.portfolio_nlv);
            const totalReturnDollar = currentNlv - startingBalance;
            const totalReturnPct = (totalReturnDollar / startingBalance) * 100;

            // Compute win/loss streaks and max drawdown
            let maxNlv = startingBalance;
            let maxDrawdownPct = 0;
            let winDays = 0;
            let lossDays = 0;

            const history = accountRows.map(r => {
                const nlv = parseFloat(r.portfolio_nlv);
                if (nlv > maxNlv) maxNlv = nlv;
                const drawdown = ((maxNlv - nlv) / maxNlv) * 100;
                if (drawdown > maxDrawdownPct) maxDrawdownPct = drawdown;

                const dayPnl = parseFloat(r.day_pnl || '0');
                if (dayPnl > 0) winDays++;
                else if (dayPnl < 0) lossDays++;

                return {
                    date: r.trade_date,
                    nlv: Math.round(nlv * 100) / 100,
                    dayPnl: Math.round(dayPnl * 100) / 100,
                    pctReturn: parseFloat(r.pct_return || '0'),
                    mode: r.strategy_mode,
                };
            });

            return {
                label,
                startingBalance,
                currentNlv: Math.round(currentNlv * 100) / 100,
                totalReturnPct:    Math.round(totalReturnPct * 100) / 100,
                totalReturnDollar: Math.round(totalReturnDollar * 100) / 100,
                maxDrawdownPct:    Math.round(maxDrawdownPct * 100) / 100,
                winDays,
                lossDays,
                winRate: winDays + lossDays > 0
                    ? Math.round((winDays / (winDays + lossDays)) * 10000) / 100
                    : 0,
                dayCount: history.length,
                history,
            };
        };

        return NextResponse.json({
            core: buildSummary(coreRows, 5000,  'TurboCore'),
            pro:  buildSummary(proRows,  25000, 'TurboCore Pro'),
            dataDelayDays: DELAY_DAYS,
            disclaimer: 'Past performance does not guarantee future results. Data delayed 3 trading days.',
        });

    } catch (err: any) {
        console.error('[Performance API] Error:', err);
        return NextResponse.json({ error: 'Failed to fetch performance data' }, { status: 500 });
    }
}
