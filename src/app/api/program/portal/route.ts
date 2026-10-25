import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe-server';
import { loadParticipant, verifiedEmail } from '@/lib/program/session';

export const dynamic = 'force-dynamic';

/** Billing portal for program members, so they can cancel online at any time. */
export async function POST(req: NextRequest) {
    const email = await verifiedEmail(req);
    if (!email) return NextResponse.json({ error: 'Sign in with a verified email.' }, { status: 401 });
    const p = await loadParticipant(email);
    if (!p?.stripe_customer_id) return NextResponse.json({ error: 'No billing record.' }, { status: 404 });
    const s = await getStripe().billingPortal.sessions.create({ customer: p.stripe_customer_id, return_url: `${new URL(req.url).origin}/founding/choose` });
    return NextResponse.json({ url: s.url });
}
