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
    const out: Record<string, number> = {};
    for (const [symbol, pct] of Object.entries(allocation)) {
        const scaled = Math.min(100, pct * mult);
        if (scaled > 0) out[symbol] = Math.round(scaled * 100) / 100;
    }
    return out;
}
