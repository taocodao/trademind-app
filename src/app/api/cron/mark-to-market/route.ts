/**
 * Daily Mark-to-Market Cron Job (account-centric)
 * ================================================
 * Runs once per trading day after the close:
 *   1. settles any QQQ call lot past its expiry date at intrinsic value
 *   2. refreshes the stored mark (mid) of every option contract held
 *   3. snapshots each named account's value (cash + positions at market,
 *      options at mark x 100) into account_pnl_history
 *
 * Trigger: Vercel Cron calls GET with the CRON_SECRET bearer token; POST is
 * kept for manual runs with the same check.
 */

import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import {
    initializeAccountTables,
    getAccountPositions,
    saveAccountPnlSnapshot,
} from '@/lib/accounts';
import { fetchOptionQuote } from '@/lib/account-executor';
import { getOptionMarks, saveOptionMark, settleExpiredLots, todayET } from '@/lib/option-lots';
import { parseOptionSymbol } from '@/lib/option-symbols';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for large account bases

interface MarkToMarketResult {
    accountsProcessed: number;
    snapshotsCreated: number;
    marksRefreshed: number;
    lotsSettled: number;
    errors: string[];
}

const STALE_MARK_MS = 7 * 24 * 3600 * 1000;

async function run(req: Request) {
    // Verify cron secret to prevent unauthorized access
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result: MarkToMarketResult = { accountsProcessed: 0, snapshotsCreated: 0, marksRefreshed: 0, lotsSettled: 0, errors: [] };

    try {
        console.log('[Mark-to-Market] Starting daily account snapshot...');
        await initializeAccountTables();

        // 1. Expiry settlement (needs the underlying's last price).
        const spots = await fetchMarketPrices(['QQQ']);
        const settle = await settleExpiredLots(spots);
        result.lotsSettled = settle.settled;
        if (settle.skipped > 0) result.errors.push(`${settle.skipped} expired lot(s) not settled (no underlying price or error)`);

        // 2. Refresh option marks for every contract still held.
        const optRes = await pool.query(`SELECT DISTINCT symbol FROM account_positions WHERE instrument_type = 'option' AND quantity <> 0`);
        const optionSymbols: string[] = optRes.rows.map((r: any) => r.symbol);
        const existing = await getOptionMarks(optionSymbols);
        for (const sym of optionSymbols) {
            const p = parseOptionSymbol(sym);
            if (!p) continue;
            try {
                const q = await fetchOptionQuote(p.underlying, p.expiry, p.strike, p.right);
                if (q) {
                    await saveOptionMark({ symbol: sym, mid: q.mid, bid: q.bid, ask: q.ask, delta: q.delta, source: 'daily-valuation' });
                    result.marksRefreshed++;
                }
            } catch (err) {
                result.errors.push(`Mark ${sym}: ${err instanceof Error ? err.message : String(err)}`);
            }
        }
        const marks = await getOptionMarks(optionSymbols);

        // 3. Snapshot every account.
        const accountsRes = await pool.query(`SELECT id, name, cash_balance, initial_principal FROM accounts ORDER BY id ASC`);
        const today = todayET();
        console.log(`[Mark-to-Market] Found ${accountsRes.rows.length} accounts to snapshot`);

        for (const account of accountsRes.rows) {
            try {
                const positions = await getAccountPositions(account.id);
                const equitySymbols = positions.filter((p) => p.instrument_type !== 'option').map((p) => p.symbol);
                const prices = equitySymbols.length > 0 ? await fetchMarketPrices(equitySymbols) : {};

                let positionsValue = 0;
                for (const pos of positions) {
                    if (pos.instrument_type === 'option') {
                        const m = marks[pos.symbol] ?? existing[pos.symbol];
                        const fresh = m && Date.now() - new Date(m.asOf).getTime() < STALE_MARK_MS;
                        const px = fresh ? m.mid : pos.avg_price;
                        positionsValue += pos.quantity * px * 100; // options settle per contract (100 shares)
                    } else {
                        positionsValue += pos.quantity * (prices[pos.symbol] || pos.avg_price);
                    }
                }

                // Skip accounts with nothing to report (never funded).
                await saveAccountPnlSnapshot(
                    account.id,
                    today,
                    Number(account.cash_balance),
                    positionsValue,
                    Number(account.initial_principal)
                );
                result.snapshotsCreated++;
                result.accountsProcessed++;
            } catch (err) {
                const msg = `Account ${account.id} (${account.name}): ${err instanceof Error ? err.message : String(err)}`;
                console.error(`[Mark-to-Market] ${msg}`);
                result.errors.push(msg);
            }
        }

        console.log(`[Mark-to-Market] Completed: ${result.snapshotsCreated} snapshots, ${result.marksRefreshed} marks, ${result.lotsSettled} settled, ${result.errors.length} errors`);
        return NextResponse.json({ success: true, ...result });
    } catch (err) {
        console.error('[Mark-to-Market] Fatal error:', err);
        return NextResponse.json(
            { success: false, error: err instanceof Error ? err.message : String(err), ...result },
            { status: 500 }
        );
    }
}

// Vercel Cron issues GET requests.
export async function GET(req: Request) {
    return run(req);
}

export async function POST(req: Request) {
    return run(req);
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
