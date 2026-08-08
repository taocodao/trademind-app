/**
 * Daily Mark-to-Market Cron Job
 * =============================
 * Runs once per day (after market close) to snapshot each user's virtual
 * account NLV and compute P&L vs their initial principal.
 *
 * Populates virtual_pnl_history for charting and performance tracking.
 *
 * Trigger: Vercel Cron (vercel.json) or manual POST
 */

import { NextResponse } from 'next/server';
import pool, { saveVirtualPnlSnapshot } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for large user bases

interface MarkToMarketResult {
    usersProcessed: number;
    snapshotsCreated: number;
    errors: string[];
}

export async function POST(req: Request) {
    // Verify cron secret to prevent unauthorized access
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result: MarkToMarketResult = {
        usersProcessed: 0,
        snapshotsCreated: 0,
        errors: [],
    };

    try {
        console.log('[Mark-to-Market] Starting daily snapshot...');

        // Get all users with virtual accounts
        const usersRes = await pool.query(
            `SELECT DISTINCT user_id, strategy FROM virtual_accounts WHERE initial_principal IS NOT NULL`
        );

        console.log(`[Mark-to-Market] Found ${usersRes.rows.length} user-strategy pairs to snapshot`);

        const today = new Date().toISOString().split('T')[0];

        for (const row of usersRes.rows) {
            const { user_id, strategy } = row;

            try {
                // Fetch current state
                const [balanceRes, positionsRes, principalRes] = await Promise.all([
                    pool.query(
                        `SELECT cash_balance FROM virtual_accounts WHERE user_id = $1 AND strategy = $2`,
                        [user_id, strategy]
                    ),
                    pool.query(
                        `SELECT symbol, quantity, avg_price FROM shadow_positions WHERE user_id = $1 AND strategy = $2`,
                        [user_id, strategy]
                    ),
                    pool.query(
                        `SELECT initial_principal FROM virtual_accounts WHERE user_id = $1 AND strategy = $2`,
                        [user_id, strategy]
                    ),
                ]);

                const cashBalance = parseFloat(balanceRes.rows[0]?.cash_balance || '0');
                const principal = principalRes.rows[0]?.initial_principal
                    ? parseFloat(principalRes.rows[0].initial_principal)
                    : null;

                // Compute positions value (need live prices)
                let positionsValue = 0;
                const symbols = positionsRes.rows.map(r => r.symbol);

                if (symbols.length > 0) {
                    const prices = await fetchMarketPrices(symbols);
                    for (const pos of positionsRes.rows) {
                        const price = prices[pos.symbol] || parseFloat(pos.avg_price);
                        positionsValue += parseFloat(pos.quantity) * price;
                    }
                }

                // Save snapshot
                await saveVirtualPnlSnapshot(
                    user_id,
                    strategy,
                    today,
                    cashBalance,
                    positionsValue,
                    principal
                );

                result.snapshotsCreated++;
                result.usersProcessed++;

            } catch (err) {
                const msg = `User ${user_id} strategy ${strategy}: ${err instanceof Error ? err.message : String(err)}`;
                console.error(`[Mark-to-Market] ${msg}`);
                result.errors.push(msg);
            }
        }

        console.log(`[Mark-to-Market] Completed: ${result.snapshotsCreated} snapshots created, ${result.errors.length} errors`);

        return NextResponse.json({
            success: true,
            ...result,
        });

    } catch (err) {
        console.error('[Mark-to-Market] Fatal error:', err);
        return NextResponse.json(
            {
                success: false,
                error: err instanceof Error ? err.message : String(err),
                ...result,
            },
            { status: 500 }
        );
    }
}

async function fetchMarketPrices(symbols: string[]): Promise<Record<string, number>> {
    if (symbols.length === 0) return {};
    try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.trademind.bot';
        const res = await fetch(
            `${baseUrl}/api/quotes?symbols=${symbols.join(',')}`,
            { cache: 'no-store' }
        );
        if (res.ok) return await res.json();
    } catch (err) {
        console.warn('[Mark-to-Market] Failed to fetch market prices:', err);
    }
    return {};
}
