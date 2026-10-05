import { NextRequest, NextResponse } from 'next/server';
import { runSeedChecks } from '@/lib/newsletter/seed-monitor';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;

/** Reads the seed mailboxes and records where each newsletter issue landed.
 *  Cheap when nothing is pending (no IMAP connection is opened). */
export async function GET(req: NextRequest) {
    const expected = process.env.CRON_SECRET;
    if (!expected || req.headers.get('authorization') !== `Bearer ${expected}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        return NextResponse.json({ ok: true, ...(await runSeedChecks()) });
    } catch (err) {
        console.error('[cron/seed-check]', err);
        return NextResponse.json({ error: 'Seed check failed' }, { status: 500 });
    }
}
