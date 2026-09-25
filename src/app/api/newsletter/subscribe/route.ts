import { NextRequest, NextResponse } from 'next/server';
import { signup, signupRateLimited } from '@/lib/newsletter/db';
import { sendConfirmationEmail } from '@/lib/newsletter/email';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        // Honeypot: bots fill the invisible "website" field; humans never see it.
        if (body.website) return NextResponse.json({ ok: true, status: 'pending' });

        const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
        const ua = req.headers.get('user-agent') ?? null;
        if (await signupRateLimited(ip)) {
            return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 });
        }

        const result = await signup({
            rawEmail: String(body.email ?? ''),
            experience: body.experience ? String(body.experience) : null,
            consent: body.consent === true,
            source: body.source ? String(body.source) : 'website',
            medium: body.medium ? String(body.medium) : null,
            campaign: body.campaign ? String(body.campaign) : null,
            referringIssue: body.referringIssue ? String(body.referringIssue) : null,
            referralId: body.referralId ? String(body.referralId) : null,
            ip, ua,
        });

        if (result.kind === 'error') {
            return NextResponse.json({ error: result.message }, { status: 400 });
        }
        if (result.kind === 'already-confirmed') {
            return NextResponse.json({ ok: true, status: 'already-confirmed', message: "You're already subscribed" });
        }
        if (result.kind === 'moved-confirmed') {
            return NextResponse.json({ ok: true, status: 'already-confirmed', moved: true, message: 'This subscription is already active at your current address.' });
        }

        const emailed = await sendConfirmationEmail({
            to: result.email,
            confirmToken: result.confirmToken,
            changeToken: result.changeToken,
        });

        return NextResponse.json({
            ok: true,
            status: 'pending',
            emailed,
            message: 'Check your inbox to confirm and unlock 30% off.',
            changeUrl: `/newsletter/change-email?token=${result.changeToken}`,
        });
    } catch (err) {
        console.error('[newsletter/subscribe]', err);
        return NextResponse.json({ error: 'Subscription failed' }, { status: 500 });
    }
}
