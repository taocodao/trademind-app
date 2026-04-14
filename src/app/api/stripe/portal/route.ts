import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import Stripe from 'stripe';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-01-27.acacia' as any,
});

export async function POST(req: NextRequest) {
    try {
        const cookieStore = await cookies();
        let userId = cookieStore.get('privy-user-id')?.value;

        // Fallback: Bearer token
        if (!userId) {
            const authHeader = req.headers.get('Authorization');
            if (authHeader?.startsWith('Bearer ')) {
                const token = authHeader.slice(7);
                try {
                    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
                    userId = payload?.sub || payload?.privy_did || '';
                } catch {
                    // malformed token
                }
            }
        }

        if (!userId) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const body = await req.json().catch(() => ({}));
        const locale: string = body.locale || 'en';

        const result = await pool.query(
            `SELECT stripe_customer_id FROM user_settings WHERE user_id = $1`,
            [userId]
        );

        const customerId = result.rows[0]?.stripe_customer_id;
        if (!customerId) {
            return NextResponse.json({ error: 'No Stripe customer found' }, { status: 404 });
        }

        const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

        const ALLOWED_LOCALES = ['en', 'es', 'zh'] as const;
        type PortalLocale = Stripe.BillingPortal.SessionCreateParams.Locale;
        const stripeLocale: PortalLocale = (ALLOWED_LOCALES.includes(locale as any) ? locale : 'en') as PortalLocale;

        const session = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: `${origin}/settings`,
            locale: stripeLocale,
        });

        return NextResponse.json({ url: session.url });
    } catch (error: any) {
        console.error('Stripe Portal Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create portal session' },
            { status: 500 }
        );
    }
}
