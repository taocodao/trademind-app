/**
 * Single Source of Truth — TradeMind Pricing
 * ============================================
 * Import this anywhere pricing is displayed so a one-line change
 * updates the pricing page, /upgrade page, and checkout simultaneously.
 *
 * Plans (3):
 *   turbocore_pro_bundle — TurboCore + Turbo Pro  $69/mo
 *   qqq_leaps            — QQQ LEAPS               $59/mo
 *   full_access          — All 3 strategies        $100/mo
 *
 * Trials (2, via Whop):
 *   trial_30 — 30-day Full Access  $10 ($100 value)
 *   trial_60 — 60-day Full Access  $20 ($200 value)
 *
 * Yearly:  30% off
 * 2-Year:  40% off (Stripe 24-month interval)
 *
 * Credits are stored as INTEGER dollar-cents in the DB.
 * Bonus days = floor( credit_dollars × 30 / plan_monthly_price )
 */

export const PRICING = {
    plans: {
        turbocore_pro_bundle: {
            key: 'turbocore_pro_bundle',
            label: 'Turbo Core + Pro',
            description: 'TurboCore ML Signal + IV-Switching Composite Options Strategy',
            monthly: 69,
            // Yearly — 30% off
            annual: 579.60,
            annualPerMonth: 48.30,
            annualSavingsPct: 30,
            // 2-Year — 40% off (Stripe interval: month, interval_count: 24)
            biennial: 993.60,
            biennialPerMonth: 41.40,
            biennialSavingsPct: 40,
            features: [
                'TurboCore ML Signal (daily at 3 PM ET)',
                'SMA200 Regime Gate',
                'IV-Switching Composite (CSP / ZEBRA / CCS)',
                'Crash Hedge Mode (SQQQ)',
                'Tastytrade Auto-Execution',
                'Virtual Shadow Portfolio',
                'Pre-Market Brief',
                'Signal History',
            ],
        },
        qqq_leaps: {
            key: 'qqq_leaps',
            label: 'QQQ LEAPS',
            description: 'ML-Powered QQQ Long-Term Equity Anticipation Securities',
            monthly: 59,
            annual: 495.60,
            annualPerMonth: 41.30,
            annualSavingsPct: 30,
            biennial: 849.60,
            biennialPerMonth: 35.40,
            biennialSavingsPct: 40,
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
            description: 'All 3 strategies: TurboCore + Pro + QQQ LEAPS',
            monthly: 100,
            annual: 840,
            annualPerMonth: 70,
            annualSavingsPct: 30,
            biennial: 1440,
            biennialPerMonth: 60,
            biennialSavingsPct: 40,
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

    // ── Referral Credits (existing, unchanged) ───────────────────────────────
    credits: {
        referralBothSidesCents: parseInt(process.env.REFERRAL_CREDIT_CENTS ?? '10000', 10),
    },
} as const;

export type PlanKey = keyof typeof PRICING.plans;
export type TrialKey = keyof typeof PRICING.trials;

/**
 * Convert a credit balance (stored in cents) to bonus subscription days.
 * Formula: days = floor( dollars × 30 / plan_monthly_price )
 *
 * Trial fee conversion examples:
 *   $10 on Full Access $100/mo  → 3 days
 *   $20 on Full Access $100/mo  → 6 days
 *   $10 on Turbo+Pro  $69/mo   → 4 days
 *   $20 on QQQ LEAPS  $59/mo   → 10 days
 */
export function creditsToBonusDays(creditCents: number, planMonthlyPrice: number): number {
    if (creditCents <= 0 || planMonthlyPrice <= 0) return 0;
    return Math.floor((creditCents / 100) * 30 / planMonthlyPrice);
}

/** Returns Stripe checkout URL for a given plan and interval */
export function stripeCheckoutUrl(
    planKey: PlanKey,
    interval: 'monthly' | 'annual' | 'biennial',
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
