/**
 * Account-based referral day grants.
 *
 * A referral is attributed at signup, the referee receives its day grant on
 * their first paid account, and the referrer reward vests only after 14 days
 * of the referee account remaining active.
 */

import { query } from '@/lib/db';
import { extendStripeSubscription } from '@/lib/credits';
import { daysForDollars, getMembershipByAccount, updateMembership, type AccountMembership } from '@/lib/membership';
import { PRICING } from '@/lib/pricing-config';

function generateReferralCode(firstName: string): string {
    const name = (firstName || 'USER').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6);
    const year = new Date().getFullYear();
    const suffix = Math.random().toString(36).slice(2, 5).toUpperCase();
    return `TM-${name}${year}-${suffix}`;
}

/** Ensure a user has a referral code, creating one if missing. */
export async function ensureReferralCode(userId: string, firstName: string): Promise<string> {
    const existing = await query(`SELECT referral_code FROM user_settings WHERE user_id = $1`, [userId]);
    if (existing.rows[0]?.referral_code) return existing.rows[0].referral_code;

    for (let attempt = 0; attempt < 5; attempt++) {
        const code = generateReferralCode(firstName);
        const collision = await query(`SELECT 1 FROM user_settings WHERE referral_code = $1`, [code]);
        if (collision.rowCount !== 0) continue;
        try {
            await query(`UPDATE user_settings SET referral_code = $1 WHERE user_id = $2`, [code, userId]);
            return code;
        } catch (error) {
            if (attempt === 4) throw error;
        }
    }
    throw new Error('Could not generate a unique referral code');
}

/** Look up a referrer by their code. */
export async function getReferrerByCode(code: string): Promise<{ userId: string } | null> {
    const result = await query(
        `SELECT user_id FROM user_settings WHERE referral_code = $1`,
        [code.trim().toUpperCase()]
    );
    return result.rows[0] ? { userId: result.rows[0].user_id } : null;
}

/**
 * Retained only while a non-owned legacy Whop route still imports it.
 * Referral conversion is now created at signup and advanced by
 * handleReferralFirstPayment on the referred account's first Stripe payment.
 */
export async function recordReferralConversion(
    referrerId: string,
    referredId: string,
    referralCode: string,
    billingSource: 'stripe' | 'whop',
    convertedPlan: string
): Promise<void> {
    console.warn('[Referral] Deprecated recordReferralConversion ignored', {
        referrerId,
        referredId,
        referralCode,
        billingSource,
        convertedPlan,
    });
}

async function getOwnedMembership(accountId: number, userId: string): Promise<AccountMembership | null> {
    const membership = await getMembershipByAccount(accountId);
    return membership?.user_id === userId ? membership : null;
}

/**
 * Apply part or all of a vested referrer grant to a chosen account. The
 * event carries a dollar balance (grant_dollars); each application draws
 * dollars from it, converts them to days at the chosen account's plan rate,
 * and extends that account's Stripe subscription (or parks the days for its
 * next checkout). The balance stays claimable until fully applied.
 */
export async function applyVestedReferral(
    userId: string,
    eventId: string,
    accountId: number,
    dollars: number
): Promise<{ days: number; plan: string; parked: boolean; remainingDollars: number }> {
    const event = await query(
        `SELECT id, status, void_reason, grant_dollars, applied_dollars
         FROM referral_events
         WHERE id = $1 AND referrer_id = $2`,
        [eventId, userId]
    );
    const row = event.rows[0];
    if (!row) throw new Error('Referral not found');
    if (row.status !== 'vested' || row.void_reason) throw new Error('This reward is not available to apply');

    const grant = Number(row.grant_dollars ?? PRICING.referralDays.referrerDollars);
    const applied = Number(row.applied_dollars ?? 0);
    const remaining = Math.round((grant - applied) * 100) / 100;
    if (remaining <= 0) throw new Error('This reward was already fully applied');

    const amount = Math.round(dollars * 100) / 100;
    if (!Number.isFinite(amount) || amount <= 0) throw new Error('Enter an amount greater than zero');
    if (amount > remaining) throw new Error(`Only $${remaining} remains on this reward`);

    const membership = await getOwnedMembership(accountId, userId);
    if (!membership) throw new Error('Account not found');

    const days = daysForDollars(amount, membership.plan);
    if (days <= 0) throw new Error('That amount converts to less than one day on this plan');

    const parked = !membership.stripe_subscription_id;
    if (membership.stripe_subscription_id) {
        await extendStripeSubscription(membership.stripe_subscription_id, days);
    } else {
        await updateMembership(membership.account_id, {
            pending_bonus_days: membership.pending_bonus_days + days,
        });
    }

    await query(
        `INSERT INTO referral_applications (event_id, account_id, dollars, days)
         VALUES ($1, $2, $3, $4)`,
        [eventId, accountId, amount, days]
    );
    const newRemaining = Math.round((remaining - amount) * 100) / 100;
    await query(
        `UPDATE referral_events
         SET applied_dollars = applied_dollars + $2,
             referrer_days = referrer_days + $3,
             referrer_reward_account_id = $4,
             referrer_applied_at = CASE WHEN applied_dollars + $2 >= COALESCE(grant_dollars, $5) - 0.005 THEN NOW() ELSE referrer_applied_at END
         WHERE id = $1`,
        [eventId, amount, days, accountId, grant]
    );
    console.log(`[Referral] Applied $${amount} (${days}d) of event ${eventId} to account ${accountId}; $${newRemaining} left (${parked ? 'parked' : 'stripe'})`);
    return { days, plan: membership.plan, parked, remainingDollars: newRemaining };
}

/**
 * Resolve the referrer's currently designated reward account. If it is gone,
 * use any of their active memberships. A designated account without a Stripe
 * subscription remains valid, because the vested days can be parked there.
 */
async function resolveRewardMembership(referrerId: string): Promise<AccountMembership | null> {
    const settings = await query(
        `SELECT referral_reward_account_id FROM user_settings WHERE user_id = $1`,
        [referrerId]
    );
    const designatedId = settings.rows[0]?.referral_reward_account_id;
    if (designatedId) {
        const designated = await getOwnedMembership(Number(designatedId), referrerId);
        if (designated) return designated;
    }

    const fallback = await query(
        `SELECT m.account_id
         FROM account_memberships m
         JOIN accounts a ON a.id = m.account_id
         WHERE m.user_id = $1 AND m.status = 'active' AND a.status = 'active'
         ORDER BY m.updated_at DESC, m.id DESC
         LIMIT 1`,
        [referrerId]
    );
    if (!fallback.rows[0]?.account_id) return null;
    return getOwnedMembership(Number(fallback.rows[0].account_id), referrerId);
}

async function referrerRewardsVestedTrailing12(referrerId: string): Promise<number> {
    const result = await query(
        `SELECT COUNT(*) AS total
         FROM referral_events
         WHERE referrer_id = $1
           AND status = 'vested'
           AND referrer_days > 0
           AND vested_at > NOW() - INTERVAL '12 months'`,
        [referrerId]
    );
    return Number(result.rows[0]?.total ?? 0);
}

/** Remove unclaimed parked grants after their configured 365-day window. */
async function expireParkedReferrerDays(): Promise<void> {
    const expired = await query(
        `SELECT id, referrer_reward_account_id, referrer_days
         FROM referral_events
         WHERE status = 'vested'
           AND referrer_reward_account_id IS NOT NULL
           AND referrer_days > 0
           AND referrer_applied_at < NOW() - ($1 || ' days')::INTERVAL
           AND void_reason IS NULL`,
        [PRICING.referralDays.parkedDaysExpiryDays]
    );

    for (const event of expired.rows) {
        const membership = await getMembershipByAccount(Number(event.referrer_reward_account_id));
        // A Stripe subscription means the grant was applied at checkout or directly
        // to Stripe, so it is no longer a parked balance that can expire.
        if (!membership || membership.stripe_subscription_id) continue;

        await updateMembership(membership.account_id, {
            pending_bonus_days: Math.max(0, membership.pending_bonus_days - Number(event.referrer_days)),
        });
        await query(
            `UPDATE referral_events
             SET status = 'void', referrer_days = 0, void_reason = 'parked_days_expired'
             WHERE id = $1 AND status = 'vested'`,
            [event.id]
        );
        console.log(`[Referral] Expired parked referrer days for event ${event.id}`);
    }
}

/**
 * Called by the Stripe webhook when a referred account's first payment
 * completes. The signature is intentionally fixed for the webhook contract.
 */
export async function handleReferralFirstPayment(opts: {
    referredUserId: string;
    accountId: number;
    plan: 'basic' | 'leaps';
    stripeSubscriptionId: string;
}): Promise<void> {
    const eventResult = await query(
        `SELECT id, status, referred_applied_at
         FROM referral_events
         WHERE referred_id = $1 AND referred_account_id = $2
         LIMIT 1`,
        [opts.referredUserId, opts.accountId]
    );
    const event = eventResult.rows[0];
    if (!event) return;

    if (event.referred_applied_at) {
        console.log(`[Referral] First-payment grant already applied for ${event.id}`);
        return;
    }
    if (!['attributed', 'pending'].includes(event.status)) {
        console.log(`[Referral] Ignored first payment for ${event.id}, status=${event.status}`);
        return;
    }

    const membership = await getOwnedMembership(opts.accountId, opts.referredUserId);
    if (!membership) throw new Error(`Referral account ${opts.accountId} is not owned by the referred user`);

    const refereeDays = daysForDollars(PRICING.referralDays.refereeDollars, opts.plan);
    await extendStripeSubscription(opts.stripeSubscriptionId, refereeDays);

    await query(
        `UPDATE referral_events
         SET status = 'pending',
             converted_plan = $2,
             converted_at = COALESCE(converted_at, NOW()),
             vests_at = NOW() + ($3 || ' days')::INTERVAL,
             referred_plan = $4,
             referred_days = $5,
             referred_applied_at = NOW()
         WHERE id = $1`,
        [event.id, opts.plan, PRICING.referralDays.vestingDays, opts.plan, refereeDays]
    );
    await updateMembership(membership.account_id, { status: 'active', stripe_subscription_id: opts.stripeSubscriptionId });

    console.log(`[Referral] Applied ${refereeDays} referee days for event ${event.id}; referrer vests in ${PRICING.referralDays.vestingDays} days`);
}

/** Vest due referrer grants. Called by the protected daily cron. */
export async function vestDueReferrals(): Promise<{ vested: number; voided: number; capped: number }> {
    await expireParkedReferrerDays();
    const due = await query(
        `SELECT id, referrer_id, referred_id, referred_account_id
         FROM referral_events
         WHERE status = 'pending' AND vests_at <= NOW()
         ORDER BY vests_at ASC
         LIMIT 200`
    );

    let vested = 0;
    let voided = 0;
    let capped = 0;

    for (const event of due.rows) {
        const refereeMembership = event.referred_account_id
            ? await getOwnedMembership(Number(event.referred_account_id), event.referred_id)
            : null;
        if (!refereeMembership || refereeMembership.status !== 'active') {
            await query(
                `UPDATE referral_events
                 SET status = 'void', void_reason = 'referee_churned'
                 WHERE id = $1 AND status = 'pending'`,
                [event.id]
            );
            voided++;
            continue;
        }

        const previousRewards = await referrerRewardsVestedTrailing12(event.referrer_id);
        const capReached = previousRewards >= PRICING.referralDays.maxReferrerDollarsPerYear / PRICING.referralDays.referrerDollars;

        // Vesting only marks the grant ready. The referrer chooses which
        // account receives the days when they apply the reward on /refer, so
        // no reward account needs to exist (or be designated) up front.
        await query(
            `UPDATE referral_events
             SET status = 'vested',
                 vested_at = NOW(),
                 void_reason = $2
             WHERE id = $1 AND status = 'pending'`,
            [event.id, capReached ? 'annual_cap' : null]
        );
        vested++;
        if (capReached) capped++;
        console.log(`[Referral] Vested event ${event.id}: $${PRICING.referralDays.referrerDollars} ready to apply${capReached ? ' (annual_cap)' : ''}`);
    }

    return { vested, voided, capped };
}

/** Trailing-12-month earned referrer value, used for review flagging. */
export async function getReferrerCompensationTrailing12(userId: string): Promise<{
    totalCents: number;
    thresholdCents: number;
    exceedsThreshold: boolean;
}> {
    const result = await query(
        `SELECT COUNT(*) FILTER (WHERE referrer_days > 0) AS reward_count
         FROM referral_events
         WHERE referrer_id = $1
           AND status = 'vested'
           AND vested_at > NOW() - INTERVAL '12 months'`,
        [userId]
    );
    const totalCents = Number(result.rows[0]?.reward_count ?? 0) * PRICING.referralDays.referrerDollars * 100;
    const thresholdCents = PRICING.referralDays.compensationTrackThresholdCents;
    return { totalCents, thresholdCents, exceedsThreshold: totalCents >= thresholdCents };
}

export async function getReferralStats(userId: string) {
    const [settingsResult, totalsResult, eventsResult, compensation] = await Promise.all([
        query(`SELECT referral_code, referral_reward_account_id, referral_display_name FROM user_settings WHERE user_id = $1`, [userId]),
        query(
            `SELECT COUNT(*) AS total,
                    COALESCE(SUM(referrer_days) FILTER (WHERE status = 'vested'), 0) AS earned_days,
                    COALESCE(SUM(referrer_days) FILTER (WHERE status = 'pending'), 0) AS pending_days
             FROM referral_events WHERE referrer_id = $1`,
            [userId]
        ),
        query(
            `SELECT id, converted_at, status, vests_at, vested_at, referrer_days,
                    referred_days, referred_plan, void_reason,
                    referrer_applied_at, referrer_reward_account_id,
                    grant_dollars, applied_dollars
             FROM referral_events
             WHERE referrer_id = $1
             ORDER BY COALESCE(converted_at, vested_at) DESC NULLS LAST
             LIMIT 10`,
            [userId]
        ),
        getReferrerCompensationTrailing12(userId),
    ]);

    const rewardAccountId = settingsResult.rows[0]?.referral_reward_account_id
        ? Number(settingsResult.rows[0].referral_reward_account_id)
        : null;
    const rewardMembership = rewardAccountId ? await getOwnedMembership(rewardAccountId, userId) : null;
    const code = settingsResult.rows[0]?.referral_code ?? '';

    const claimableCount = eventsResult.rows.filter((r: any) => {
        if (r.status !== 'vested' || r.void_reason) return false;
        const remaining = Number(r.grant_dollars ?? PRICING.referralDays.referrerDollars) - Number(r.applied_dollars ?? 0);
        return remaining > 0.004;
    }).length;

    return {
        code,
        displayName: (settingsResult.rows[0]?.referral_display_name ?? '').trim(),
        shareLink: code ? `https://trademind.bot/?ref=${code}` : '',
        totalReferrals: Number(totalsResult.rows[0]?.total ?? 0),
        totalEarnedDays: Number(totalsResult.rows[0]?.earned_days ?? 0),
        pendingDays: Number(totalsResult.rows[0]?.pending_days ?? 0),
        claimableCount,
        recentEvents: eventsResult.rows,
        rewardAccount: rewardMembership ? {
            accountId: rewardMembership.account_id,
            plan: rewardMembership.plan,
            status: rewardMembership.status,
            hasStripeSubscription: Boolean(rewardMembership.stripe_subscription_id),
            pendingBonusDays: rewardMembership.pending_bonus_days,
        } : null,
        program: {
            referrerDollars: PRICING.referralDays.referrerDollars,
            refereeDollars: PRICING.referralDays.refereeDollars,
            vestingDays: PRICING.referralDays.vestingDays,
            maxReferrerDollarsPerYear: PRICING.referralDays.maxReferrerDollarsPerYear,
            referrerDaysBasic: daysForDollars(PRICING.referralDays.referrerDollars, 'basic'),
            referrerDaysLeaps: daysForDollars(PRICING.referralDays.referrerDollars, 'leaps'),
            refereeDaysBasic: daysForDollars(PRICING.referralDays.refereeDollars, 'basic'),
            refereeDaysLeaps: daysForDollars(PRICING.referralDays.refereeDollars, 'leaps'),
        },
        compensation,
    };
}
