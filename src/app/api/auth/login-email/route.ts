import { NextRequest, NextResponse } from 'next/server';
import { getPrivyUserId, upsertLoginEmail } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

/** Records the email the signed-in user logged in with, so it can be shown, used for alerts and matched to payments. */
export async function POST(req: NextRequest) {
    const userId = await getPrivyUserId(req);
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    await upsertLoginEmail(userId, email);
    return NextResponse.json({ ok: true });
}
