import { NextRequest, NextResponse } from 'next/server';
import { recordNewsletterEvent } from '@/lib/newsletter/db';

export const dynamic = 'force-dynamic';

/** POST { event, meta } -> newsletter analytics (allow-listed events). */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const ok = await recordNewsletterEvent(String(body.event ?? ''), body.meta ?? {});
        return NextResponse.json({ ok }, { status: ok ? 200 : 400 });
    } catch {
        return NextResponse.json({ ok: false }, { status: 400 });
    }
}
