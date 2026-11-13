import { NextRequest, NextResponse } from 'next/server';
import { validToken } from '@/lib/outreach/db';
import { oneClickSubscribe } from '@/lib/outreach/one-click';
import { signupRateLimited } from '@/lib/newsletter/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** A person pressed "Subscribe free" on a page opened from their personal link. Subscribes weekly at once. */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => ({}));
        const token = String(body?.token ?? '');
        if (!validToken(token)) return NextResponse.json({ result: 'form' });
        const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
        const ua = req.headers.get('user-agent');
        if (await signupRateLimited(ip)) return NextResponse.json({ result: 'form' });
        const result = await oneClickSubscribe({ token, ip, ua, cadence: 'weekly', pressed: true });
        return NextResponse.json({ result });
    } catch {
        return NextResponse.json({ result: 'form' });
    }
}
