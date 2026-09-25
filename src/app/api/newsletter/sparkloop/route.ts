import { NextRequest, NextResponse } from 'next/server';
import { signup } from '@/lib/newsletter/db';
import { sendConfirmationEmail } from '@/lib/newsletter/email';

export const dynamic = 'force-dynamic';

/**
 * SparkLoop custom-integration webhook: creates a pending subscriber with
 * source=sparkloop and the partner id saved. The conversion is reported back
 * to SparkLoop only after the subscriber confirms (see the confirm route).
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const email = String(body.email ?? '');
        const partnerId = body.partner_id ? String(body.partner_id) : null;
        if (!email.includes('@')) {
            return NextResponse.json({ error: 'Missing email' }, { status: 400 });
        }

        const result = await signup({
            rawEmail: email,
            consent: true, // SparkLoop referrals arrive with the referrer's introduction; double opt-in still gates delivery.
            source: 'sparkloop',
            partnerId,
            referralId: body.referral_id ? String(body.referral_id) : null,
            ip: null,
            ua: 'sparkloop-webhook',
        });

        if (result.kind === 'error') {
            return NextResponse.json({ error: result.message }, { status: 400 });
        }
        if (result.kind === 'already-confirmed' || result.kind === 'moved-confirmed') {
            return NextResponse.json({ ok: true, status: 'already-confirmed' });
        }
        const emailed = await sendConfirmationEmail({
            to: result.email,
            confirmToken: result.confirmToken,
            changeToken: result.changeToken,
        });
        return NextResponse.json({ ok: true, status: 'pending', emailed });
    } catch (err) {
        console.error('[newsletter/sparkloop]', err);
        return NextResponse.json({ error: 'Webhook failed' }, { status: 500 });
    }
}
