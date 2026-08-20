/**
 * Referral System
 * ===============
 * Generates unique referral codes, tracks conversion events,
 * and issues credits to both referrer and referred user.
 *
 * VESTED PROGRAM (current):
 *   Referrer earns PRICING.referral.referrerMonths of free service (default 8),
 *   referee earns refereeMonths (default 4) — credited ONLY after the referee's
 *   subscription stays active for vestingDays (default 75). Months convert to
 *   credits at vest time from each recipient's own plan annual price:
 *       credit_cents = round(months / 12 × plan.annual × 100)
 *   Anti-gaming: referrer months vesting per trailing 12 months are capped at
 *   maxReferrerMonthsPerYear (default 12). Per-referrer trailing-12-month
 *   compensation is tracked against compensationTrackThresholdCents ($1,000).
 *
 * LEGACY FLAT PROGRAM: REFERRAL_CREDIT_CENTS (default $100/side, instant).
 *   Pre-existing referral_events rows are grandfathered with status='vested'.
 */

import { query } from '@/lib/db';
import { issueCredits } from '@/lib/credits';
import { PRICING } from '@/lib/pricing-config';

// ── Code Generation ───────────────────────────────────────────────────────────

function generateReferralCode(firstName: string): string {
    const name   = (firstName || 'USER').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6);
    const year   = new Date().getFullYear();
    const suffix = Math.random().toString(36).slice(2, 5).toUpperCase();
    return `TM-${name}${year}-${suffix}`;
}

/** Ensure a user has a referral code — creates one if missing */
export async function ensureReferralCode(userId: string, firstName: string): Promise<string> {
    const existing = await query(
        `SELECT referral_code FROM user_settings WHERE user_id = $1`,
        [userId]
    );
    if (existing.rows[0]?.referral_code) return existing.rows[0].referral_code;

    // Generate unique code — retry on collision (max 5 attempts)
    let code = '';
    for (let i = 0; i < 5; i++) {
        code = generateReferralCode(firstName);
        const collision = await query(
            `SELECT 1 FROM user_settings WHERE referral_code = $1`, [code]
        );
        if (collision.rowCount === 0) break;
    }

    await query(
        `UPDATE user_settings SET referral_code = $1 WHERE user_id = $2`,
        [code, userId]
    );
    return code;
}

/** Look up a referrer by their code */
export async function getReferrerByCode(code: string): Promise<{ userId: string } | null> {
    const result = await query(
        `SELECT user_id FROM user_settings WHERE referral_code = $1`,
        [code]
    );
    return result.rows[0] ? { userId: result.rows[0].user_id } : null;
}

// ── Conversion ────────────────────────────────────────────────────────────────

/**
 * Record a referral conversion and issue credits to both sides.
 *
 * Credit amount = PRICING.credits.referralBothSidesCents
 * (env: REFERRAL_CREDIT_CENTS, default $100 = 10000 cents per side)
 *
 * Flat — no tiers. Amount is configurable at any time via env var.
 * Bonus days at redemption depend on the user's plan price (plan-specific).
 *
 * Called from:
 *   - Stripe webhook on first successful payment
 *   - Whop webhook on membership.went_valid (for trial→paid conversions)
 */
export async function recordReferralConversion(
    referrerId: string,
    referredId: string,
    referralCode: string,
    billingSource: 'stripe' | 'whop',
    convertedPlan: string
): Promise<void> {
    const cfg = PRICING.referral;

    // Planned credit amounts (for display/audit) — recomputed from live pricing
    // at vest time, so a price change between conversion and vesting is honored.
    const plan                = resolvePlanKey(convertedPlan);
    const referrerCreditCents = monthsToCreditCents(cfg.referrerMonths, plan);
    const referredCreditCents = monthsToCreditCents(cfg.refereeMonths,  plan);

    // Insert as PENDING — credits are issued by vestDueReferrals() only after
    // the referee stays active for the vesting window.
    // UNIQUE(referred_id) prevents double-crediting.
    const inserted = await query(
        `INSERT INTO referral_events
            (referrer_id, referred_id, referral_code, converted_plan, converted_at,
             referrer_credit, referred_credit, billing_source,
             status, vests_at, referrer_months, referred_months)
         VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7,
                 'pending', NOW() + ($8 || ' days')::INTERVAL, $9, $10)
         ON CONFLICT (referred_id) DO NOTHING
         RETURNING id`,
        [referrerId, referredId, referralCode, convertedPlan,
         referrerCreditCents, referredCreditCents, billingSource,
         cfg.vestingDays, cfg.referrerMonths, cfg.refereeMonths]
    );

    if (inserted.rowCount === 0) {
        console.log(`[Referral] Skipped duplicate — ${referredId} already has a referral event`);
        return;
    }

    console.log(
        `[Referral] ${referrerId} → ${referredId} (${convertedPlan}): PENDING — ` +
        `referrer +${cfg.referrerMonths}mo, referee +${cfg.refereeMonths}mo, ` +
        `vests in ${cfg.vestingDays} days if referee stays active`
    );
}

// ── Vesting ───────────────────────────────────────────────────────────────────

/** Map a subscription tier / plan string to a PRICING.plans key */
function resolvePlanKey(tierOrPlan: string | null | undefined): keyof typeof PRICING.plans {
    if (tierOrPlan && tierOrPlan in PRICING.plans) return tierOrPlan as keyof typeof PRICING.plans;
    return 'full_access';
}

/** Convert free-service months to credit cents using the recipient's plan annual price */
function monthsToCreditCents(months: number, planKey: keyof typeof PRICING.plans): number {
    if (months <= 0) return 0;
    return Math.round((months / 12) * PRICING.plans[planKey].annual * 100);
}

/** Referrer months already vested in the trailing 12 months (annual-cap check) */
async function referrerMonthsVestedTrailing12(referrerId: string): Promise<number> {
    const r = await query(
        `SELECT COALESCE(SUM(referrer_months), 0) AS months
         FROM referral_events
         WHERE referrer_id = $1 AND status = 'vested'
           AND vested_at > NOW() - INTERVAL '12 months'`,
        [referrerId]
    );
    return parseInt(r.rows[0]?.months ?? '0', 10);
}

/**
 * Vest all due referral events. Called daily by /api/cron/vest-referrals.
 *
 * For each pending event past its vests_at:
 *   - Referee subscription no longer active → VOID both sides ('referee_churned')
 *   - Referee active → referee vests in full; referrer vests up to the remaining
 *     annual cap (excess months are forfeited, void_reason='annual_cap')
 *
 * Idempotent: credit source keys embed the event id, and the
 * user_credits (user_id, source) unique index absorbs any double-run.
 */
export async function vestDueReferrals(): Promise<{ vested: number; voided: number; capped: number }> {
    const due = await query(
        `SELECT id, referrer_id, referred_id, converted_plan, referrer_months, referred_months
         FROM referral_events
         WHERE status = 'pending' AND vests_at <= NOW()
         ORDER BY vests_at ASC
         LIMIT 200`
    );

    let vested = 0, voided = 0, capped = 0;

    for (const ev of due.rows) {
        // Referee must still be an active subscriber
        const ref = await query(
            `SELECT subscription_status, subscription_tier FROM user_settings WHERE user_id = $1`,
            [ev.referred_id]
        );
        const refereeStatus = ref.rows[0]?.subscription_status;
        const refereeTier   = ref.rows[0]?.subscription_tier ?? ev.converted_plan;

        if (refereeStatus !== 'active') {
            await query(
                `UPDATE referral_events SET status = 'voided', void_reason = 'referee_churned' WHERE id = $1`,
                [ev.id]
            );
            voided++;
            console.log(`[Referral] VOIDED ${ev.id} — referee ${ev.referred_id} no longer active (${refereeStatus})`);
            continue;
        }

        // Referee side always vests in full — priced off THEIR plan
        const refereePlan   = resolvePlanKey(refereeTier);
        const refereeCents  = monthsToCreditCents(ev.referred_months, refereePlan);

        // Referrer side — priced off the REFERRER's own plan, capped per trailing 12 months
        const rfer = await query(
            `SELECT subscription_tier FROM user_settings WHERE user_id = $1`,
            [ev.referrer_id]
        );
        const referrerPlan     = resolvePlanKey(rfer.rows[0]?.subscription_tier);
        const alreadyVested    = await referrerMonthsVestedTrailing12(ev.referrer_id);
        const remainingCap     = Math.max(0, PRICING.referral.maxReferrerMonthsPerYear - alreadyVested);
        const referrerMonthsIn = Math.min(ev.referrer_months, remainingCap);
        const referrerCents    = monthsToCreditCents(referrerMonthsIn, referrerPlan);
        const hitCap           = referrerMonthsIn < ev.referrer_months;

        if (referrerCents > 0) await issueCredits(ev.referrer_id, referrerCents, `referral_vest_${ev.id}`);
        if (refereeCents  > 0) await issueCredits(ev.referred_id, refereeCents,  `referral_bonus_vest_${ev.id}`);

        await query(
            `UPDATE referral_events
             SET status = 'vested', vested_at = NOW(),
                 referrer_months = $2, referrer_credit = $3, referred_credit = $4,
                 void_reason = $5
             WHERE id = $1`,
            [ev.id, referrerMonthsIn, referrerCents, refereeCents, hitCap ? 'annual_cap' : null]
        );

        vested++;
        if (hitCap) capped++;
        console.log(
            `[Referral] VESTED ${ev.id}: referrer +${referrerMonthsIn}mo ($${(referrerCents/100).toFixed(2)}${hitCap ? ', capped' : ''}), ` +
            `referee +${ev.referred_months}mo ($${(refereeCents/100).toFixed(2)})`
        );
    }

    return { vested, voided, capped };
}

// ── Compensation tracking (FTC/1099 hygiene) ─────────────────────────────────

/**
 * Trailing-12-month referral compensation for one referrer, in cents.
 * Flagged against PRICING.referral.compensationTrackThresholdCents ($1,000)
 * so we can review heavy earners (disclosure enforcement, tax forms).
 */
export async function getReferrerCompensationTrailing12(userId: string): Promise<{
    totalCents: number;
    thresholdCents: number;
    exceedsThreshold: boolean;
}> {
    const r = await query(
        `SELECT COALESCE(SUM(amount), 0) AS total
         FROM user_credits
         WHERE user_id = $1 AND source LIKE 'referral%'
           AND issued_at > NOW() - INTERVAL '12 months'`,
        [userId]
    );
    const totalCents = parseInt(r.rows[0]?.total ?? '0', 10);
    const thresholdCents = PRICING.referral.compensationTrackThresholdCents;
    return { totalCents, thresholdCents, exceedsThreshold: totalCents >= thresholdCents };
}

// ── Stats ─────────────────────────────────────────────────────────────────────

/** Get referral stats for the account/referrals page */
export async function getReferralStats(userId: string): Promise<{
    code: string;
    shareLink: string;
    totalReferrals: number;
    totalEarnedCents: number;
    pendingMonths: number;
    vestedMonths: number;
    recentEvents: any[];
    referrerMonthsPerReferral: number;
    refereeMonthsPerReferral: number;
    vestingDays: number;
    compensation: { totalCents: number; thresholdCents: number; exceedsThreshold: boolean };
}> {
    const codeResult = await query(
        `SELECT referral_code FROM user_settings WHERE user_id = $1`, [userId]
    );
    const code = codeResult.rows[0]?.referral_code ?? '';

    const statsResult = await query(
        `SELECT COUNT(*) AS total,
                COALESCE(SUM(referrer_credit) FILTER (WHERE status = 'vested'), 0) AS earned,
                COALESCE(SUM(referrer_months) FILTER (WHERE status = 'pending'), 0) AS pending_months,
                COALESCE(SUM(referrer_months) FILTER (WHERE status = 'vested'),  0) AS vested_months
         FROM referral_events WHERE referrer_id = $1`,
        [userId]
    );

    const recentResult = await query(
        `SELECT converted_plan, converted_at, status, vests_at, vested_at,
                referrer_months, referred_months, referrer_credit, billing_source, void_reason
         FROM referral_events WHERE referrer_id = $1
         ORDER BY converted_at DESC LIMIT 10`,
        [userId]
    );

    const compensation = await getReferrerCompensationTrailing12(userId);

    return {
        code,
        shareLink: `https://trademind.bot/?ref=${code}`,
        totalReferrals:           parseInt(statsResult.rows[0]?.total          ?? '0', 10),
        totalEarnedCents:         parseInt(statsResult.rows[0]?.earned         ?? '0', 10),
        pendingMonths:            parseInt(statsResult.rows[0]?.pending_months ?? '0', 10),
        vestedMonths:             parseInt(statsResult.rows[0]?.vested_months  ?? '0', 10),
        recentEvents:             recentResult.rows,
        referrerMonthsPerReferral: PRICING.referral.referrerMonths,
        refereeMonthsPerReferral:  PRICING.referral.refereeMonths,
        vestingDays:               PRICING.referral.vestingDays,
        compensation,
    };
}
