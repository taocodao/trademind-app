/**
 * Whop Community Tier Sync
 * =========================
 * Manages the FREE Whop community tier for users who have converted
 * from a Whop trial to a Stripe subscription.
 *
 * After a Stripe subscription is confirmed, we promote the user to a
 * free Whop community product so they keep DMs, chat, and courses
 * without paying through Whop.
 *
 * After Stripe cancellation, we revoke the free community entitlement.
 *
 * Env vars required:
 *   WHOP_FREE_PLAN_ID — plan ID of the free community-only Whop product
 *                       (create manually in Whop Dashboard → Products → Free)
 */

import { whop } from '@/lib/whop';

const FREE_PLAN_ID = process.env.WHOP_FREE_PLAN_ID ?? '';

/**
 * Promote a Whop user to the free community tier.
 * Called after successful Stripe subscription (checkout.session.completed).
 * Non-fatal — logs warnings if Whop API fails.
 */
export async function promoteToWhopCommunity(whopUserId: string): Promise<void> {
    if (!FREE_PLAN_ID) {
        console.warn('[WhopCommunity] WHOP_FREE_PLAN_ID not set — skipping community promotion');
        return;
    }
    if (!whopUserId) return;

    try {
        await (whop as any).memberships.create({
            plan_id: FREE_PLAN_ID,
            user_id: whopUserId,
        });
        console.log(`[WhopCommunity] Promoted ${whopUserId} to free community tier`);
    } catch (e: any) {
        // Non-fatal — user keeps Stripe access, just won't have Whop community
        console.warn(`[WhopCommunity] Promotion failed for ${whopUserId} (non-fatal):`, e.message ?? e);
    }
}

/**
 * Revoke the free community tier for a Whop user.
 * Called after Stripe subscription cancellation (customer.subscription.deleted).
 * Non-fatal — logs warnings if Whop API fails.
 */
export async function revokeWhopCommunity(whopUserId: string): Promise<void> {
    if (!FREE_PLAN_ID || !whopUserId) return;

    try {
        // List active memberships for this user on the free plan
        const result = await (whop as any).memberships.list({
            user_id: whopUserId,
            plan_id: FREE_PLAN_ID,
            status:  'active',
        });

        const memberships = result?.data ?? result?.memberships ?? [];
        for (const membership of memberships) {
            const membershipId = membership.id ?? membership.membership_id;
            if (membershipId) {
                await (whop as any).memberships.cancel({ membershipId });
                console.log(`[WhopCommunity] Revoked membership ${membershipId} for ${whopUserId}`);
            }
        }
    } catch (e: any) {
        console.warn(`[WhopCommunity] Revocation failed for ${whopUserId} (non-fatal):`, e.message ?? e);
    }
}
