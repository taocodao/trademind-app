import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { EMAIL_RE } from '@/lib/stripe-prices';
import { isPricingV2Enabled } from '@/lib/pricing-v2';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Tells the pricing UI whether pricing v2 is open and, for a given email, whether the subscriber price applies. */
export async function GET(req: NextRequest) {
    const enabled = isPricingV2Enabled();
    if (!enabled) return NextResponse.json({ enabled: false });
    const email = (req.nextUrl.searchParams.get('email') || '').trim();
    if (!email) return NextResponse.json({ enabled: true });
    if (!EMAIL_RE.test(email) || email.length > 200) return NextResponse.json({ enabled: true, subscriber: false });
    try {
        const r = await query(`SELECT 1 FROM newsletter_subscribers WHERE lower(email) = lower($1) AND status = 'confirmed' LIMIT 1`, [email]);
        return NextResponse.json({ enabled: true, subscriber: r.rows.length > 0 });
    } catch {
        return NextResponse.json({ enabled: true, subscriber: false });
    }
}
