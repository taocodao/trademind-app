import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';
import { isMembershipEntitled, listMembershipsForUser } from '@/lib/membership';

export const dynamic = 'force-dynamic';

interface ResolvedIdentity {
    userId: string;
    email: string | null;
}

async function resolveIdentity(req: NextRequest): Promise<ResolvedIdentity | null> {
    const cookieStore = await cookies();
    let userId = cookieStore.get('privy-user-id')?.value ?? '';
    const headerEmail = req.headers.get('X-User-Email') ?? req.headers.get('x-user-email');
    const email = headerEmail?.toLowerCase().trim() || null;

    if (!userId) {
        const authHeader = req.headers.get('Authorization');
        if (authHeader?.startsWith('Bearer ')) {
            try {
                const payload = JSON.parse(Buffer.from(authHeader.slice(7).split('.')[1], 'base64url').toString());
                userId = payload?.sub || payload?.privy_did || '';
            } catch {
                // Invalid token is handled as unauthenticated below.
            }
        }
    }
    return userId ? { userId, email } : null;
}

export async function GET(req: NextRequest) {
    try {
        const identity = await resolveIdentity(req);
        if (!identity) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        if (identity.email) {
            await query(
                `INSERT INTO user_settings (user_id, login_email, updated_at)
                 VALUES ($1, $2, NOW())
                 ON CONFLICT (user_id) DO UPDATE
                 SET login_email = EXCLUDED.login_email, updated_at = NOW()`,
                [identity.userId, identity.email]
            );
        }

        const [memberships, settingsResult] = await Promise.all([
            listMembershipsForUser(identity.userId),
            query(
                `SELECT email_signal_alerts, login_email, has_completed_onboarding,
                        global_auto_approve, preferred_language,
                        turbocore_pro_auto_approve, leaps_auto_approve
                 FROM user_settings WHERE user_id = $1`,
                [identity.userId]
            ),
        ]);
        const settings = settingsResult.rows[0] ?? {};
        const serializedMemberships = memberships.map((membership) => ({
            ...membership,
            entitled: isMembershipEntitled(membership),
        }));
        const entitledMemberships = serializedMemberships.filter((membership) => membership.entitled);
        const highestMembership = entitledMemberships.find((membership) => membership.status === 'active')
            ?? entitledMemberships[0]
            ?? null;
        const tier = entitledMemberships.length > 0 ? 'full_access' : 'observer';

        return NextResponse.json({
            // Compatibility shim for user-level consumers. Entitlement remains
            // account-scoped and the memberships array is the source of detail.
            tier,
            status: highestMembership?.status ?? null,
            currentPeriodEnd: highestMembership?.current_period_end ?? null,
            cancelAtPeriodEnd: highestMembership?.cancel_at_period_end ?? false,
            emailSignalAlerts: settings.email_signal_alerts === true,
            email_signal_alerts: settings.email_signal_alerts === true,
            email: settings.login_email ?? identity.email,
            hasCompletedOnboarding: settings.has_completed_onboarding ?? false,
            globalAutoApprove: settings.global_auto_approve !== false,
            strategyAutoApprove: {
                TQQQ_TURBOCORE_PRO: settings.turbocore_pro_auto_approve ?? false,
                QQQ_LEAPS: settings.leaps_auto_approve ?? false,
            },
            preferredLanguage: settings.preferred_language || 'en',
            memberships: serializedMemberships,
        });
    } catch (error) {
        console.error('Error fetching account memberships for tier:', error);
        return NextResponse.json({ error: 'Failed to find subscription tier' }, { status: 500 });
    }
}
