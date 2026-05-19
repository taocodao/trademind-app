/**
 * Whop SDK Initialization
 * =======================
 * Single import used across all Whop-related routes.
 * Plan IDs are read from env vars set after Whop store setup.
 *
 * Trial Plans (2):
 *   WHOP_PLAN_TRIAL_30  — 30-day $10 trial (trademind-algo-signals-30day)
 *   WHOP_PLAN_TRIAL_60  — 60-day $20 trial (trademind-algo-signals-60day)
 *
 * Sandbox mode: set WHOP_SANDBOX=true in .env.local to point at
 * sandbox-api.whop.com for testing with Whop test cards.
 * Remove / set to false before deploying to production.
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

/**
 * Maps a Whop plan_id → our internal subscription_tier key.
 *
 * Trial plans map to 'full_access' (all 3 strategies).
 * Paid recurring plans map to their respective tier.
 */
export function whopPlanToTier(planId: string): string {
    const map: Record<string, string> = {
        // Trial plans — both grant full_access for trial duration
        [process.env.WHOP_PLAN_TRIAL_30 ?? '__trial30__']: 'full_access',
        [process.env.WHOP_PLAN_TRIAL_60 ?? '__trial60__']: 'full_access',
        // Recurring paid plans
        [process.env.WHOP_PLAN_PRO      ?? '__pro__']:     'turbocore_pro_bundle',
        [process.env.WHOP_PLAN_LEAPS    ?? '__leaps__']:   'qqq_leaps',
        [process.env.WHOP_PLAN_BUNDLE   ?? '__bundle__']:  'full_access',
    };
    return map[planId] ?? 'full_access'; // default to full_access for unknown trial plans
}

/**
 * Returns the trial duration in days for a given Whop plan ID.
 * 60-day plan → 60. Everything else → 30 (default).
 */
export function whopPlanTrialDays(planId: string): number {
    if (planId === (process.env.WHOP_PLAN_TRIAL_60 ?? '__trial60__')) return 60;
    return 30;
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
 * Correct pattern per Whop API docs:
 *   1. Create (or retrieve) the DM channel for the user
 *   2. Post a message into that channel
 */
export async function sendWhopDM(whopUserId: string, content: string): Promise<void> {
    if (!process.env.WHOP_API_KEY || !whopUserId) return;
    try {
        // Step 1: Create DM channel (idempotent — returns existing channel if already open)
        const dmChannel = await (whop as any).dmChannels.create({ user_id: whopUserId });
        const channelId = dmChannel?.id ?? dmChannel?.channel_id;
        if (!channelId) {
            console.warn('[Whop] DM channel creation returned no ID — skipping');
            return;
        }
        // Step 2: Send message into the DM channel
        await whop.messages.create({ channel_id: channelId, content });
    } catch (e) {
        console.warn('[Whop] DM failed (non-fatal):', e);
    }
}
