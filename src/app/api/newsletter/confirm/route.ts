import { NextRequest, NextResponse } from 'next/server';
import {
    confirmByToken, previewConfirm, resendConfirmation, recordNewsletterEvent,
} from '@/lib/newsletter/db';
import { sendConfirmationEmail, sendWelcomeEmail } from '@/lib/newsletter/email';

export const dynamic = 'force-dynamic';

/** GET ?token= -> preview only. Loading this URL never confirms (scanner-safe). */
export async function GET(req: NextRequest) {
    const token = req.nextUrl.searchParams.get('token') ?? '';
    if (!token) return NextResponse.json({ valid: false }, { status: 400 });
    const preview = await previewConfirm(token);
    if (preview.valid) {
        await recordNewsletterEvent('confirmation_page_viewed', {});
    }
    return NextResponse.json(preview);
}

/** POST { token } -> the button press. This is the only path that confirms. */
export async function POST(req: NextRequest) {
    try {
        const { token } = await req.json();
        if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });
        const result = await confirmByToken(String(token));

        if (result.outcome === 'confirmed') {
            void sendWelcomeEmail({
                to: result.email,
                code: result.code,
                offerExpires: result.offerExpires,
            });
            // SparkLoop conversions are reported only after confirmation.
            if (result.source === 'sparkloop' && result.partnerId) {
                void reportSparkLoopConversion(result.subscriberId, result.partnerId);
            }
            return NextResponse.json(result);
        }
        if (result.outcome === 'already-confirmed') return NextResponse.json(result);
        if (result.outcome === 'expired') return NextResponse.json(result, { status: 410 });
        return NextResponse.json({ error: 'Invalid link' }, { status: 404 });
    } catch (err) {
        console.error('[newsletter/confirm]', err);
        return NextResponse.json({ error: 'Confirmation failed' }, { status: 500 });
    }
}

/** POST-equivalent for resend lives under PUT to keep actions explicit. */
export async function PUT(req: NextRequest) {
    try {
        const { token } = await req.json();
        if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });
        const result = await resendConfirmation(String(token));
        if (!result) return NextResponse.json({ error: 'Nothing to resend' }, { status: 404 });
        const emailed = await sendConfirmationEmail({
            to: result.email,
            confirmToken: result.confirmToken,
            changeToken: result.changeToken,
        });
        return NextResponse.json({ ok: true, emailed });
    } catch (err) {
        console.error('[newsletter/confirm PUT]', err);
        return NextResponse.json({ error: 'Resend failed' }, { status: 500 });
    }
}

async function reportSparkLoopConversion(subscriberId: number, partnerId: string): Promise<void> {
    // SparkLoop custom-integration reporting requires their API key, which is
    // not provisioned yet. Log the conversion so a backfill can pick it up.
    const { recordNewsletterEvent } = await import('@/lib/newsletter/db');
    await recordNewsletterEvent('sparkloop_conversion_reported', {
        partnerId,
        mode: process.env.SPARKLOOP_API_KEY ? 'api' : 'logged-only',
    }, subscriberId);
    if (process.env.SPARKLOOP_API_KEY) {
        try {
            await fetch('https://api.sparkloop.app/v2/conversions', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${process.env.SPARKLOOP_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ subscriber_id: subscriberId, partner_id: partnerId }),
            });
        } catch (err) {
            console.error('[sparkloop report]', err);
        }
    }
}
