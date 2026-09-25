import { NextRequest, NextResponse } from 'next/server';
import { createPendingSubscriber, recordNewsletterEvent } from '@/lib/newsletter/db';
import { sendConfirmationEmail } from '@/lib/newsletter/email';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const email = String(body.email ?? '');
        const experience = body.experience ? String(body.experience) : null;
        const consent = body.consent === true;

        const { subscriber, error } = await createPendingSubscriber(email, experience, consent);
        if (!subscriber) return NextResponse.json({ error }, { status: 400 });

        await recordNewsletterEvent('signup_submitted', { experience });
        const emailed = await sendConfirmationEmail({
            to: subscriber.email,
            confirmToken: subscriber.confirmToken,
            changeToken: subscriber.changeToken,
        });

        return NextResponse.json({
            ok: true,
            status: 'pending',
            emailed,
            message: 'Check your inbox to confirm and unlock 30% off.',
        });
    } catch (err) {
        console.error('[newsletter/subscribe]', err);
        return NextResponse.json({ error: 'Subscription failed' }, { status: 500 });
    }
}
