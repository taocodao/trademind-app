import { NextRequest, NextResponse } from 'next/server';
import { setCadence, recordNewsletterEvent, ensureNewsletterTables } from '@/lib/newsletter/db';
import { readDailyLinkToken } from '@/lib/newsletter/daily-link';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** POST { k, cadence } switches one subscriber between the weekly and daily brief. k is the signed daily link token. */
export async function POST(req: NextRequest) {
    const body = await req.json().catch(() => ({}));
    const id = readDailyLinkToken(String(body.k ?? ''));
    const cadence = body.cadence === 'daily' ? 'daily' : body.cadence === 'weekly' ? 'weekly' : null;
    if (!id || !cadence) return NextResponse.json({ error: 'Invalid link' }, { status: 400 });
    await ensureNewsletterTables();
    const r = await query(`SELECT status FROM newsletter_subscribers WHERE id = $1`, [id]);
    if (!r.rows[0] || r.rows[0].status !== 'confirmed') return NextResponse.json({ error: 'Not an active subscription' }, { status: 409 });
    await setCadence(id, cadence);
    void recordNewsletterEvent('daily_click', { kind: `set_${cadence}` }, id);
    return NextResponse.json({ ok: true, cadence });
}
