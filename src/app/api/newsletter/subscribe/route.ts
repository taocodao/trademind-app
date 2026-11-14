import { NextRequest, NextResponse } from 'next/server';
import {
    signup, signupRateLimited, confirmInstantly, setCadence,
} from '@/lib/newsletter/db';
import { sendSubscriberLink } from '@/lib/newsletter/link-send';
import { nextIssueText } from '@/lib/newsletter/weekly';
import { markContactByToken, validToken } from '@/lib/outreach/db';

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
        // Invitation campaign: tie this signup to the contact whose personal link was used.
        if (body.outreachToken && 'email' in result && result.email) {
            void markContactByToken(String(body.outreachToken), String(result.email), 'subscribed');
        }
        if ('subscriberId' in result && result.subscriberId && (body.cadence === 'daily' || body.cadence === 'weekly' || body.cadence === 'both')) {
            await setCadence(result.subscriberId, body.cadence);
        }
        const cadence: 'weekly' | 'daily' | 'both' = body.cadence === 'daily' ? 'daily' : body.cadence === 'both' ? 'both' : 'weekly';
        const tok = body.outreachToken && validToken(String(body.outreachToken)) ? `&t=${String(body.outreachToken)}` : '';
        const thanks = (extra = '') => `/newsletter/thanks?c=${cadence === 'daily' ? 'daily' : 'weekly'}${tok}${extra}`;
        if (result.kind === 'already-confirmed') {
            return NextResponse.json({ ok: true, status: 'already-confirmed', message: "You're already subscribed", next: await nextIssueText(String(body.email ?? '')), redirect: thanks('&already=1') });
        }
        if (result.kind === 'moved-confirmed') {
            return NextResponse.json({ ok: true, status: 'already-confirmed', moved: true, message: 'This subscription is already active at your current address.', next: await nextIssueText(String(body.email ?? '')), redirect: thanks('&already=1') });
        }

        // Every signup is instant: no confirmation email. The address is confirmed at once and the
        // only email sent is a link to the current issue on the website.
        if ('subscriberId' in result && result.subscriberId) {
            const conf = await confirmInstantly(result.subscriberId);
            if (!conf) return NextResponse.json({ error: 'Subscription failed' }, { status: 500 });
            await sendSubscriberLink({ email: conf.email, subscriberId: result.subscriberId, cadence });
            const returning = 'returning' in result && result.returning === true;
            return NextResponse.json({
                ok: true, status: 'subscribed', returning,
                message: returning ? 'Welcome back. You are subscribed.' : 'You are subscribed.',
                next: await nextIssueText(conf.email),
                redirect: thanks(),
            });
        }
        return NextResponse.json({ error: 'Subscription failed' }, { status: 500 });
    } catch (err) {
        console.error('[newsletter/subscribe]', err);
        return NextResponse.json({ error: 'Subscription failed' }, { status: 500 });
    }
}
