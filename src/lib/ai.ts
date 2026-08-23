import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { isMembershipEntitled, listMembershipsForUser } from '@/lib/membership';

const VALID_FEATURES = ['screenshot', 'deepdive', 'briefing', 'strategy', 'debrief', 'chat'];

async function resolveEffectiveTier(userId: string): Promise<string> {
    const memberships = await listMembershipsForUser(userId);
    return memberships.some((membership) => isMembershipEntitled(membership))
        ? 'full_access'
        : 'observer';
}

export async function getUserFromRequest(_req: NextRequest) {
    const cookieStore = await cookies();
    const privyToken = cookieStore.get('privy-token')?.value;
    if (!privyToken) throw new Error('Unauthorized');

    const payload = privyToken.split('.')[1];
    const decoded = JSON.parse(Buffer.from(payload, 'base64').toString());
    const privyDid = decoded.sub || decoded.privy_did;
    if (!privyDid) throw new Error('Unauthorized');

    return { privyDid, tier: await resolveEffectiveTier(privyDid) };
}

/**
 * Chat is included with any entitled account. Other AI features remain
 * controlled by their active feature subscription rows.
 */
export async function checkFeatureAccess(privyDid: string, featureKey: string): Promise<{ allowed: boolean }> {
    if (!VALID_FEATURES.includes(featureKey)) return { allowed: false };

    if (featureKey === 'chat') {
        return { allowed: (await resolveEffectiveTier(privyDid)) !== 'observer' };
    }

    const result = await query(
        `SELECT id FROM ai_feature_subscriptions WHERE user_id = $1 AND feature_key = $2 AND status = 'active'`,
        [privyDid, featureKey]
    );
    return { allowed: result.rows.length > 0 };
}
