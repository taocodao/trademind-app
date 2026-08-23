/**
 * Daily Mark-to-Market Cron Job (account-centric)
 * ================================================
 * Runs once per day (after market close) to snapshot each NAMED account's NLV
 * and compute P&L vs its initial principal.
 *
 * Populates account_pnl_history for charting and performance tracking.
 *
 * Trigger: Vercel Cron (vercel.json) or manual POST
 */

import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import {
    initializeAccountTables,
    getAccountPositions,
    saveAccountPnlSnapshot,
    type Account,
} from '@/lib/accounts';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for large account bases

interface MarkToMarketResult {
    accountsProcessed: number;
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
        accountsProcessed: 0,
        snapshotsCreated: 0,
        errors: [],
    };

    try {
        console.log('[Mark-to-Market] Starting daily account snapshot...');
        await initializeAccountTables();

        // Get all accounts
        const accountsRes = await pool.query(`SELECT * FROM accounts ORDER BY id ASC`);
        const accounts: Account[] = accountsRes.rows.map((r: any) => ({
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
        }));

        console.log(`[Mark-to-Market] Found ${accounts.length} accounts to snapshot`);
        const today = new Date().toISOString().split('T')[0];

        for (const account of accounts) {
            try {
                const positions = await getAccountPositions(account.id);

                // Compute positions value with live prices
                let positionsValue = 0;
                const symbols = positions.map((p) => p.symbol);
                if (symbols.length > 0) {
                    const prices = await fetchMarketPrices(symbols);
                    for (const pos of positions) {
                        positionsValue += pos.quantity * (prices[pos.symbol] || pos.avg_price);
                    }
                }

                await saveAccountPnlSnapshot(
                    account.id,
                    today,
                    account.cash_balance,
                    positionsValue,
                    account.initial_principal
                );

                result.snapshotsCreated++;
                result.accountsProcessed++;
            } catch (err) {
                const msg = `Account ${account.id} (${account.name}): ${err instanceof Error ? err.message : String(err)}`;
                console.error(`[Mark-to-Market] ${msg}`);
                result.errors.push(msg);
            }
        }

        console.log(`[Mark-to-Market] Completed: ${result.snapshotsCreated} snapshots, ${result.errors.length} errors`);

        return NextResponse.json({ success: true, ...result });
    } catch (err) {
        console.error('[Mark-to-Market] Fatal error:', err);
        return NextResponse.json(
            { success: false, error: err instanceof Error ? err.message : String(err), ...result },
            { status: 500 }
        );
    }
}

async function fetchMarketPrices(symbols: string[]): Promise<Record<string, number>> {
    if (symbols.length === 0) return {};
    try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.trademind.bot';
        const res = await fetch(`${baseUrl}/api/quotes?symbols=${symbols.join(',')}`, { cache: 'no-store' });
        if (res.ok) return await res.json();
    } catch (err) {
        console.warn('[Mark-to-Market] Failed to fetch market prices:', err);
    }
    return {};
}
