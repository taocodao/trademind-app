import { NextRequest, NextResponse } from 'next/server';
import { validToken, getContact } from '@/lib/outreach/db';
import { oneClickSubscribe, sendIssueNow, sendIssueNowByEmail, nextIssueText } from '@/lib/outreach/one-click';
import { signupRateLimited } from '@/lib/newsletter/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * A person pressed a button on a page opened from their personal link.
 * Default: subscribe weekly at once. action "send": email the current issue link now.
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => ({}));
        const token = String(body?.token ?? '');
        if (!token && body?.action === 'send') {
            // Get issue for an address passed in the link: only for a confirmed subscriber, at most one send every 10 minutes.
            const em = String(body?.email ?? '').trim().toLowerCase();
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return NextResponse.json({ result: 'form' });
            const ip0 = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
            if (await signupRateLimited(ip0)) return NextResponse.json({ result: 'form' });
            return NextResponse.json({ result: await sendIssueNowByEmail(em), email: em, next: nextIssueText() });
        }
        if (!validToken(token)) return NextResponse.json({ result: 'form' });
        const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
        const ua = req.headers.get('user-agent');
        if (await signupRateLimited(ip)) return NextResponse.json({ result: 'form' });
        const c = await getContact(token);
        const email = c?.email ?? '';
        const next = nextIssueText();
        if (body?.action === 'send') return NextResponse.json({ result: await sendIssueNow(token), email, next });
        const result = await oneClickSubscribe({ token, ip, ua, cadence: 'weekly', pressed: true });
        return NextResponse.json({ result, email, next });
    } catch {
        return NextResponse.json({ result: 'form' });
    }
}
