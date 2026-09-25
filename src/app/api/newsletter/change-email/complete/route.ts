import { NextRequest, NextResponse } from 'next/server';
import { confirmEmailChange } from '@/lib/newsletter/db';

export const dynamic = 'force-dynamic';

/** POST { token } -> completes a confirmed-subscriber email change. */
export async function POST(req: NextRequest) {
    try {
        const { token } = await req.json();
        if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });
        const result = await confirmEmailChange(String(token));
        if (result.outcome === 'done') return NextResponse.json(result);
        if (result.outcome === 'expired') return NextResponse.json(result, { status: 410 });
        return NextResponse.json({ error: 'Invalid link' }, { status: 404 });
    } catch (err) {
        console.error('[newsletter/change-email/complete]', err);
        return NextResponse.json({ error: 'Change failed' }, { status: 500 });
    }
}
