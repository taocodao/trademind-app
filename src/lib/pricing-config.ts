/**
 * Single Source of Truth — TradeMind Pricing
 * ============================================
 * Import this anywhere pricing is displayed so a one-line change
 * updates the pricing page, /upgrade page, and checkout simultaneously.
 *
 * Credits are stored as INTEGER dollar-cents in the DB.
 * Conversion to bonus days is PLAN-SPECIFIC:
 *   bonus_days = floor( credit_cents / 100 * 30 / plan_monthly_price )
 */

export const PRICING = {
    plans: {
        turbocore: {
            key: 'turbocore',
            label: 'TurboCore',
            monthly: 29,
            annual: 249,
            annualPerMonth: 20.75,
            annualSavingsPct: 28,
            description: 'TQQQ Core Model, SMA200 Gate, Tastytrade Execution, Standard UI',
            features: [
                'TurboCore ML Signal (daily at 3 PM ET)',
                'SMA200 Regime Gate',
                'Tastytrade Auto-Execution',
                'Virtual Shadow Portfolio',
                'Signal History',
                'Pre-Market Brief',
            ],
        },
        turbocore_pro: {
            key: 'turbocore_pro',
            label: 'TurboCore Pro',
            monthly: 49,
            annual: 399,
            annualPerMonth: 33.25,
            annualSavingsPct: 32,
            description: 'Enhanced ML Regime Detection, Dynamic VIX Positioning, Early Signal Access',
            features: [
                'Everything in TurboCore',
                'Enhanced ML Regime Detection',
                'Dynamic VIX Positioning',
                'QQQ LEAPS Strategy',
                'Early Signal Access',
                'Priority Support',
            ],
        },
        both_bundle: {
            key: 'both_bundle',
            label: 'Both Bundle',
            monthly: 69,
            annual: 549,
            annualPerMonth: 45.75,
            annualSavingsPct: 33,
            description: 'All models + TurboBounce Alpha, Portfolio Allocation Tooling, Founder Office Hours',
            features: [
                'Everything in Pro',
                'TurboBounce Alpha Signals',
                'Portfolio Allocation Tooling',
                'Founder Office Hours',
                'Unlimited AI Copilot',
                'PDF Report Exports',
            ],
        },
    },

    trial: {
        price: 15,
        durationDays: 30,
        // Whop trial gives full Bundle access so the user experiences everything
        accessTier: 'both_bundle',
        // $15 returned as credits (stored as cents). Bonus days = plan-specific.
        creditCents: 1500,
        promoCode: 'TRIALBACK15',
        promoExpireDays: 7,   // days credit is valid after trial ends
    },

    bogo: {
        promoCode: 'BOGO2026',
        label: '2-Year BOGO',
        description: 'Buy 1 year, get year 2 free',
        effectiveMonthlyPerPlan: {
            turbocore:     10.38,   // $249 / 24 months
            turbocore_pro: 16.63,   // $399 / 24
            both_bundle:   22.88,   // $549 / 24
        },
    },

    loyalty: {
        // $20 in credits per month for 5 months (total $100 value).
        // Configurable via env vars — no redeploy needed to adjust the offer.
        // LOYALTY_CREDIT_CENTS_PER_MONTH default: 2000 = $20
        // LOYALTY_TOTAL_MONTHS default: 5
        creditCentsPerMonth: parseInt(process.env.LOYALTY_CREDIT_CENTS_PER_MONTH ?? '2000', 10),
        totalMonths:         parseInt(process.env.LOYALTY_TOTAL_MONTHS           ?? '5',    10),
        expiryDays: 90,
    },

    credits: {
        // All credit amounts are stored as INTEGER cents in user_credits.amount.
        // Days conversion: floor(cents / 100 * 30 / plan_monthly_price)
        //
        // REFERRAL_CREDIT_CENTS — env-configurable so the referral offer can be
        // changed without a code redeploy (update Vercel env + EC2 env vars).
        //
        // Default: 10000 cents = $100 per side.
        // Day equivalents at default:
        //   TurboCore $29:  floor(100 * 30 / 29) = 103 days
        //   Pro       $49:  floor(100 * 30 / 49) = 61  days
        //   Bundle    $69:  floor(100 * 30 / 69) = 43  days
        referralBothSidesCents: parseInt(process.env.REFERRAL_CREDIT_CENTS ?? '10000', 10),
    },
} as const;

export type PlanKey = keyof typeof PRICING.plans;

/**
 * Convert a credit balance (stored in cents) to bonus subscription days.
 * Formula is plan-specific: days = floor( dollars × 30 / plan_monthly_price )
 *
 * Example outputs:
 *   creditsToBonusDays(1500, 29) → 15   ($15 on TurboCore)
 *   creditsToBonusDays(1500, 49) →  9   ($15 on Pro)
 *   creditsToBonusDays(1500, 69) →  6   ($15 on Bundle)
 *   creditsToBonusDays(2000, 29) → 20   ($20 loyalty on TurboCore)
 *   creditsToBonusDays(10000, 69) → 43  ($100 referral on Bundle)
 */
export function creditsToBonusDays(creditCents: number, planMonthlyPrice: number): number {
    if (creditCents <= 0 || planMonthlyPrice <= 0) return 0;
    return Math.floor((creditCents / 100) * 30 / planMonthlyPrice);
}

/** Returns Stripe checkout URL with trial promo code pre-filled */
export function stripeCheckoutUrl(planKey: PlanKey, interval: 'monthly' | 'annual'): string {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://trademind.bot';
    const code = PRICING.trial.promoCode;
    return `${base}/api/stripe/checkout?plan=${planKey}&interval=${interval}&promo=${code}`;
}
