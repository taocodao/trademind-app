import { NextRequest, NextResponse } from 'next/server';
import { tick } from '@/lib/outreach/sender';
import { getSettings, ensureOutreachTables } from '@/lib/outreach/db';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Invitation scheduler tick (every 5 minutes). Does nothing while outreach_settings.paused is 'true'.
 * GET ?status=1 returns counters only and never sends.
 */
export async function GET(req: NextRequest) {
    const expected = process.env.CRON_SECRET;
    if (!expected || req.headers.get('authorization') !== `Bearer ${expected}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        if (req.nextUrl.searchParams.get('status') === '1') {
            await ensureOutreachTables();
            const [settings, q, d, c] = await Promise.all([
                getSettings(),
                query(`SELECT state, COUNT(*)::int AS n FROM outreach_queue GROUP BY state ORDER BY state`),
                query(`SELECT domain, status, paused_reason FROM outreach_domains ORDER BY domain`),
                query(`SELECT status, COUNT(*)::int AS n FROM outreach_contacts GROUP BY status ORDER BY status`),
            ]);
            return NextResponse.json({ settings, queue: q.rows, domains: d.rows, contacts: c.rows });
        }
        return NextResponse.json({ ok: true, ...(await tick()) });
    } catch (err) {
        console.error('[cron/invite-send]', err);
        return NextResponse.json({ error: 'Tick failed' }, { status: 500 });
    }
}
