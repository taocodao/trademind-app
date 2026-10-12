import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';
import { getStripe } from '@/lib/stripe-server';
import { provisionCheckoutSession, reconcileUserCheckouts } from '@/lib/stripe-provision';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function getUserId(req: NextRequest): Promise<string | null> {
    const cookieStore = await cookies();
    const cookieUserId = cookieStore.get('privy-user-id')?.value;
    if (cookieUserId) return cookieUserId;
    const privyToken = cookieStore.get('privy-token')?.value;
    if (privyToken) {
        try {
            const payload = JSON.parse(Buffer.from(privyToken.split('.')[1], 'base64url').toString());
            const id = payload?.sub || payload?.privy_did || null;
            if (id) return id;
        } catch { /* fall through */ }
    }
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return null;
    try {
        const payload = JSON.parse(Buffer.from(authHeader.slice(7).split('.')[1], 'base64url').toString());
        return payload?.sub || payload?.privy_did || null;
    } catch {
        return null;
    }
}

/**
 * Post-checkout confirmation. Called by /accounts right after Stripe
 * redirects back (with ?session_id) and whenever a signed-in user has no
 * accounts. Turns any paid Checkout Session for this user into its account,
 * so provisioning never depends on the webhook alone.
 */
export async function POST(req: NextRequest) {
    try {
        if (!process.env.STRIPE_SECRET_KEY) {
            return NextResponse.json({ error: 'Stripe configuration error' }, { status: 500 });
        }
        const userId = await getUserId(req);
        if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        const body = await req.json().catch(() => ({}));
        const sessionId = typeof body.sessionId === 'string' && body.sessionId.startsWith('cs_') ? body.sessionId : null;

        const accountIds: number[] = [];
        if (sessionId) {
            const session = await getStripe().checkout.sessions.retrieve(sessionId);
            if (session.metadata?.userId !== userId) {
                return NextResponse.json({ error: 'Checkout session does not belong to this login' }, { status: 403 });
            }
            const id = await provisionCheckoutSession(session);
            if (id) accountIds.push(id);
        }
        // Keep Stripe's customer email equal to this login's email (invoices and receipts go there).
        try {
            const row = await query('SELECT stripe_customer_id, login_email FROM user_settings WHERE user_id = $1', [userId]);
            const cid = row.rows[0]?.stripe_customer_id as string | undefined;
            const le = (row.rows[0]?.login_email as string | undefined)?.trim();
            if (cid && le) {
                const cust = await getStripe().customers.retrieve(cid);
                if (!('deleted' in cust && cust.deleted) && (cust as { email?: string | null }).email?.toLowerCase() !== le.toLowerCase()) {
                    await getStripe().customers.update(cid, { email: le });
                }
            }
        } catch (err) { console.warn('[confirm] customer email sync failed', err); }
        // Pay-first purchases that were never claimed (tab closed after paying): when this login's email matches the paid email.
        const loginEmail = typeof body.loginEmail === 'string' ? body.loginEmail.trim().toLowerCase() : '';
        if (loginEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginEmail)) {
            try {
                const list = await getStripe().checkout.sessions.list({ customer_details: { email: loginEmail }, status: 'complete', limit: 10 });
                for (const s of list.data) {
                    if (s.metadata?.guest !== '1' || (s.metadata.guest_email ?? '') !== loginEmail) continue;
                    const id = await provisionCheckoutSession(s, { userId });
                    if (id && !accountIds.includes(id)) accountIds.push(id);
                }
            } catch (err) { console.warn('[confirm] guest reconcile failed', err); }
        }
        for (const id of await reconcileUserCheckouts(userId)) {
            if (!accountIds.includes(id)) accountIds.push(id);
        }
        return NextResponse.json({ ok: true, accountIds });
    } catch (error: unknown) {
        console.error('Stripe confirm error:', error);
        const message = error instanceof Error ? error.message : 'Unable to confirm checkout';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
