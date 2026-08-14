/**
 * Cash Management Policy (QQQ LEAPS + PMCC)
 * ==========================================
 * Implements the reserve-fraction model (Approach B) + gross delta ceiling
 * (Approach D) from the Cash Management Policy doc.
 *
 * KEY REFRAME: a deep-ITM LEAPS contract is already leveraged long QQQ
 * (~1.4x–2.0x delta-adjusted notional vs NAV). The remaining cash is the
 * collateral/risk buffer behind that leverage, NOT idle capital to deploy.
 * So sizing is governed by two constraints that did NOT exist before:
 *
 *   1. RESERVE FLOOR — hold back a volatility-scaled reserve for the three
 *      real liabilities the cash backs: LEAPS roll cost, PMCC defensive-roll
 *      cost, and drawdown-add dry powder. Only NLV above this floor is
 *      deployable.
 *
 *   2. GROSS DELTA CEILING — cap aggregate delta-adjusted notional exposure
 *      (Σ delta × 100 × spot across open LEAPS) as a multiple of NAV. The
 *      premium-based phase caps (95%/45%/33%) understate real exposure by
 *      4–6x; this ceiling is what actually bounds leverage.
 *
 * Both run ALONGSIDE the existing premium phase cap; the binding constraint is
 * whichever is smallest.
 *
 * This module is the single source of truth. The Python backtest
 * (backtest_engine.py) mirrors these exact formulas so live and backtest stay
 * aligned — keep them in sync.
 */

import type { PhaseName } from '@/lib/account-phase';

// ─── Tunables (mirror backtest_engine.py CASH_MGMT) ─────────────────────────

export interface CashMgmtConfig {
    /** Baseline reserve for one LEAPS roll-out, as a fraction of NAV. */
    rollBufferBase: number;
    /** Baseline reserve for one PMCC defensive roll, as a fraction of NAV. */
    pmccDefenseBase: number;
    /** Extra reserve headroom each buffer gains at max vol stress (0–1 adj). */
    volAdjMax: number;
    /** Drawdown-add dry powder by phase (fraction of NAV). */
    ddAddByPhase: Record<PhaseName, number>;
    /** Hard cap on the total reserve fraction (keeps policy from going fully defensive). */
    reserveCap: number;
    /** Gross delta-exposure ceiling by phase (multiple of NAV). null = no ceiling. */
    deltaCeilingByPhase: Record<PhaseName, number | null>;
    /** VIX level mapping for the vol adjustment (doc uses VIX percentile; the
     *  signal carries a VIX LEVEL, so we map level → 0–1 stress adjustment). */
    vixCalm: number;   // at/below → adj 0
    vixStress: number; // at/above → adj 1
}

export const CASH_MGMT: CashMgmtConfig = {
    rollBufferBase: 0.10,
    pmccDefenseBase: 0.07,
    volAdjMax: 0.05,
    ddAddByPhase: { SEED: 0.0, GROWTH: 0.10, TARGET: 0.15 },
    reserveCap: 0.60,
    deltaCeilingByPhase: { SEED: null, GROWTH: 1.75, TARGET: 1.50 },
    vixCalm: 15,
    vixStress: 30,
};

// ─── Volatility stress adjustment ────────────────────────────────────────────

/**
 * Map a VIX level to a 0–1 stress adjustment. The doc specifies a VIX
 * percentile rank; the live signal carries only the VIX level, so we use a
 * linear level→stress map bounded by [vixCalm, vixStress]. The backtest
 * mirrors this exact map (it also only has the level). Defaults to a neutral
 * 0.5 when VIX is unknown so the reserve is conservative by default.
 */
export function vixAdjustment(vix: number | null | undefined): number {
    if (vix == null || !isFinite(vix) || vix <= 0) return 0.5;
    const { vixCalm, vixStress } = CASH_MGMT;
    const t = (vix - vixCalm) / (vixStress - vixCalm);
    return Math.max(0, Math.min(1, t));
}

// ─── Reserve floor ───────────────────────────────────────────────────────────

export interface ReserveResult {
    /** Total reserve fraction of NAV to hold back (0–reserveCap). */
    reservePct: number;
    rollBuffer: number;
    pmccDefense: number;
    ddAdd: number;
    vixAdj: number;
    /** Deployable fraction of NAV after the reserve (1 - reservePct). */
    deployablePct: number;
    /** Deployable dollars of NAV after the reserve. */
    deployableNav: number;
}

/**
 * reserve_pct = roll_buffer + pmcc_defense_buffer + dd_add_buffer
 * roll_buffer          = base + vixAdj × volAdjMax
 * pmcc_defense_buffer  = base + vixAdj × volAdjMax
 * dd_add_buffer        = phase-dependent dry powder
 * Capped at reserveCap so the policy never goes fully defensive exactly when a
 * bull-regime entry gate would fire.
 */
export function computeReserve(nlv: number, phase: PhaseName, vix: number | null | undefined): ReserveResult {
    const adj = vixAdjustment(vix);
    const rollBuffer = CASH_MGMT.rollBufferBase + adj * CASH_MGMT.volAdjMax;
    const pmccDefense = CASH_MGMT.pmccDefenseBase + adj * CASH_MGMT.volAdjMax;
    const ddAdd = CASH_MGMT.ddAddByPhase[phase] ?? 0;
    const reservePct = Math.min(rollBuffer + pmccDefense + ddAdd, CASH_MGMT.reserveCap);
    const deployablePct = Math.max(0, 1 - reservePct);
    return {
        reservePct,
        rollBuffer,
        pmccDefense,
        ddAdd,
        vixAdj: adj,
        deployablePct,
        deployableNav: nlv * deployablePct,
    };
}

// ─── Gross delta ceiling ─────────────────────────────────────────────────────

export interface DeltaCeilingResult {
    /** The phase's delta-exposure ceiling as a multiple of NAV (null = none). */
    ceiling: number | null;
    /** Current aggregate delta-adjusted notional exposure ($). */
    currentExposure: number;
    /** Remaining delta-exposure headroom under the ceiling ($; Infinity if none). */
    headroom: number;
    /** Max delta-exposure this new entry may add ($; Infinity if none). */
    maxNewExposure: number;
}

/**
 * Cap aggregate delta-adjusted notional exposure at the phase's ceiling. A new
 * LEAPS entry may add at most (ceiling×NAV − currentExposure) of delta exposure.
 * SEED has no ceiling (single-position structure makes it moot).
 */
export function deltaCeiling(nlv: number, phase: PhaseName, currentExposure: number): DeltaCeilingResult {
    const ceiling = CASH_MGMT.deltaCeilingByPhase[phase] ?? null;
    if (ceiling === null) {
        return { ceiling, currentExposure, headroom: Infinity, maxNewExposure: Infinity };
    }
    const capDollars = ceiling * nlv;
    const headroom = Math.max(0, capDollars - currentExposure);
    return { ceiling, currentExposure, headroom, maxNewExposure: headroom };
}

/**
 * Aggregate delta-adjusted notional exposure across open LEAPS option positions.
 * positions: map of symbol → { qty, instrumentType } plus a spot price and a
 * per-position delta lookup. Only counts LONG calls on the underlying.
 */
export function currentDeltaExposure(
    posMap: Record<string, { qty: number; instrumentType: string }>,
    underlying: string,
    spot: number,
    deltaFor: (symbol: string) => number | null
): number {
    let exposure = 0;
    for (const [sym, p] of Object.entries(posMap)) {
        if (p.instrumentType !== 'option' || p.qty <= 0) continue;
        if (!sym.startsWith(`${underlying}_`) || !sym.includes('C')) continue;
        const delta = deltaFor(sym);
        if (delta == null) continue;
        exposure += delta * 100 * spot * p.qty;
    }
    return exposure;
}
