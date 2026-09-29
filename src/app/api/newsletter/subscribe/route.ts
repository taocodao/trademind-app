import { NextRequest, NextResponse } from 'next/server';
import {
    signup, signupRateLimited, confirmInstantly, logNewsletterSend,
} from '@/lib/newsletter/db';
import { sendConfirmationEmail, sendWelcomeEmail } from '@/lib/newsletter/email';

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

        // Instant mode (pricing popup): no confirmation step. The address is
        // confirmed immediately and the first issue goes out right away, then
        // issues 2-8 every two days and weekly after that (newsletter-drip cron).
        if (body.instant === true && 'subscriberId' in result) {
            const conf = await confirmInstantly(result.subscriberId);
            if (conf) {
                void sendWelcomeEmail({ to: conf.email, code: conf.code ?? '', offerExpires: conf.windowEnd ?? '' })
                    .then((ok) => logNewsletterSend({ email: conf.email, subscriberId: result.subscriberId, kind: 'welcome', ok }));
                // Issue 1 goes out right away through the shared send engine; the
                // send history (not a pointer) decides what each address gets next.
                const { sendNextIssue } = await import('@/lib/newsletter/send-engine');
                try {
                    await sendNextIssue(conf.email, {
                        bypassWindow: true,
                        subscriber: {
                            id: result.subscriberId,
                            discount_state: 'eligible',
                            window_end: conf.windowEnd,
                        },
                    });
                } catch (err) {
                    // The hourly drip picks this address up from its (empty) history.
                    console.error('[subscribe] first issue send failed', err);
                }
            }
            return NextResponse.json({
                ok: true, status: 'subscribed',
                message: 'Subscribed. Check your inbox: the first issue is on its way.',
            });
        }
        if (result.kind === 'moved-confirmed') {
            return NextResponse.json({ ok: true, status: 'already-confirmed', moved: true, message: 'This subscription is already active at your current address.' });
        }

        const emailed = await sendConfirmationEmail({
            to: result.email,
            confirmToken: result.confirmToken,
            changeToken: result.changeToken,
        });
        await logNewsletterSend({ email: result.email, subscriberId: result.subscriberId, kind: 'confirm', ok: emailed });

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
