/**
 * Account-scoped Order Generation + Execution
 * ============================================
 * Account-centric signal sizing and execution ledger helpers.
 * They size orders off the NAMED account's ledger (accounts / account_positions)
 * and write trades into account_activities, with (account, signal) idempotency.
 */

import pool from '@/lib/db';
import {
    getAccount,
    getAccountPositions,
    applyActivity,
    recordAccountSignal,
    hasAccountExecutedSignal,
} from '@/lib/accounts';
import { evaluateAccountPhase, type PhaseEvalResult } from '@/lib/account-phase';
import { computeReserve, deltaCeiling, currentDeltaExposure, CASH_MGMT } from '@/lib/cash-management';
import { tierMultiplier, leapsMaxContracts } from '@/lib/risk-tiers';
import type { GenericSignal, SignalLeg, DeltaOrder, OptionsOrder, AccountOrders } from '@/lib/signal-orders';
import type { Account } from '@/lib/accounts';

// ─── Order Generation ────────────────────────────────────────────────────────

/**
 * Generate delta orders for a specific account from a (tier-selected) signal.
 * NLV = cash + Σ(position × live price). Sell orders first to free cash.
 */
export async function generateAccountOrders(
    signal: GenericSignal,
    accountId: number,
    priorNlv: number | null = null
): Promise<AccountOrders> {
    const account = await getAccount(accountId);
    if (!account) throw new Error(`Account ${accountId} not found`);

    const positions = await getAccountPositions(accountId);
    const posMap: Record<string, { qty: number; avgPrice: number; instrumentType: string }> = {};
    for (const p of positions) posMap[p.symbol] = { qty: p.quantity, avgPrice: p.avg_price, instrumentType: p.instrument_type };

    const equityLegs: SignalLeg[] = (signal.legs || []).filter(
        (l) => l.leg_type === 'equity' || (!l.leg_type && typeof l.target_pct === 'number' && l.target_pct > 0 && l.target_pct <= 1)
    );
    const symbols = equityLegs.map((l) => l.symbol);
    const prices = await fetchMarketPrices(symbols);

    // NLV (cash + positions at live prices). Options carry a 100× contract multiplier.
    let nlv = account.cash_balance;
    for (const [sym, pos] of Object.entries(posMap)) {
        const px = prices[sym] || pos.avgPrice || 0;
        const mult = pos.instrumentType === 'option' ? 100 : 1;
        nlv += pos.qty * px * mult;
    }

    // ── Phase evaluation (NLV-driven capital scaling) ──
    // The phase caps how much of NLV any single position may target. Tier gates
    // entry strictness; phase caps sizing. This is what makes the signal
    // customized by account + strategy + current position + available cash.
    const phaseEval: PhaseEvalResult = await evaluateAccountPhase(accountId, nlv, priorNlv);
    const phase = phaseEval.phase;
    const phaseCap = phase.maxPositionPct;

    const rawOrders: DeltaOrder[] = [];
    for (const leg of equityLegs) {
        const livePrice = prices[leg.symbol];
        if (!livePrice || livePrice <= 0) {
            console.warn(`[AccountOrderGen] No price for ${leg.symbol} — skipping`);
            continue;
        }
        // Phase cap: a single position may not exceed phaseCap of NLV, even if
        // the tier's target_pct is higher.
        const effectivePct = Math.min(leg.target_pct, phaseCap);
        const targetQty = Math.floor((nlv * effectivePct) / livePrice);
        const currentQty = posMap[leg.symbol]?.qty ?? 0;
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

    const equityOrders = rawOrders.sort((a, b) => (a.action === 'sell' && b.action !== 'sell' ? -1 : 1));

    // ── Options legs (e.g. QQQ_LEAPS) ──
    // The named-account model now executes option legs into the virtual ledger,
    // priced at live mid via the IB-primary /api/quote/option endpoint. Sized to
    // the account's NLV and capped by its phase. Idempotent per (account, signal).
    let optionsOrders: OptionsOrder[] = [];
    let skipOptions = false;
    let skipReason: string | undefined;
    try {
        const opt = await generateAccountOptionOrders(signal, account, nlv, phaseCap, posMap, phase.name);
        optionsOrders = opt.orders;
        skipOptions = opt.skip;
        skipReason = opt.reason;
    } catch (err) {
        skipOptions = true;
        skipReason = `Options order build failed: ${err instanceof Error ? err.message : String(err)}`;
        console.error(`[AccountOrderGen] ${skipReason}`);
    }

    return {
        equityOrders,
        optionsOrders,
        virtualNlv: nlv,
        cashBalance: account.cash_balance,
        skipOptions,
        skipReason,
        // Phase context for the fan-out email / UI (extra fields are additive).
        phase: phase.name,
        phaseCap,
        phaseTransitioned: phaseEval.transitioned,
        phaseFrom: phaseEval.fromPhase,
        phaseReason: phaseEval.reason,
    } as AccountOrders & {
        phase: string;
        phaseCap: number;
        phaseTransitioned: boolean;
        phaseFrom: string | null;
        phaseReason: string | null;
    };
}

// ─── Execution ───────────────────────────────────────────────────────────────

export interface AccountExecuteResult {
    success: boolean;
    alreadyExecuted?: boolean;
    newBalance?: number;
}

/**
 * Execute delta orders into an account's ledger. Idempotent per (account, signal).
 * Accepts equity orders (DeltaOrder) and option orders (OptionsOrder); options are
 * written with instrument_type='option' so the 100× contract multiplier applies.
 */
export async function executeAccountOrders(
    accountId: number,
    signalId: string,
    orders: DeltaOrder[],
    optionOrders: OptionsOrder[] = []
): Promise<AccountExecuteResult> {
    if (await hasAccountExecutedSignal(accountId, signalId)) {
        return { success: false, alreadyExecuted: true };
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Lock the account row to serialize concurrent executions
        await client.query(`SELECT id FROM accounts WHERE id = $1 FOR UPDATE`, [accountId]);

        for (const order of orders) {
            const qty = Math.abs(Math.round(order.quantity));
            if (qty === 0) continue;
            await applyActivity(client, accountId, {
                type: order.action,
                symbol: order.symbol,
                quantity: qty,
                price: order.price,
                signal_id: signalId,
                source: 'signal',
                instrument_type: 'equity',
            });
        }

        // Option legs → virtual positions. Buy→'buy' (debit), Sell→'sell' (credit).
        // The 100× multiplier is applied inside applyActivity for instrument_type='option'.
        for (const oo of optionOrders) {
            const qty = Math.abs(Math.round(oo.quantity));
            if (qty === 0) continue;
            const isBuy = oo.action.toLowerCase().startsWith('buy');
            await applyActivity(client, accountId, {
                type: isBuy ? 'buy' : 'sell',
                symbol: oo.symbol,
                quantity: qty,
                price: oo.limitPrice,
                signal_id: signalId,
                source: 'signal',
                instrument_type: oo.instrumentType === 'Equity Option' ? 'option' : 'equity',
                note: oo.instruction,
            });
        }

        // Record idempotency (unique constraint guards races)
        const ins = await client.query(
            `INSERT INTO account_signals (account_id, signal_id, status) VALUES ($1, $2, 'executed')
             ON CONFLICT (account_id, signal_id) DO NOTHING RETURNING id`,
            [accountId, signalId]
        );
        if (ins.rowCount === 0) {
            await client.query('ROLLBACK');
            return { success: false, alreadyExecuted: true };
        }

        const bal = await client.query(`SELECT cash_balance FROM accounts WHERE id = $1`, [accountId]);
        await client.query('COMMIT');
        return { success: true, newBalance: Number(bal.rows[0]?.cash_balance ?? 0) };
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function fetchMarketPrices(symbols: string[]): Promise<Record<string, number>> {
    if (symbols.length === 0) return {};
    try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.trademind.bot';
        const res = await fetch(`${baseUrl}/api/quotes?symbols=${symbols.join(',')}`, { cache: 'no-store' });
        if (res.ok) return await res.json();
    } catch (err) {
        console.warn('[AccountOrderGen] Failed to fetch market prices:', err);
    }
    return {};
}

// ─── Options (QQQ_LEAPS) ─────────────────────────────────────────────────────

interface OptionQuote {
    mid: number;
    bid: number;
    ask: number;
    delta: number | null;
    basis: string;
    conId?: number;
}

/**
 * Candidate quote-proxy bases, in priority order. A stale env var must not
 * disable live pricing: every configured base is tried before giving up.
 */
const QUOTE_PROXY_BASES: string[] = Array.from(new Set(
    [
        process.env.EC2_API_URL,
        process.env.TASTYTRADE_API_URL,
        'http://34.203.194.137:8002',
    ].filter((b): b is string => Boolean(b))
));

/** Fetch a live option quote (mid price) from the IB-primary 8002 proxy. */
async function fetchOptionQuote(symbol: string, expiry: string, strike: number, right: 'C' | 'P'): Promise<OptionQuote | null> {
    const ymd = expiry.replace(/-/g, '');
    const path = `/api/quote/option?symbol=${encodeURIComponent(symbol)}&expiry=${ymd}&strike=${strike}&right=${right}`;
    for (const base of QUOTE_PROXY_BASES) {
        try {
            const res = await fetch(`${base}${path}`, {
                cache: 'no-store',
                signal: AbortSignal.timeout(8000),
            });
            if (!res.ok) {
                console.warn(`[AccountOrderGen] option quote ${base} returned HTTP ${res.status} for ${symbol} ${ymd} ${strike}${right}`);
                continue;
            }
            const q = await res.json();
            if (typeof q.mid !== 'number' || q.mid <= 0) {
                console.warn(`[AccountOrderGen] option quote ${base} returned no usable mid for ${symbol} ${ymd} ${strike}${right}`);
                continue;
            }
            return { mid: q.mid, bid: q.bid, ask: q.ask, delta: q.delta ?? null, basis: q.basis || 'live', conId: q.conId };
        } catch (err) {
            console.warn(`[AccountOrderGen] option quote ${base} fetch failed for ${symbol} ${ymd} ${strike}${right}:`, err);
        }
    }
    console.warn(`[AccountOrderGen] all quote proxies failed for ${symbol} ${ymd} ${strike}${right}; falling back to signal price`);
    return null;
}

/** Build an OCC-style virtual position symbol: QQQ_20280121C00616 */
function optionSymbol(underlying: string, expiry: string, right: 'C' | 'P', strike: number): string {
    const ymd = expiry.replace(/-/g, '');
    const strikeInt = Math.round(strike);
    return `${underlying}_${ymd}${right}${String(strikeInt).padStart(5, '0')}`;
}

/**
 * Generate account-specific option orders from a QQQ_LEAPS-style signal.
 * Sizes the LEAPS entry to the account's NLV capped by its phase, and skips if
 * the account already holds an open LEAPS call (entry guard). Returns orders +
 * skip metadata for the fan-out email.
 */
async function generateAccountOptionOrders(
    signal: GenericSignal,
    account: Account,
    nlv: number,
    phaseCap: number,
    posMap: Record<string, { qty: number; avgPrice: number; instrumentType: string }>,
    phaseName: 'SEED' | 'GROWTH' | 'TARGET' = 'SEED'
): Promise<{ orders: OptionsOrder[]; skip: boolean; reason?: string }> {
    const empty = { orders: [] as OptionsOrder[], skip: false };

    // Only ENTER/EXIT actions produce orders.
    const action = (signal.type || (signal as any).action || '').toUpperCase();

    // ── EXIT: close any open long LEAPS calls on the underlying ─────────────
    // The EXIT signal may not identify the contract (there is no entry target
    // on exit days), so the account's own open position is the source of truth.
    // Priced at live mid via the IB-primary proxy, falling back to the
    // signal's exit_px.
    if (action === 'EXIT') {
        const exitUnderlying = String((signal as any).symbol || 'QQQ').toUpperCase();
        const openCalls = Object.entries(posMap).filter(
            ([sym, p]) =>
                p.instrumentType === 'option' &&
                p.qty > 0 &&
                new RegExp(`^${exitUnderlying}_\\d{8}C\\d{5}$`).test(sym)
        );
        if (openCalls.length === 0) {
            return { orders: [], skip: true, reason: `No open ${exitUnderlying} LEAPS call to close` };
        }
        const fallbackPx = Number((signal as any).exit_px) || 0;
        const exitOrders: OptionsOrder[] = [];
        for (const [sym, pos] of openCalls) {
            const m = sym.match(/_(\d{4})(\d{2})(\d{2})C(\d{5})$/);
            let price = fallbackPx;
            let basis = 'signal exit_px';
            if (m) {
                const expiry = `${m[1]}-${m[2]}-${m[3]}`;
                const strike = parseInt(m[4], 10);
                const quote = await fetchOptionQuote(exitUnderlying, expiry, strike, 'C');
                if (quote) {
                    price = quote.mid;
                    basis = quote.basis;
                }
            }
            if (!price || price <= 0) {
                return { orders: [], skip: true, reason: `No live quote or signal exit price for ${sym}` };
            }
            const qty = Math.round(pos.qty);
            exitOrders.push({
                action: 'Sell to Close',
                symbol: sym,
                quantity: qty,
                limitPrice: price,
                instrumentType: 'Equity Option',
                priceEffect: 'Credit',
                instruction: `Sell to Close ${qty} ${sym} at ~$${price.toFixed(2)} (mid, ${basis}) — credit ~$${(qty * price * 100).toFixed(0)}`,
            });
        }
        return { orders: exitOrders, skip: false };
    }

    if (action !== 'ENTER') {
        return { orders: [], skip: true, reason: `No entry (action=${action || 'none'})` };
    }

    // Select the LEAPS contract for this account's risk level. The signal carries
    // a per-tier contract (conservative/moderate/aggressive) computed by the
    // backend (delta & DTE scaled by risk); fall back to the top-level
    // (moderate) contract for older signals without a tiers block.
    const riskLevel = String((account as any).risk_level || 'moderate').toLowerCase();
    const tiers = (signal as any).tiers || {};
    const tier = tiers[riskLevel] || null;

    const strike = Number(tier?.strike ?? (signal as any).strike);
    const expiry = String(tier?.expiry ?? (signal as any).expiry ?? '');
    const underlying = String((signal as any).symbol || 'QQQ');
    if (!strike || !expiry) {
        return { orders: [], skip: true, reason: 'Signal missing strike/expiry' };
    }

    // Entry guard: skip if the account already holds an open LEAPS call on this underlying.
    const hasOpenLeaps = Object.entries(posMap).some(
        ([sym, p]) => p.instrumentType === 'option' && p.qty > 0 && sym.startsWith(`${underlying}_`) && sym.includes('C')
    );
    if (hasOpenLeaps) {
        return { orders: [], skip: true, reason: `Already holding an open ${underlying} LEAPS call — no new entry` };
    }

    // Live price for the contract (mid via IB-primary proxy).
    const quote = await fetchOptionQuote(underlying, expiry, strike, 'C');
    const price = quote?.mid ?? Number((signal as any).entry_px) ?? 0;
    if (!price || price <= 0) {
        return { orders: [], skip: true, reason: 'No live option price available' };
    }

    // ── Cash-management policy (mirrors backtest_engine.py CASH_MGMT) ──
    // 1. RESERVE FLOOR: post-trade cash must stay above the vol-scaled reserve
    //    (LEAPS roll + PMCC defense + drawdown-add buffers). Budget is the
    //    smaller of the premium phase cap and the reserve-constrained cash.
    // 2. GROSS DELTA CEILING: aggregate delta-adjusted notional exposure stays
    //    under the phase ceiling (GROWTH 1.75x / TARGET 1.50x NAV). One core
    //    contract is always allowed; the ceiling binds on ADDITIONAL contracts.
    const vix = typeof (signal as any).vix === 'number' ? (signal as any).vix : null;
    const reserve = computeReserve(nlv, phaseName, vix);

    // Size-only risk tiering (Phase 4): scale the deployable budget by the
    // account's risk level (conservative 0.5x / moderate 1.0x / aggressive
    // 1.5x). The reserve floor and gross delta ceiling below still apply
    // after scaling and can clip an aggressive tier back down.
    const tierMult = tierMultiplier(riskLevel);
    const premiumBudget = nlv * Math.min(phaseCap, 0.95) * tierMult;
    const reserveBudget = account.cash_balance - reserve.reservePct * nlv;
    const budget = Math.min(premiumBudget, reserveBudget);
    if (budget < price * 100) {
        return {
            orders: [], skip: true,
            reason: `Reserve floor: deployable budget $${Math.max(0, budget).toFixed(0)} < contract cost $${(price * 100).toFixed(0)} (reserve ${(reserve.reservePct * 100).toFixed(0)}% of NLV, VIX adj ${reserve.vixAdj.toFixed(2)}, tier x${tierMult})`,
        };
    }
    let contracts = Math.floor(budget / (price * 100));

    // Hard per-tier contract cap (conservative 1 / moderate 2 / aggressive 3).
    const tierCap = leapsMaxContracts(riskLevel);
    if (contracts > tierCap) contracts = tierCap;

    // Gross delta ceiling (per-contract exposure = delta × 100 × spot).
    const spotPrices = await fetchMarketPrices([underlying]);
    const spot = spotPrices[underlying] || 0;
    const newDelta = Number(tier?.delta ?? (signal as any).delta ?? quote?.delta ?? 0.85);
    if (spot > 0 && CASH_MGMT.deltaCeilingByPhase[phaseName] !== null) {
        const curExposure = currentDeltaExposure(posMap, underlying, spot, () => null);
        const dc = deltaCeiling(nlv, phaseName, curExposure);
        const perContractExposure = newDelta * 100 * spot;
        const maxByDelta = Math.max(1, Math.floor(dc.headroom / perContractExposure));
        if (contracts > maxByDelta) {
            contracts = maxByDelta;
        }
    }

    if (contracts < 1) {
        // One core contract is always allowed when the reserve floor passed:
        // a tier multiplier must never zero out an otherwise-valid entry.
        contracts = 1;
    }

    const sym = optionSymbol(underlying, expiry, 'C', strike);
    const debit = contracts * price * 100;
    const dstr = expiry;
    return {
        orders: [{
            action: 'Buy to Open',
            symbol: sym,
            quantity: contracts,
            limitPrice: price,
            instrumentType: 'Equity Option',
            priceEffect: 'Debit',
            instruction: `Buy to Open ${contracts} ${underlying} $${strike} Call exp ${dstr} at ~$${price.toFixed(2)} (mid, ${quote?.basis || 'signal'}) — debit ~$${debit.toFixed(0)}`,
        }],
        skip: false,
    };
}
