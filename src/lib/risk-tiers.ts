/**
 * Risk Tiers (size-only)
 * ======================
 * Per-account risk levels scale SIZE, never contract selection. Contract
 * selection (delta, DTE) is already regime-conditional by design in the
 * backend's REGIME_PARAMS, so tiers only modulate how much capital a signal
 * may deploy in an account.
 *
 * Why size-only: the BEAR / BEAR_SMA_FORCED override forces 100% SGOV
 * identically across tiers, so bear-regime downside is capped at the same
 * floor for every account. Tier divergence shows up in BULL and CHOPPY
 * regimes, which is exactly what size scaling controls. (Aug 23, 2026
 * stress-test review; see audit/Q32-risk-tier-research-brief.md.)
 *
 * Locked defaults (owner-approved Aug 23, 2026):
 *   conservative  0.5x size, max 1 LEAPS contract
 *   moderate      1.0x size, max 2 LEAPS contracts (unchanged legacy behavior)
 *   aggressive    1.5x size, max 3 LEAPS contracts
 *
 * All existing guardrails still apply AFTER scaling: the vol-scaled reserve
 * floor, the per-phase premium caps, and the gross delta ceiling
 * (GROWTH 1.75x / TARGET 1.50x NAV) can still clip an aggressive tier down.
 */

export type RiskTier = 'conservative' | 'moderate' | 'aggressive';

export const TIER_SIZE_MULTIPLIER: Record<RiskTier, number> = {
    conservative: 0.5,
    moderate: 1.0,
    aggressive: 1.5,
};

export const LEAPS_TIER_MAX_CONTRACTS: Record<RiskTier, number> = {
    conservative: 1,
    moderate: 2,
    aggressive: 3,
};

export function normalizeTier(riskLevel: string | null | undefined): RiskTier {
    const r = String(riskLevel || 'moderate').toLowerCase();
    return r === 'conservative' || r === 'aggressive' ? r : 'moderate';
}

/** Size multiplier for an account's risk level. */
export function tierMultiplier(riskLevel: string | null | undefined): number {
    return TIER_SIZE_MULTIPLIER[normalizeTier(riskLevel)];
}

/** Hard contract cap for LEAPS entries at this risk level. */
export function leapsMaxContracts(riskLevel: string | null | undefined): number {
    return LEAPS_TIER_MAX_CONTRACTS[normalizeTier(riskLevel)];
}

/**
 * Scale an ETF target allocation (symbol -> pct of NLV) by the tier
 * multiplier. Cash absorbs the difference: conservative holds more unallocated
 * cash, aggressive deploys more. Individual legs cap at 100% of NLV.
 */
export function scaleAllocation(
    allocation: Record<string, number>,
    riskLevel: string | null | undefined
): Record<string, number> {
    const mult = tierMultiplier(riskLevel);
    if (mult === 1) return allocation;
    // Weights are fractions of NLV (0.30 = 30%). Scale every leg by the tier
    // multiplier, each capped at 1.0. The total may never exceed 1.0 (no
    // leverage in a virtual cash account): any excess is taken out of SGOV
    // (the cash-equivalent sleeve) first, then all legs shrink proportionally.
    const out: Record<string, number> = {};
    for (const [symbol, pct] of Object.entries(allocation)) {
        const scaled = Math.min(1, pct * mult);
        if (scaled > 0) out[symbol] = scaled;
    }
    let total = Object.values(out).reduce((t, v) => t + v, 0);
    if (total > 1 && out.SGOV !== undefined) {
        out.SGOV = Math.max(0, out.SGOV - (total - 1));
        if (out.SGOV === 0) delete out.SGOV;
        total = Object.values(out).reduce((t, v) => t + v, 0);
    }
    if (total > 1) {
        for (const k of Object.keys(out)) out[k] = out[k] / total;
    }
    for (const k of Object.keys(out)) out[k] = Math.floor(out[k] * 10000) / 10000;
    return out;
}
