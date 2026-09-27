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
                const { getIssueByNumber, sendIssueEmail } = await import('@/lib/newsletter/issue-email');
                const first = getIssueByNumber(1);
                if (first) {
                    const ok = await sendIssueEmail(first, {
                        id: result.subscriberId, email: conf.email, referral_id: null,
                        discount_state: 'eligible', window_end: conf.windowEnd,
                    });
                    await logNewsletterSend({
                        email: conf.email, subscriberId: result.subscriberId, kind: 'issue',
                        issueNumber: first.number, issueSlug: first.slug, ok,
                    });
                    // Issue 1 sent now; issue 2 lands in two days.
                    const { query } = await import('@/lib/db');
                    await query(
                        `UPDATE newsletter_directory SET next_issue = 2, next_issue_at = NOW() + INTERVAL '2 days' WHERE email = $1`,
                        [conf.email]
                    );
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
