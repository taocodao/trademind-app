/**
 * Per-User Order Generator
 * ========================
 * Single source of truth for converting a generic TurboCore signal into
 * user-specific delta orders based on that user's virtual portfolio state.
 *
 * Used by:
 *   - Ghost Executor  (auto-approve)
 *   - Manual Approve  (/api/signals/[id]/approve)
 *   - Options Approve (/api/signals/[id]/approve-options)
 *   - Demo Accounts   (run_demo_executor via Ghost Executor)
 *
 * Equity orders:
 *   NLV = cash + Σ(position × live_price)
 *   delta = floor(NLV × target_pct / live_price) - current_qty
 *   Sell orders first, then buy orders (to free cash before purchasing)
 *
 * Options orders:
 *   - Entry guard: skip if same-type position already exists
 *   - Contract count scaled by user NLV (not hardcoded $25K)
 *   - OCC symbols resolved from TT API (live) or computed (virtual)
 */

import pool, { getDefaultVirtualBalance } from '@/lib/db';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SignalLeg {
    symbol: string;
    target_pct: number;
    leg_type: 'equity' | 'options';
}

export interface OptionsIntent {
    mode: 'A' | 'B' | 'C' | 'D2' | 'D3' | 'NO_ACTION';
    type: 'CSP' | 'ZEBRA' | 'CCS' | 'SQQQ' | null;
    underlying: string;
    delta?: number;         // Target delta for option selection
    dte?: number;           // Target days-to-expiration
    qqq_px?: number;
    qqqm_px?: number;
    tqqq_px?: number;
    sqqq_px?: number;
    iv_short?: number;
    iv_tqqq?: number;
    rf?: number;
    vix?: number;
    vix_vix3m?: number;
}

export interface GenericSignal {
    id: string;
    strategy: string;
    regime?: string;
    confidence?: number;
    rationale?: string;
    legs: SignalLeg[];
    options_intent?: OptionsIntent;
    // Legacy fields (Phase 1 not yet complete — still accept old format)
    type?: string;
    contracts?: number;
    cost?: number;
    symbol?: string;
}

export interface DeltaOrder {
    symbol: string;
    action: 'buy' | 'sell';
    quantity: number;
    price: number;
    /** Human-readable instruction for email / UI */
    instruction: string;
}

export interface OptionsOrder {
    action: 'Buy to Open' | 'Sell to Open' | 'Buy to Close' | 'Sell to Close' | 'Buy' | 'Sell';
    symbol: string;          // OCC symbol or equity symbol
    quantity: number;
    limitPrice: number;
    instrumentType: 'Equity Option' | 'Equity';
    priceEffect: 'Debit' | 'Credit';
    /** Human-readable instruction for email / UI */
    instruction: string;
}

export interface UserOrders {
    equityOrders: DeltaOrder[];
    optionsOrders: OptionsOrder[];
    virtualNlv: number;
    cashBalance: number;
    skipOptions: boolean;
    skipReason?: string;
}

// ─── Main Export ─────────────────────────────────────────────────────────────

/**
 * Generates per-user delta orders from a generic signal.
 */
export async function generateUserOrders(
    signal: GenericSignal,
    userId: string,
    strategy: string,
    accessToken?: string,
    accountNumber?: string
): Promise<UserOrders> {
    const strategyKey = strategy.toUpperCase();

    // 1. Fetch virtual state from DB
    const { cashBalance, shadowPositions } = await fetchVirtualState(userId, strategyKey);

    // 2. Identify equity legs (handle both new format and legacy format)
    const equityLegs: SignalLeg[] = (signal.legs || []).filter(l => l.leg_type === 'equity');
    const equitySymbols = equityLegs.map(l => l.symbol);

    // 3. Fetch live prices (Yahoo Finance via internal /api/quotes)
    const prices = await fetchMarketPrices(equitySymbols);

    // 4. Compute virtual NLV
    let nlv = cashBalance;
    for (const [sym, pos] of Object.entries(shadowPositions)) {
        const price = prices[sym] || pos.avgPrice || 0;
        nlv += pos.qty * price;
    }

    // 5. Generate equity delta orders
    const rawOrders: DeltaOrder[] = [];
    for (const leg of equityLegs) {
        const livePrice = prices[leg.symbol];
        if (!livePrice || livePrice <= 0) {
            console.warn(`[OrderGen] No price for ${leg.symbol} — skipping leg`);
            continue;
        }
        const targetQty = Math.floor((nlv * leg.target_pct) / livePrice);
        const currentQty = shadowPositions[leg.symbol]?.qty ?? 0;
        const delta = targetQty - currentQty;

        if (Math.abs(delta) < 1) continue;

        const isBuy = delta > 0;
        const qty = Math.abs(delta);
        rawOrders.push({
            symbol: leg.symbol,
            action: isBuy ? 'buy' : 'sell',
            quantity: qty,
            price: livePrice,
            instruction: `${isBuy ? 'Buy' : 'Sell'} ${qty} share${qty !== 1 ? 's' : ''} of ${leg.symbol} at Market Price`,
        });
    }

    // Sort: SELLs first to free cash before buying
    const equityOrders = rawOrders.sort((a, b) =>
        a.action === 'sell' && b.action !== 'sell' ? -1 : 1
    );

    // 6. Options orders
    let optionsOrders: OptionsOrder[] = [];
    let skipOptions = false;
    let skipReason: string | undefined;

    const intent = signal.options_intent;
    if (intent && intent.type && intent.mode !== 'NO_ACTION') {
        // Check entry guard using shadow_positions
        const guard = checkEntryGuard(intent.type, shadowPositions);
        if (guard.blocked) {
            skipOptions = true;
            skipReason = guard.reason;
            console.log(`[OrderGen] Options entry blocked for ${userId}: ${guard.reason}`);
        } else {
            try {
                optionsOrders = await buildOptionsOrders(intent, nlv, accessToken);
            } catch (err) {
                console.error(`[OrderGen] Options order build failed for ${userId}:`, err);
                skipOptions = true;
                skipReason = `Options order build failed: ${err instanceof Error ? err.message : String(err)}`;
            }
        }
    }

    return {
        equityOrders,
        optionsOrders,
        virtualNlv: nlv,
        cashBalance,
        skipOptions,
        skipReason,
    };
}

// ─── Internal Helpers ─────────────────────────────────────────────────────────

async function fetchVirtualState(userId: string, strategy: string) {
    const defaultBalance = getDefaultVirtualBalance(strategy);

    try {
        const [balRes, posRes] = await Promise.all([
            pool.query(
                `SELECT cash_balance FROM virtual_accounts WHERE user_id = $1 AND strategy = $2`,
                [userId, strategy]
            ),
            pool.query(
                `SELECT symbol, quantity, avg_price FROM shadow_positions WHERE user_id = $1 AND strategy = $2`,
                [userId, strategy]
            ),
        ]);

        const cashBalance = balRes.rows.length > 0
            ? parseFloat(balRes.rows[0].cash_balance)
            : defaultBalance;

        const shadowPositions: Record<string, { qty: number; avgPrice: number }> = {};
        for (const row of posRes.rows) {
            shadowPositions[row.symbol] = {
                qty: Number(row.quantity),
                avgPrice: Number(row.avg_price),
            };
        }

        return { cashBalance, shadowPositions };
    } catch (err) {
        console.warn(`[OrderGen] Failed to fetch virtual state for ${userId}, using defaults:`, err);
        return { cashBalance: defaultBalance, shadowPositions: {} };
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
        console.warn('[OrderGen] Failed to fetch market prices:', err);
    }
    return {};
}

function checkEntryGuard(
    optionType: string,
    shadowPositions: Record<string, { qty: number; avgPrice: number }>
): { blocked: boolean; reason?: string } {
    // Check shadow_positions for any options instrument_type markers
    // Options are stored with a prefix like 'OPT:TQQQ_CSP', 'OPT:QQQM_ZEBRA', etc.
    // We also check for raw option OCC symbol patterns (6-char padded symbol followed by digits)
    const optPositions = Object.keys(shadowPositions).filter(sym =>
        sym.startsWith('OPT:') || /^[A-Z]{1,6}\s+\d{6}[CP]\d{8}$/.test(sym)
    );

    // Map type to what we look for
    const typeKeywords: Record<string, string[]> = {
        'CSP':   ['CSP', 'TQQQ'],
        'ZEBRA': ['ZEBRA', 'QQQM'],
        'CCS':   ['CCS', 'QQQ'],
        'SQQQ':  ['SQQQ'],
    };
    const keywords = typeKeywords[optionType] || [];

    for (const sym of optPositions) {
        for (const kw of keywords) {
            if (sym.includes(kw)) {
                return { blocked: true, reason: `Already have open ${optionType} position (${sym}) — no new entry` };
            }
        }
    }

    // Also check SQQQ equity shares
    if (optionType === 'SQQQ' && shadowPositions['SQQQ']?.qty > 0) {
        return { blocked: true, reason: `Already hold ${shadowPositions['SQQQ'].qty} SQQQ shares — no new entry` };
    }

    return { blocked: false };
}

async function buildOptionsOrders(
    intent: OptionsIntent,
    nlv: number,
    _accessToken?: string
): Promise<OptionsOrder[]> {
    // For now: build options instructions without live OCC resolution
    // Phase 1 (generic signal) will provide the parameters needed to compute actual OCC symbols
    // This builder assembles the human-readable instruction for email purposes
    // Full OCC resolution happens in approve-options route (which already has complete logic)

    if (!intent.type) return [];

    const orders: OptionsOrder[] = [];

    if (intent.type === 'CSP' && intent.tqqq_px && intent.iv_tqqq && intent.dte) {
        // Approx: $1K-$3K per contract in margin
        const contracts = Math.max(1, Math.floor(nlv * 0.05 / (100 * 1))); // ~5% NLV in margin
        const approxStrike = Math.round(intent.tqqq_px * 0.88 * 2) / 2; // ~12 delta, 0.5 increment
        orders.push({
            action: 'Sell to Open',
            symbol: `TQQQ_CSP_PENDING`, // Resolved at execution time by approve-options logic
            quantity: contracts,
            limitPrice: 0.0,            // Fetched live at execution time
            instrumentType: 'Equity Option',
            priceEffect: 'Credit',
            instruction: `Sell to Open ${contracts} TQQQ ~$${approxStrike} Put (7 DTE) at Market — pending live quote`,
        });
    } else if (intent.type === 'ZEBRA' && intent.qqqm_px && intent.iv_short && intent.dte) {
        const contracts = Math.max(1, Math.floor(nlv * 0.10 / (intent.qqqm_px * 2 * 100)));
        const approxLong = Math.round(intent.qqqm_px * 0.92);
        const approxShort = Math.round(intent.qqqm_px * 0.98);
        orders.push(
            {
                action: 'Buy to Open',
                symbol: `QQQM_ZEBRA_LONG_PENDING`,
                quantity: contracts * 2,
                limitPrice: 0.0,
                instrumentType: 'Equity Option',
                priceEffect: 'Debit',
                instruction: `Buy to Open ${contracts * 2} QQQM ~$${approxLong} Call (75 DTE) at Market`,
            },
            {
                action: 'Sell to Open',
                symbol: `QQQM_ZEBRA_SHORT_PENDING`,
                quantity: contracts,
                limitPrice: 0.0,
                instrumentType: 'Equity Option',
                priceEffect: 'Credit',
                instruction: `Sell to Open ${contracts} QQQM ~$${approxShort} Call (75 DTE) at Market`,
            }
        );
    } else if (intent.type === 'CCS' && intent.qqq_px && intent.iv_short && intent.dte) {
        const contracts = Math.max(1, Math.floor(nlv * 0.04 / (5 * 100))); // ~$500 margin per spread
        const approxShort = Math.round(intent.qqq_px * 1.05);
        const approxLong = approxShort + 5;
        orders.push(
            {
                action: 'Sell to Open',
                symbol: `QQQ_CCS_SHORT_PENDING`,
                quantity: contracts,
                limitPrice: 0.0,
                instrumentType: 'Equity Option',
                priceEffect: 'Credit',
                instruction: `Sell to Open ${contracts} QQQ ~$${approxShort} Call (45 DTE) at Market`,
            },
            {
                action: 'Buy to Open',
                symbol: `QQQ_CCS_LONG_PENDING`,
                quantity: contracts,
                limitPrice: 0.0,
                instrumentType: 'Equity Option',
                priceEffect: 'Debit',
                instruction: `Buy to Open ${contracts} QQQ ~$${approxLong} Call (45 DTE) at Market`,
            }
        );
    } else if (intent.type === 'SQQQ' && intent.sqqq_px) {
        const dollarsToAllocate = nlv * 0.20; // 20% in SQQQ for crash hedge
        const shares = Math.floor(dollarsToAllocate / intent.sqqq_px);
        if (shares > 0) {
            orders.push({
                action: 'Buy',
                symbol: 'SQQQ',
                quantity: shares,
                limitPrice: intent.sqqq_px,
                instrumentType: 'Equity',
                priceEffect: 'Debit',
                instruction: `Buy ${shares} shares of SQQQ at Market Price (~$${intent.sqqq_px.toFixed(2)}/share)`,
            });
        }
    }

    return orders;
}
