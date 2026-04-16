/**
 * Options Exit Scanner
 * ====================
 * Evaluates whether existing options positions should be closed before
 * new entries are placed. Called by the Ghost Executor for each user
 * before generating new entry orders.
 *
 * Exit conditions mirrored from EC2's check_exits() in daily_order_generator.py:
 *   CSP   (TQQQ short put,  7 DTE):  50% profit, 3× stop, expiry, mode→C/D2
 *   ZEBRA (QQQM call spread, 75 DTE): 50% profit, DTE ≤ 21 time-stop
 *   CCS   (QQQ call spread,  45 DTE): 50% profit, 3× stop, expiry
 *   SQQQ  (equity shares):            30% profit, VIX contango, mode→A/B/D3
 *
 * Pricing strategy (no IB Gateway on Vercel):
 *   TT-linked users:  Tastytrade /accounts/:id/positions 'close-price' (broker mid)
 *   Virtual-only:     shadow_positions avg_price as entry, 0 as current (conservative)
 */

import pool from '@/lib/db';
import { OptionsIntent } from '@/lib/per-user-order-generator';

const TASTYTRADE_API_BASE = 'https://api.tastyworks.com';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CloseLeg {
    action: 'Buy to Close' | 'Sell to Close' | 'Sell';
    symbol: string;
    quantity: number;
    instrumentType: 'Equity Option' | 'Equity';
    /** Human-readable instruction for email / UI */
    instruction: string;
    reason: string;
}

export interface ExistingPositionCounts {
    cspCount: number;
    zebraUnits: number;
    ccsCount: number;
    sqqqShares: number;
}

export interface ExitScanResult {
    closeLegs: CloseLeg[];
    /** Position counts AFTER proposed closes — used for entry guard */
    existingPositions: ExistingPositionCounts;
}

interface RawTTPosition {
    symbol: string;
    instrumentType: string;
    quantity: number;
    quantityDirection: 'Long' | 'Short';
    underlyingSymbol: string;
    optionType: 'C' | 'P' | null;
    strikePrice: number;
    expirationDate: string;     // YYYY-MM-DD
    closePrice: number;         // Broker mid-price
    averageOpenPrice: number;
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export async function scanOptionsExits(
    userId: string,
    strategy: string,
    optionsIntent: OptionsIntent | undefined,
    accessToken?: string,
    accountNumber?: string
): Promise<ExitScanResult> {
    const mode = optionsIntent?.mode ?? 'NO_ACTION';
    const today = new Date();

    // 1. Fetch positions
    let rawPositions: RawTTPosition[] = [];
    if (accessToken && accountNumber) {
        rawPositions = await fetchTTOptionsPositions(accessToken, accountNumber);
    } else {
        rawPositions = await fetchShadowOptionsPositions(userId, strategy);
    }

    if (rawPositions.length === 0) {
        return {
            closeLegs: [],
            existingPositions: { cspCount: 0, zebraUnits: 0, ccsCount: 0, sqqqShares: 0 },
        };
    }

    // 2. Classify positions
    const classified = classifyPositions(rawPositions);
    const closeLegs: CloseLeg[] = [];

    // 3. Evaluate CSP exits (TQQQ short puts)
    const forceCloseCsp = ['C', 'D2'].includes(mode);
    for (const csp of classified.csps) {
        const pnlPct = csp.entryPremium > 0
            ? (csp.entryPremium - csp.currentPrice) / csp.entryPremium
            : 0;
        const dte = daysBetween(today, new Date(csp.expirationDate));

        if (pnlPct >= 0.50 || pnlPct <= -2.0 || dte <= 0 || forceCloseCsp) {
            const reason = forceCloseCsp
                ? `Mode switched to ${mode} — forced CSP exit`
                : pnlPct >= 0.50 ? `50% profit target reached (${(pnlPct * 100).toFixed(0)}%)`
                : pnlPct <= -2.0 ? `3× stop-loss triggered`
                : `Expired`;
            closeLegs.push({
                action: 'Buy to Close',
                symbol: csp.occSymbol,
                quantity: csp.contracts,
                instrumentType: 'Equity Option',
                instruction: `Buy to Close ${csp.contracts} TQQQ $${csp.strike.toFixed(2)} Put (exp. ${formatExp(csp.expirationDate)}) — ${reason}`,
                reason,
            });
        }
    }

    // 4. Evaluate ZEBRA exits (QQQM call ratio spread)
    for (const zebra of classified.zebras) {
        const currentVal = Math.max((zebra.longCurrentPrice * 2) - zebra.shortCurrentPrice, 0);
        const pnlPct = zebra.entryDebit > 0
            ? (currentVal - zebra.entryDebit) / zebra.entryDebit
            : 0;
        const dte = daysBetween(today, new Date(zebra.expirationDate));

        if (pnlPct >= 0.50 || dte <= 21 || currentVal <= 0.01) {
            const reason = pnlPct >= 0.50 ? `50% profit target reached`
                         : dte <= 21 ? `21-day time-stop (${dte} DTE remaining)`
                         : `Position worthless`;
            closeLegs.push(
                {
                    action: 'Buy to Close',
                    symbol: zebra.shortOcc,
                    quantity: zebra.contracts,
                    instrumentType: 'Equity Option',
                    instruction: `Buy to Close ${zebra.contracts} QQQM $${zebra.shortStrike} Call (exp. ${formatExp(zebra.expirationDate)}) — ${reason}`,
                    reason,
                },
                {
                    action: 'Sell to Close',
                    symbol: zebra.longOcc,
                    quantity: zebra.contracts * 2,
                    instrumentType: 'Equity Option',
                    instruction: `Sell to Close ${zebra.contracts * 2} QQQM $${zebra.longStrike} Call (exp. ${formatExp(zebra.expirationDate)}) — ${reason}`,
                    reason,
                }
            );
        }
    }

    // 5. Evaluate CCS exits (QQQ bear call spread)
    for (const ccs of classified.ccsSpreads) {
        const liability = Math.max(ccs.shortCurrentPrice - ccs.longCurrentPrice, 0);
        const pnlPct = ccs.entryCredit > 0
            ? 1.0 - (liability / ccs.entryCredit)
            : 0;
        const dte = daysBetween(today, new Date(ccs.expirationDate));

        if (pnlPct >= 0.50 || pnlPct <= -2.0 || dte <= 0) {
            const reason = pnlPct >= 0.50 ? `50% profit target reached`
                         : dte <= 0 ? `Expired`
                         : `3× stop-loss triggered`;
            closeLegs.push(
                {
                    action: 'Buy to Close',
                    symbol: ccs.shortOcc,
                    quantity: ccs.contracts,
                    instrumentType: 'Equity Option',
                    instruction: `Buy to Close ${ccs.contracts} QQQ $${ccs.shortStrike} Call (exp. ${formatExp(ccs.expirationDate)}) — ${reason}`,
                    reason,
                },
                {
                    action: 'Sell to Close',
                    symbol: ccs.longOcc,
                    quantity: ccs.contracts,
                    instrumentType: 'Equity Option',
                    instruction: `Sell to Close ${ccs.contracts} QQQ $${ccs.longStrike} Call (exp. ${formatExp(ccs.expirationDate)}) — ${reason}`,
                    reason,
                }
            );
        }
    }

    // 6. Evaluate SQQQ equity exits
    const sqqqPx = optionsIntent?.sqqq_px ?? 0;
    const vixVix3m = optionsIntent?.vix_vix3m ?? 1.0;
    const exitMode = ['D3', 'A', 'B'].includes(mode);

    for (const sqqq of classified.sqqqShares) {
        if (sqqq.avgPrice <= 0) continue;
        const pnlPct = sqqqPx > 0 ? (sqqqPx / sqqq.avgPrice) - 1.0 : 0;
        const contango = vixVix3m < 1.0;

        if (pnlPct >= 0.30 || contango || exitMode) {
            const reason = pnlPct >= 0.30 ? `30% profit target reached (${(pnlPct * 100).toFixed(0)}%)`
                         : contango ? `VIX term structure normalized (contango)`
                         : `Regime shifted to mode ${mode}`;
            closeLegs.push({
                action: 'Sell',
                symbol: 'SQQQ',
                quantity: sqqq.quantity,
                instrumentType: 'Equity',
                instruction: `Sell ${sqqq.quantity} shares of SQQQ at Market Price — ${reason}`,
                reason,
            });
        }
    }

    // 7. Compute remaining positions after proposed closes
    const existingPositions = recount(classified, closeLegs);

    return { closeLegs, existingPositions };
}

// ─── TT Positions Fetcher ─────────────────────────────────────────────────────

async function fetchTTOptionsPositions(
    accessToken: string,
    accountNumber: string
): Promise<RawTTPosition[]> {
    try {
        const resp = await fetch(
            `${TASTYTRADE_API_BASE}/accounts/${accountNumber}/positions`,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'User-Agent': 'TradeMind/1.0',
                },
            }
        );
        if (!resp.ok) return [];

        const data = await resp.json();
        const items: any[] = data?.data?.items || [];

        return items
            .filter(item => item['instrument-type'] === 'Equity Option' ||
                (item['underlying-symbol'] === 'SQQQ' && item['instrument-type'] === 'Equity'))
            .map(item => ({
                symbol: item.symbol,
                instrumentType: item['instrument-type'],
                quantity: parseFloat(item.quantity || '0'),
                quantityDirection: item['quantity-direction'] || 'Long',
                underlyingSymbol: item['underlying-symbol'] || '',
                optionType: item['option-type'] || null,
                strikePrice: parseFloat(item['strike-price'] || '0'),
                expirationDate: item['expiration-date'] || '',
                closePrice: parseFloat(item['close-price'] || '0'),
                averageOpenPrice: parseFloat(item['average-open-price'] || '0'),
            }));
    } catch (err) {
        console.warn('[ExitScanner] Failed to fetch TT positions:', err);
        return [];
    }
}

// ─── Virtual Positions Fetcher ────────────────────────────────────────────────

async function fetchShadowOptionsPositions(
    userId: string,
    strategy: string
): Promise<RawTTPosition[]> {
    try {
        // Options stored in shadow_positions with OCC-format symbols or OPT: prefix
        const res = await pool.query(
            `SELECT symbol, quantity, avg_price, instrument_type
             FROM shadow_positions
             WHERE user_id = $1 AND strategy = $2
               AND (instrument_type = 'Equity Option'
                    OR symbol LIKE 'OPT:%'
                    OR symbol ~ '^[A-Z ]+[0-9]{6}[CP][0-9]+$'
                    OR (symbol = 'SQQQ' AND quantity > 0))`,
            [userId, strategy]
        );

        return res.rows.map((row: any) => {
            // Parse OCC symbol if present: e.g. "TQQQ  260425P00048000"
            let underlyingSymbol = '';
            let optionType: 'C' | 'P' | null = null;
            let strikePrice = 0;
            let expirationDate = '';

            const sym: string = row.symbol;
            // Match OCC pattern: 6-char padded underlying + 6-char date + C/P + 8-char strike
            const occMatch = sym.match(/^([A-Z ]{1,6})\s*(\d{6})([CP])(\d{8})$/);
            if (occMatch) {
                underlyingSymbol = occMatch[1].trim();
                const datePart = occMatch[2]; // YYMMDD
                expirationDate = `20${datePart.slice(0, 2)}-${datePart.slice(2, 4)}-${datePart.slice(4, 6)}`;
                optionType = occMatch[3] as 'C' | 'P';
                strikePrice = parseInt(occMatch[4]) / 1000;
            } else if (sym === 'SQQQ') {
                underlyingSymbol = 'SQQQ';
            } else if (sym.startsWith('OPT:')) {
                underlyingSymbol = sym.split('_')[0].replace('OPT:', '');
            }

            const qty = parseFloat(row.quantity || '0');
            const isShort = row.instrument_type === 'Equity Option' && qty < 0;

            return {
                symbol: sym,
                instrumentType: row.instrument_type || 'Equity Option',
                quantity: Math.abs(qty),
                quantityDirection: isShort ? 'Short' : 'Long',
                underlyingSymbol,
                optionType,
                strikePrice,
                expirationDate,
                closePrice: 0,          // No live price for virtual — use conservative 0
                averageOpenPrice: parseFloat(row.avg_price || '0'),
            };
        });
    } catch (err) {
        console.warn('[ExitScanner] Failed to fetch shadow options positions:', err);
        return [];
    }
}

// ─── Position Classifier ──────────────────────────────────────────────────────

interface ClassifiedPositions {
    csps: {
        occSymbol: string; contracts: number; strike: number;
        entryPremium: number; currentPrice: number; expirationDate: string;
    }[];
    zebras: {
        shortOcc: string; longOcc: string; contracts: number;
        shortStrike: number; longStrike: number;
        entryDebit: number; shortCurrentPrice: number; longCurrentPrice: number;
        expirationDate: string;
    }[];
    ccsSpreads: {
        shortOcc: string; longOcc: string; contracts: number;
        shortStrike: number; longStrike: number;
        entryCredit: number; shortCurrentPrice: number; longCurrentPrice: number;
        expirationDate: string;
    }[];
    sqqqShares: { quantity: number; avgPrice: number }[];
}

function classifyPositions(positions: RawTTPosition[]): ClassifiedPositions {
    const result: ClassifiedPositions = { csps: [], zebras: [], ccsSpreads: [], sqqqShares: [] };

    // CSPs: TQQQ short puts
    const tqqqShortPuts = positions.filter(p =>
        p.underlyingSymbol === 'TQQQ' && p.optionType === 'P' && p.quantityDirection === 'Short'
    );
    for (const pos of tqqqShortPuts) {
        result.csps.push({
            occSymbol: pos.symbol,
            contracts: pos.quantity,
            strike: pos.strikePrice,
            entryPremium: pos.averageOpenPrice,
            currentPrice: pos.closePrice,
            expirationDate: pos.expirationDate,
        });
    }

    // ZEBRAs: QQQM calls — group by expiry
    const qqqmCalls = positions.filter(p => p.underlyingSymbol === 'QQQM' && p.optionType === 'C');
    const zebrasByExpiry: Record<string, { long?: RawTTPosition; short?: RawTTPosition }> = {};
    for (const pos of qqqmCalls) {
        const key = pos.expirationDate;
        if (!zebrasByExpiry[key]) zebrasByExpiry[key] = {};
        if (pos.quantityDirection === 'Long') zebrasByExpiry[key].long = pos;
        else zebrasByExpiry[key].short = pos;
    }
    for (const [expiry, legs] of Object.entries(zebrasByExpiry)) {
        if (legs.long && legs.short && legs.long.quantity === legs.short.quantity * 2) {
            const entryDebit = (legs.long.averageOpenPrice * 2) - legs.short.averageOpenPrice;
            result.zebras.push({
                shortOcc: legs.short.symbol, longOcc: legs.long.symbol,
                contracts: legs.short.quantity,
                shortStrike: legs.short.strikePrice, longStrike: legs.long.strikePrice,
                entryDebit,
                shortCurrentPrice: legs.short.closePrice,
                longCurrentPrice: legs.long.closePrice,
                expirationDate: expiry,
            });
        }
    }

    // CCS: QQQ call spreads — group by expiry
    const qqqCalls = positions.filter(p => p.underlyingSymbol === 'QQQ' && p.optionType === 'C');
    const ccsByExpiry: Record<string, { long?: RawTTPosition; short?: RawTTPosition }> = {};
    for (const pos of qqqCalls) {
        const key = pos.expirationDate;
        if (!ccsByExpiry[key]) ccsByExpiry[key] = {};
        if (pos.quantityDirection === 'Short') ccsByExpiry[key].short = pos;
        else ccsByExpiry[key].long = pos;
    }
    for (const [expiry, legs] of Object.entries(ccsByExpiry)) {
        if (legs.short && legs.long) {
            const entryCredit = legs.short.averageOpenPrice - legs.long.averageOpenPrice;
            result.ccsSpreads.push({
                shortOcc: legs.short.symbol, longOcc: legs.long.symbol,
                contracts: legs.short.quantity,
                shortStrike: legs.short.strikePrice, longStrike: legs.long.strikePrice,
                entryCredit,
                shortCurrentPrice: legs.short.closePrice,
                longCurrentPrice: legs.long.closePrice,
                expirationDate: expiry,
            });
        }
    }

    // SQQQ shares
    const sqqqPos = positions.filter(p => p.underlyingSymbol === 'SQQQ' && p.instrumentType === 'Equity');
    for (const pos of sqqqPos) {
        result.sqqqShares.push({ quantity: pos.quantity, avgPrice: pos.averageOpenPrice });
    }

    return result;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysBetween(from: Date, to: Date): number {
    return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

function formatExp(dateStr: string): string {
    try {
        return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
        return dateStr;
    }
}

function recount(
    classified: ClassifiedPositions,
    closeLegs: CloseLeg[]
): ExistingPositionCounts {
    const closedSymbols = new Set(closeLegs.map(l => l.symbol));

    const remainingCsps = classified.csps.filter(c => !closedSymbols.has(c.occSymbol));
    const remainingZebras = classified.zebras.filter(z =>
        !closedSymbols.has(z.shortOcc) && !closedSymbols.has(z.longOcc)
    );
    const remainingCcs = classified.ccsSpreads.filter(c =>
        !closedSymbols.has(c.shortOcc) && !closedSymbols.has(c.longOcc)
    );
    const sqqqClosed = closeLegs.some(l => l.symbol === 'SQQQ');

    return {
        cspCount: remainingCsps.length,
        zebraUnits: remainingZebras.length,
        ccsCount: remainingCcs.length,
        sqqqShares: sqqqClosed ? 0 : classified.sqqqShares.reduce((s, p) => s + p.quantity, 0),
    };
}

/**
 * Update shadow_positions to remove closed options positions.
 * Called after close legs have been submitted (or virtually executed).
 */
export async function closeShadowOptionsPositions(
    userId: string,
    strategy: string,
    closeLegs: CloseLeg[]
): Promise<void> {
    if (closeLegs.length === 0) return;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        for (const leg of closeLegs) {
            // Remove the position entirely (BTC/STC means we're done with it)
            await client.query(
                `DELETE FROM shadow_positions WHERE user_id = $1 AND strategy = $2 AND symbol = $3`,
                [userId, strategy, leg.symbol]
            );
        }
        await client.query('COMMIT');
        console.log(`[ExitScanner] Removed ${closeLegs.length} closed positions from shadow for ${userId}`);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[ExitScanner] Failed to update shadow positions for closes:', err);
    } finally {
        client.release();
    }
}

/**
 * Save new options positions to shadow_positions for virtual tracking.
 * Called after options orders are submitted (or virtually executed).
 */
export async function saveShadowOptionsPositions(
    userId: string,
    strategy: string,
    optionsOrders: { symbol: string; action: string; quantity: number; limitPrice: number; instrumentType: string }[],
    signalId: string
): Promise<void> {
    if (optionsOrders.length === 0) return;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        for (const order of optionsOrders) {
            if (order.instrumentType !== 'Equity Option' || order.symbol.includes('PENDING')) continue;
            const qty = ['Sell to Open', 'Sell'].includes(order.action) ? -order.quantity : order.quantity;
            await client.query(
                `INSERT INTO shadow_positions (user_id, strategy, symbol, quantity, avg_price, instrument_type, signal_id, updated_at)
                 VALUES ($1, $2, $3, $4, $5, 'Equity Option', $6, NOW())
                 ON CONFLICT (user_id, strategy, symbol)
                 DO UPDATE SET quantity = $4, avg_price = $5, updated_at = NOW()`,
                [userId, strategy, order.symbol, qty, order.limitPrice, signalId]
            );
        }
        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[ExitScanner] Failed to save options positions to shadow:', err);
    } finally {
        client.release();
    }
}
