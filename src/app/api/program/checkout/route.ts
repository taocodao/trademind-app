import { NextRequest, NextResponse } from 'next/server';
import { createFoundingCheckout } from '@/lib/program/billing';
import { billingStart, type Interval, type PlanLevel } from '@/lib/program/rules';
import { loadParticipant, verifiedEmail } from '@/lib/program/session';

export const dynamic = 'force-dynamic';

/** Starts founding checkout. Only after free access has ended, only for the verified owner, never automatically. */
export async function POST(req: NextRequest) {
    const email = await verifiedEmail(req);
    if (!email) return NextResponse.json({ error: 'Sign in with a verified email.' }, { status: 401 });
    const p = await loadParticipant(email);
    if (!p || p.left_at || p.path !== 'founding') return NextResponse.json({ error: 'No founding choice on record.' }, { status: 404 });
    if (p.paid_started_at) return NextResponse.json({ error: 'Already active.' }, { status: 409 });
    if (new Date() < new Date(billingStart(p))) {
        return NextResponse.json({ error: 'Your free access is still running. Checkout opens when it ends.', billing_starts: billingStart(p) }, { status: 425 });
    }
    const r = await createFoundingCheckout({
        participantId: p.id, email, level: (p.founding_level === 'tracking' ? 'tracking' : 'research') as PlanLevel,
        interval: (p.founding_interval === 'year' ? 'year' : 'month') as Interval, origin: new URL(req.url).origin, customerId: p.stripe_customer_id,
    });
    if ('error' in r) return NextResponse.json({ error: r.error }, { status: r.status });
    return NextResponse.json({ url: r.url });
}
