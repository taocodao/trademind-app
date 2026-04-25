/**
 * Whop SDK Initialization
 * =======================
 * Single import used across all Whop-related routes.
 * Plan IDs are read from env vars set after Whop store setup.
 */

import Whop from '@whop/sdk';

export const whop = new Whop({
    apiKey: process.env.WHOP_API_KEY ?? '',
    appID:  process.env.WHOP_APP_ID,
    webhookKey: process.env.WHOP_WEBHOOK_SECRET ? btoa(process.env.WHOP_WEBHOOK_SECRET) : undefined,
});

/** Maps a Whop plan_id → our internal subscription_tier key */
export function whopPlanToTier(planId: string): string {
    const map: Record<string, string> = {
        [process.env.WHOP_PLAN_BASE   ?? '__base__']:   'turbocore',
        [process.env.WHOP_PLAN_PRO    ?? '__pro__']:    'turbocore_pro',
        [process.env.WHOP_PLAN_BUNDLE ?? '__bundle__']: 'both_bundle',
        [process.env.WHOP_PLAN_TRIAL  ?? '__trial__']:  'turbocore',  // trial = base access
    };
    return map[planId] ?? 'observer';
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

/** Send a DM to a Whop user — non-fatal */
export async function sendWhopDM(whopUserId: string, content: string): Promise<void> {
    if (!process.env.WHOP_API_KEY || !whopUserId) return;
    try {
        await whop.messages.create({ channel_id: whopUserId, content });
    } catch (e) {
        console.warn('[Whop] DM failed (non-fatal):', e);
    }
}
