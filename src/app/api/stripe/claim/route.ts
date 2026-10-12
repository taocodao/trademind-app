import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe-server';
import { getPrivyUserId, upsertLoginEmail } from '@/lib/auth-helpers';
import { provisionCheckoutSession } from '@/lib/stripe-provision';
import { getMembershipByStripeSubscription } from '@/lib/membership';
import { query } from '@/lib/db';
import { EMAIL_RE } from '@/lib/stripe-prices';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** The email Privy has on file for a login, when the server can ask Privy directly (needs PRIVY_APP_SECRET). */
async function privyEmailFor(did: string): Promise<string | null> {
    const secret = process.env.PRIVY_APP_SECRET;
    const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
    if (!secret || !appId) return null;
    try {
        const res = await fetch(`https://auth.privy.io/api/v1/users/${encodeURIComponent(did)}`, {
            headers: { Authorization: `Basic ${Buffer.from(`${appId}:${secret}`).toString('base64')}`, 'privy-app-id': appId },
        });
        if (!res.ok) return null;
        const u = await res.json() as { linked_accounts?: Array<{ type?: string; address?: string; email?: string }> };
        const a = u.linked_accounts?.find((x) => x.type === 'email' || x.type === 'google_oauth');
        return (a?.address || a?.email || null)?.toLowerCase() ?? null;
    } catch { return null; }
}

/**
 * After a pay-first checkout the buyer signs in with the email they paid with. This turns the paid session into
 * that login's account (QQQ Basic $10,000 or QQQ LEAPS $25,000). The signed-in email must equal the paid email.
 */
export async function POST(req: NextRequest) {
    try {
        const userId = await getPrivyUserId(req);
        if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        const body = await req.json().catch(() => ({}));
        const sessionId = typeof body.sessionId === 'string' && body.sessionId.startsWith('cs_') ? body.sessionId : null;
        const claimedEmail = typeof body.loginEmail === 'string' ? body.loginEmail.trim().toLowerCase() : '';
        if (!sessionId || !EMAIL_RE.test(claimedEmail)) return NextResponse.json({ error: 'Missing details' }, { status: 400 });

        const session = await getStripe().checkout.sessions.retrieve(sessionId);
        if (session.metadata?.guest !== '1') return NextResponse.json({ error: 'Not a pay-first checkout' }, { status: 404 });
        const paidEmail = (session.metadata.guest_email ?? '').toLowerCase();
        const verified = await privyEmailFor(userId);
        const loginEmail = verified ?? claimedEmail;
        if (!paidEmail || loginEmail !== paidEmail) {
            return NextResponse.json({ error: 'email_mismatch', expected: paidEmail }, { status: 403 });
        }

        const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
        if (subId) {
            const owned = await getMembershipByStripeSubscription(subId);
            if (owned && owned.user_id !== userId) return NextResponse.json({ error: 'This payment is already linked to another login' }, { status: 409 });
        }

        await upsertLoginEmail(userId, loginEmail);
        const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
        if (customerId) {
            await query(
                `INSERT INTO user_settings (user_id, stripe_customer_id, updated_at) VALUES ($1, $2, NOW())
                 ON CONFLICT (user_id) DO UPDATE SET stripe_customer_id = COALESCE(user_settings.stripe_customer_id, EXCLUDED.stripe_customer_id), updated_at = NOW()`,
                [userId, customerId]
            );
        }

        const accountId = await provisionCheckoutSession(session, { userId });
        if (!accountId) return NextResponse.json({ error: 'Payment is not complete yet. Try again in a moment.' }, { status: 409 });

        if (subId) {
            try { await getStripe().subscriptions.update(subId, { metadata: { ...session.metadata, userId, account_id: String(accountId) } }); } catch { /* best effort */ }
        }
        return NextResponse.json({ ok: true, accountId });
    } catch (error) {
        console.error('Stripe claim error:', error);
        return NextResponse.json({ error: 'Unable to finish setting up your account' }, { status: 500 });
    }
}
