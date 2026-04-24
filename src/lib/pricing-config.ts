/**
 * Single Source of Truth — TradeMind Pricing
 * ============================================
 * Import this anywhere pricing is displayed so a one-line change
 * updates the pricing page, /upgrade page, and checkout simultaneously.
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
        accessTier: 'turbocore',
        promoCode: 'TRIALBACK15',
        promoExpireDays: 7,   // days after trial ends
        creditAmount: 1500,   // cents — $15.00
    },

    bogo: {
        promoCode: 'BOGO2026',
        label: '2-Year BOGO',
        description: 'Buy 1 year, get year 2 free',
        // Annual prices × 1 (user pays 1 year, gets 2)
        effectiveMonthlyPerPlan: {
            turbocore: 10.38,       // $249 / 24 months
            turbocore_pro: 16.63,   // $399 / 24
            both_bundle: 22.88,     // $549 / 24
        },
    },

    loyalty: {
        creditsPerMonth: 100,   // 100 cents = $1.00
        totalMonths: 10,        // issues credits months 1–10
        expiryDays: 90,
    },

    credits: {
        centPerCredit: 10,  // 1 credit = $0.10
        referralTrial: 250,         // $2.50 — referrer + new user when trial-only
        referralMonthly: 500,       // $5.00 — referrer + new user when monthly plan
        referralAnnualReferrer: 1500, // $15.00 — referrer when annual plan
        referralAnnualReferred: 1000, // $10.00 — new user when annual plan
    },
} as const;

export type PlanKey = keyof typeof PRICING.plans;

/** Returns monthly price after trial credit applied */
export function priceAfterTrialCredit(planKey: PlanKey, interval: 'monthly' | 'annual'): number {
    const plan = PRICING.plans[planKey];
    const base = interval === 'annual' ? plan.annual : plan.monthly;
    return base - PRICING.trial.price;
}

/** Returns Stripe checkout URL with TRIALBACK15 pre-filled */
export function stripeCheckoutUrl(planKey: PlanKey, interval: 'monthly' | 'annual'): string {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://trademind.bot';
    const code = PRICING.trial.promoCode;
    return `${base}/api/stripe/checkout?plan=${planKey}&interval=${interval}&promo=${code}`;
}
