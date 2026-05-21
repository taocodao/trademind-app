/**
 * Whop SDK Initialization
 * =======================
 * Single import used across all Whop-related routes.
 *
 * Trial products are identified by their **product URL slug** (the slug shown
 * in the Whop dashboard "Product URL" field), NOT by plan ID env vars.
 * This way, no env vars are needed to distinguish 30-day from 60-day products.
 *
 * Known slugs (from Whop dashboard):
 *   30-day $10  → product slug: "trademind-algo-signals-30day"
 *                 checkout redirect: https://trademind.bot/trademind-algo-signals-30day
 *   60-day $20  → product slug: "trademind-signal-free-trial"
 *                 checkout redirect: https://trademind.bot/trademind-algo-signals-60day
 */

import Whop from '@whop/sdk';

const isSandbox = process.env.WHOP_SANDBOX === 'true';

export const whop = new Whop({
    apiKey:     process.env.WHOP_API_KEY ?? '',
    appID:      process.env.WHOP_APP_ID,
    webhookKey: process.env.WHOP_WEBHOOK_SECRET ? btoa(process.env.WHOP_WEBHOOK_SECRET) : undefined,
    ...(isSandbox && { baseURL: 'https://sandbox-api.whop.com/api/v1' }),
});

if (isSandbox) {
    console.warn('[Whop] ⚠️  SANDBOX MODE — not production');
}

// ── Product Slug Constants ────────────────────────────────────────────────────
// These match the "Product URL" field in the Whop dashboard exactly.
// No env vars needed — slugs are stable and human-readable.

export const WHOP_SLUG_30DAY = 'trademind-algo-signals-30day';  // $10, 30 days
export const WHOP_SLUG_60DAY = 'trademind-algo-signals-60day';  // $20, 60 days

/**
 * Extract the product URL slug from a Whop webhook payload.
 * Whop places the slug in different fields depending on the event version.
 * We check all known locations and fall back gracefully.
 *
 * Priority order:
 *  1. data.plan?.url_slug            (v2 events)
 *  2. data.plan?.product?.url_slug   (v2 events, nested product)
 *  3. data.product?.url_slug         (some events include product directly)
 *  4. data.plan_id / plan.id         (ID that may contain slug text)
 *  5. metadata.product_slug          (optional metadata field)
 */
export function extractProductSlug(data: any): string {
    return (
        data?.plan?.url_slug ??
        data?.plan?.product?.url_slug ??
        data?.product?.url_slug ??
        data?.plan?.metadata?.url_slug ??
        // Fallback: sometimes the plan_id itself IS the slug on some Whop plans
        data?.plan_id ??
        data?.plan?.id ??
        ''
    );
}

/**
 * Returns the trial duration in days based on the product slug.
 *
 * slug = "trademind-signal-free-trial"     → 60 days ($20 product)
 * slug = "trademind-algo-signals-30day"    → 30 days ($10 product)
 * Any other slug/plan ID                   → 30 days (safe default)
 *
 * Also accepts the plan_id directly in case slug extraction fails —
 * it checks if the env var WHOP_PLAN_TRIAL_60 is set as a secondary guard.
 */
export function whopPlanTrialDays(slugOrPlanId: string): number {
    if (!slugOrPlanId) return 30;

    // Primary: match by known product slug
    if (
        slugOrPlanId === WHOP_SLUG_60DAY ||
        slugOrPlanId.includes('free-trial') ||     // "trademind-signal-free-trial"
        slugOrPlanId.includes('60day') ||
        slugOrPlanId.includes('60-day')
    ) {
        return 60;
    }

    // Secondary: env var override (only if set — useful in staging/test envs)
    if (
        process.env.WHOP_PLAN_TRIAL_60 &&
        slugOrPlanId === process.env.WHOP_PLAN_TRIAL_60
    ) {
        return 60;
    }

    return 30; // default
}

/**
 * Maps a product slug (or plan_id) → internal subscription_tier key.
 * Both trial slugs map to 'full_access' (all 3 strategies during trial).
 */
export function whopPlanToTier(slugOrPlanId: string): string {
    // Both trial products grant full_access during the trial period
    if (
        slugOrPlanId === WHOP_SLUG_30DAY ||
        slugOrPlanId === WHOP_SLUG_60DAY ||
        slugOrPlanId.includes('algo-signals') ||
        slugOrPlanId.includes('free-trial') ||
        slugOrPlanId.includes('30day') ||
        slugOrPlanId.includes('60day')
    ) {
        return 'full_access';
    }

    // Recurring paid plans (plan ID env vars — optional)
    const map: Record<string, string> = {
        [process.env.WHOP_PLAN_PRO    ?? '__pro__']:    'turbocore_pro_bundle',
        [process.env.WHOP_PLAN_LEAPS  ?? '__leaps__']:  'qqq_leaps',
        [process.env.WHOP_PLAN_BUNDLE ?? '__bundle__']: 'full_access',
    };

    return map[slugOrPlanId] ?? 'full_access';
}

/**
 * Returns true if this slug/plan ID is a trial product (30-day or 60-day).
 * Used to decide whether to issue trial bonus credits.
 */
export function isWhopTrialProduct(slugOrPlanId: string): boolean {
    if (!slugOrPlanId) return false;
    return (
        slugOrPlanId === WHOP_SLUG_30DAY ||
        slugOrPlanId === WHOP_SLUG_60DAY ||
        slugOrPlanId.includes('algo-signals') ||
        slugOrPlanId.includes('free-trial') ||
        slugOrPlanId.includes('30day') ||
        slugOrPlanId.includes('60day') ||
        // Also check env vars for backwards compatibility
        (!!process.env.WHOP_PLAN_TRIAL_30 && slugOrPlanId === process.env.WHOP_PLAN_TRIAL_30) ||
        (!!process.env.WHOP_PLAN_TRIAL_60 && slugOrPlanId === process.env.WHOP_PLAN_TRIAL_60)
    );
}

/** Post a message to a Whop channel — non-fatal */
export async function postToWhopChannel(channelId: string, content: string): Promise<void> {
    if (!process.env.WHOP_API_KEY || !channelId) return;
    try {
        await whop.messages.create({ channel_id: channelId, content });
    } catch (e) {
        console.warn('[Whop] Channel post failed (non-fatal):', e);
    }
}

/**
 * Send a DM to a Whop user.
 * 1. Create (or retrieve) the DM channel for the user
 * 2. Post a message into that channel
 */
export async function sendWhopDM(whopUserId: string, content: string): Promise<void> {
    if (!process.env.WHOP_API_KEY || !whopUserId) return;
    try {
        const dmChannel = await (whop as any).dmChannels.create({ user_id: whopUserId });
        const channelId = dmChannel?.id ?? dmChannel?.channel_id;
        if (!channelId) {
            console.warn('[Whop] DM channel creation returned no ID — skipping');
            return;
        }
        await whop.messages.create({ channel_id: channelId, content });
    } catch (e) {
        console.warn('[Whop] DM failed (non-fatal):', e);
    }
}
