import { NextRequest, NextResponse } from 'next/server';
import { confirmHuman } from '@/lib/outreach/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** POST { t, page } after 3 visible seconds on a landing page: marks the latest campaign click as a real person. */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const ok = await confirmHuman(String(body.t ?? ''));
        return NextResponse.json({ ok });
    } catch {
        return NextResponse.json({ ok: false }, { status: 400 });
    }
}
