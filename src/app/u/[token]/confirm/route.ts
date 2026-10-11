import { NextRequest, NextResponse } from 'next/server';
import { applyUnsubChoice, validToken, UNSUB_CHOICES, type UnsubChoice } from '@/lib/outreach/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * The unsubscribe page sends its choice here: choice = unsub | snooze_90 | snooze_180 | monthly,
 * optional why (repeatable) and comment. Applied immediately; unsub covers every TradeMind sender.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
    const { token } = await ctx.params;
    if (!validToken(token)) return NextResponse.json({ ok: false }, { status: 404 });
    let choice = '';
    let why: string[] = [];
    let comment: string | null = null;
    try {
        const ct = req.headers.get('content-type') ?? '';
        if (ct.includes('application/json')) {
            const b = await req.json();
            choice = String(b.choice ?? '');
            why = Array.isArray(b.why) ? b.why.map(String) : b.why ? [String(b.why)] : [];
            comment = b.comment ? String(b.comment) : null;
        } else {
            const fd = await req.formData();
            choice = String(fd.get('choice') ?? '');
            why = fd.getAll('why').map(String);
            comment = fd.get('comment') ? String(fd.get('comment')) : null;
        }
    } catch {
        return NextResponse.json({ ok: false }, { status: 400 });
    }
    if (!(UNSUB_CHOICES as string[]).includes(choice)) return NextResponse.json({ ok: false, error: 'bad choice' }, { status: 400 });
    const r = await applyUnsubChoice(token, choice as UnsubChoice, why, comment);
    if (r === 'unknown') return NextResponse.json({ ok: false }, { status: 404 });
    return NextResponse.json({ ok: true, choice });
}
