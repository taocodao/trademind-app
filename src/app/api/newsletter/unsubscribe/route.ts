import { NextRequest, NextResponse } from 'next/server';
import { unsubscribeByToken } from '@/lib/newsletter/db';

export const dynamic = 'force-dynamic';

/**
 * One-click unsubscribe (RFC 8058): mail clients POST here from the
 * List-Unsubscribe header. The visible link also lands here from the
 * unsubscribe page.
 */
export async function POST(req: NextRequest) {
    try {
        let token = '';
        const contentType = req.headers.get('content-type') ?? '';
        if (contentType.includes('application/x-www-form-urlencoded')) {
            // RFC 8058 one-click body: "List-Unsubscribe=One-Click"; the token
            // travels in the query string of the List-Unsubscribe URL.
            token = req.nextUrl.searchParams.get('token') ?? '';
        } else {
            const body = await req.json().catch(() => ({}));
            token = String(body.token ?? req.nextUrl.searchParams.get('token') ?? '');
        }
        if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });
        const result = await unsubscribeByToken(token);
        if (result === 'not-found') return NextResponse.json({ error: 'Invalid link' }, { status: 404 });
        return NextResponse.json({ ok: true, result });
    } catch (err) {
        console.error('[newsletter/unsubscribe]', err);
        return NextResponse.json({ error: 'Unsubscribe failed' }, { status: 500 });
    }
}
