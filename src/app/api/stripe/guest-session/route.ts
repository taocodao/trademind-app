import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** What the /welcome page needs to know about a pay-first checkout: whether it is paid, which email, which plan. */
export async function GET(req: NextRequest) {
    const id = req.nextUrl.searchParams.get('session_id') ?? '';
    if (!id.startsWith('cs_')) return NextResponse.json({ valid: false }, { status: 400 });
    try {
        const s = await getStripe().checkout.sessions.retrieve(id);
        if (s.metadata?.guest !== '1') return NextResponse.json({ valid: false }, { status: 404 });
        const paid = s.status === 'complete' && (s.payment_status === 'paid' || s.payment_status === 'no_payment_required');
        return NextResponse.json({ valid: true, paid, email: s.metadata?.guest_email ?? s.customer_details?.email ?? null, plan: s.metadata?.plan ?? null });
    } catch {
        return NextResponse.json({ valid: false }, { status: 404 });
    }
}
