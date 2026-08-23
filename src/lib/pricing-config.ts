/**
 * Single Source of Truth — TradeMind Pricing
 * ============================================
 * Import this anywhere pricing is displayed so a one-line change
 * updates the pricing page, /upgrade page, and checkout simultaneously.
 *
 * Plans — ANNUAL-ONLY (since Aug 2026):
 *   turbocore_pro_bundle — QQQ Basic   $252/yr  (= $30/mo × 12 × 0.70)
 *   qqq_leaps            — QQQ LEAPS   $336/yr  (= $40/mo × 12 × 0.70)
 *   full_access          — internal tier (trials, grants) — NOT sold
 *
 * `monthly` is the REFERENCE monthly rate (marketing anchor + legacy math).
 * `annualPerMonth` is the EFFECTIVE monthly rate (annual / 12) — use it for
 * credit→day conversions so "N months free" matches what customers actually pay.
 *
 * Trials (2, via Whop):
 *   trial_30 — 30-day Full Access  $10 ($100 value)
 *   trial_60 — 60-day Full Access  $20 ($200 value)
 *
 * Credits are stored as INTEGER dollar-cents in the DB.
 * Bonus days = floor( credit_dollars × 30 / effective_monthly_price )
 */

export const PRICING = {
    plans: {
        turbocore_pro_bundle: {
            key: 'turbocore_pro_bundle',
            label: 'QQQ Basic',
            description: 'QQQ Basic ML Signal + IV-Switching Composite Options Strategy',
            monthly: 30,            // reference rate — not sold monthly
            annual: 252,
            annualPerMonth: 21,
            annualSavingsPct: 30,
            features: [
                'QQQ Basic ML Signal (daily at 3 PM ET)',
                'SMA200 Regime Gate',
                'IV-Switching Composite (CSP / ZEBRA / CCS)',
                'Crash Hedge Mode (SQQQ)',
                'Virtual Shadow Portfolio',
                'Pre-Market Brief',
                'Signal History',
            ],
        },
        qqq_leaps: {
            key: 'qqq_leaps',
            label: 'QQQ LEAPS',
            description: 'ML-Powered QQQ Long-Term Equity Anticipation Securities',
            monthly: 40,            // reference rate — not sold monthly
            annual: 336,
            annualPerMonth: 28,
            annualSavingsPct: 30,
            features: [
                'Daily ML LEAPS Signal (ENTER / EXIT / HOLD)',
                'QQQ LEAPS Call Selection (0.70+ delta, 12-month)',
                'Regime Detection (BULL_STRONG / BULL / CHOPPY / BEAR)',
                'Virtual LEAPS Position Tracking',
                'Manual Order Instructions',
                'Signal History',
            ],
        },
        full_access: {
            key: 'full_access',
            label: 'Full Access',
            description: 'Both strategies: QQQ Basic + QQQ LEAPS',
            internal: true,         // trials/grants only — not offered for sale
            monthly: 70,            // reference: sum of the two reference rates
            annual: 588,            // reference: 252 + 336
            annualPerMonth: 49,
            annualSavingsPct: 30,
            features: [
                'Everything in Turbo Core + Pro',
                'QQQ LEAPS Strategy',
                'TurboBounce Alpha Signals',
                'Portfolio Allocation Tooling',
                'Founder Office Hours',
                'Unlimited AI Copilot',
                'PDF Report Exports',
            ],
        },
    },

    // ── Whop Trial Products ──────────────────────────────────────────────────
    trials: {
        trial_30: {
            whopPlanEnvKey: 'WHOP_PLAN_TRIAL_30',
            price: 10,              // $10 checkout price
            valueLabel: '$100',     // displayed value
            durationDays: 30,
            creditCents: 1000,      // $10 refunded as Stripe credit on conversion
            accessTier: 'full_access',
            whopSlug: 'trademind-algo-signals-30day',
            redirectUrl: 'https://trademind.bot/trademind-algo-signals-30day',
        },
        trial_60: {
            whopPlanEnvKey: 'WHOP_PLAN_TRIAL_60',
            price: 20,              // $20 checkout price
            valueLabel: '$200',     // displayed value
            durationDays: 60,
            creditCents: 2000,      // $20 refunded as Stripe credit on conversion
            accessTier: 'full_access',
            whopSlug: 'trademind-algo-signals-60day',
            redirectUrl: 'https://trademind.bot/trademind-algo-signals-60day',
        },
    },

    // ── Post-Trial: Monthly Credit Installment ───────────────────────────────
    // $25 credit issued automatically for the first 4 months via
    // the invoice.payment_succeeded webhook. $25 × 4 = $100 total benefit.
    creditInstallment: {
        creditCentsPerInstallment: 2500,    // $25 per month
        installmentCount: 4,                // 4 months
        totalValueCents: 10000,             // $100 total
    },

    // ── Loyalty Credits (existing, unchanged) ────────────────────────────────
    loyalty: {
        creditCentsPerMonth: parseInt(process.env.LOYALTY_CREDIT_CENTS_PER_MONTH ?? '2000', 10),
        totalMonths:         parseInt(process.env.LOYALTY_TOTAL_MONTHS           ?? '5',    10),
        expiryDays: 90,
    },

    // ── Referral Credits (legacy flat program — superseded by `referral` below) ─
    credits: {
        referralBothSidesCents: parseInt(process.env.REFERRAL_CREDIT_CENTS ?? '10000', 10),
    },

    // ── Vested Referral Program (LEGACY, superseded Aug 23, 2026) ───────────
    referral: {
        referrerMonths:                 parseInt(process.env.REFERRAL_REFERRER_MONTHS  ?? '8',  10),
        refereeMonths:                  parseInt(process.env.REFERRAL_REFEREE_MONTHS   ?? '4',  10),
        vestingDays:                    parseInt(process.env.REFERRAL_VESTING_DAYS     ?? '75', 10),
        maxReferrerMonthsPerYear:       parseInt(process.env.REFERRAL_MAX_MONTHS_YEAR  ?? '12', 10),
        compensationTrackThresholdCents: parseInt(process.env.REFERRAL_COMP_THRESHOLD_CENTS ?? '100000', 10), // $1,000
    },

    // ── Day-Grant Referral Program (current, locked Aug 23, 2026) ───────────
    // Login-based referral with a designated reward account. Per successful
    // referral: referrer gets $100, referee gets $50, both converted into
    // extra subscription days at the reward account's plan rate:
    //   days = floor(dollars x 30 / effectiveMonthly)   ($21 Basic / $28 LEAPS)
    //   $100 -> 142 days Basic / 107 LEAPS;  $50 -> 71 / 53.
    // Referred signups get NO free month on the referred account; the referee
    // bonus is paid as days at first payment (immediate). The referrer reward
    // vests after `vestingDays` of the referee's subscription staying active.
    referralDays: {
        referrerDollars:                parseInt(process.env.REFERRAL_REFERRER_DOLLARS ?? '100', 10),
        refereeDollars:                 parseInt(process.env.REFERRAL_REFEREE_DOLLARS  ?? '50',  10),
        vestingDays:                    parseInt(process.env.REFERRAL_VESTING_DAYS     ?? '75',  10),
        maxReferrerDollarsPerYear:      parseInt(process.env.REFERRAL_MAX_DOLLARS_YEAR ?? '1200', 10),
        compensationTrackThresholdCents: parseInt(process.env.REFERRAL_COMP_THRESHOLD_CENTS ?? '100000', 10), // $1,000
        // Parked referrer days expire if never applied to a paid subscription.
        parkedDaysExpiryDays:           365,
    },
} as const;

export type PlanKey = keyof typeof PRICING.plans;
export type TrialKey = keyof typeof PRICING.trials;

/** Plans actually offered for sale (annual-only). full_access is internal. */
export const PUBLIC_PLAN_KEYS = ['turbocore_pro_bundle', 'qqq_leaps'] as const satisfies readonly PlanKey[];

/** The only billing interval sold */
export const PUBLIC_INTERVAL = 'annual' as const;  

/** Effective per-month rate customers actually pay (annual / 12) */
export function effectiveMonthlyRate(planKey: PlanKey): number {
    return PRICING.plans[planKey].annualPerMonth;
}

/**
 * Convert a credit balance (stored in cents) to bonus subscription days.
 * Formula: days = floor( dollars × 30 / effective_monthly_price )
 *
 * Pass the EFFECTIVE monthly rate (annual / 12 — see effectiveMonthlyRate),
 * not the reference `monthly` anchor, so bonus days match what the customer
 * actually pays. Examples at the new annual-only pricing:
 *   $168 credit (8 mo referral) on QQQ Basic  ($21 eff.) → 240 days ✓
 *   $224 credit (8 mo referral) on QQQ LEAPS  ($28 eff.) → 240 days ✓
 *   $84  credit (4 mo referee)  on QQQ Basic  ($21 eff.) → 120 days ✓
 */
export function creditsToBonusDays(creditCents: number, effectiveMonthlyPrice: number): number {
    if (creditCents <= 0 || effectiveMonthlyPrice <= 0) return 0;
    return Math.floor((creditCents / 100) * 30 / effectiveMonthlyPrice);
}

/** Returns Stripe checkout URL for a given plan (annual-only) */
export function stripeCheckoutUrl(
    planKey: PlanKey,
    interval: 'monthly' | 'annual' | 'biennial' = PUBLIC_INTERVAL,
    trialCreditCents = 0
): string {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://trademind.bot';
    const params = new URLSearchParams({ plan: planKey, interval });
    if (trialCreditCents > 0) params.set('trialCredit', String(trialCreditCents));
    return `${base}/api/stripe/checkout?${params}`;
}

/**
 * Resolve trial config from a product slug or plan ID.
 * Matches the 60-day product by its slug pattern.
 * Returns trial_30 config for the 30-day product (default).
 *
 * Slug matching (no env vars needed):
 *   "trademind-signal-free-trial"  → trial_60 (60-day $20)
 *   "trademind-algo-signals-30day" → trial_30 (30-day $10)
 */
export function trialConfigFromPlanId(slugOrPlanId: string): (typeof PRICING.trials.trial_30) | (typeof PRICING.trials.trial_60) {
    const is60 = (
        slugOrPlanId === 'trademind-signal-free-trial' ||
        slugOrPlanId.includes('free-trial') ||
        slugOrPlanId.includes('60day') ||
        slugOrPlanId.includes('60-day') ||
        // Fallback: env var for staging/test environments
        (!!process.env.WHOP_PLAN_TRIAL_60 && slugOrPlanId === process.env.WHOP_PLAN_TRIAL_60)
    );
    return is60 ? PRICING.trials.trial_60 : PRICING.trials.trial_30;
}
