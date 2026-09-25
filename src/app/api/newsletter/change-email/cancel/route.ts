import { NextRequest, NextResponse } from 'next/server';
import { cancelEmailChange } from '@/lib/newsletter/db';

export const dynamic = 'force-dynamic';

/** POST { token } -> "This wasn't me" from the old-address notice. */
export async function POST(req: NextRequest) {
    try {
        const { token } = await req.json();
        if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });
        const ok = await cancelEmailChange(String(token));
        return NextResponse.json({ ok }, { status: ok ? 200 : 404 });
    } catch (err) {
        console.error('[newsletter/change-email/cancel]', err);
        return NextResponse.json({ error: 'Cancel failed' }, { status: 500 });
    }
}
