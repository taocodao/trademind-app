import { NextRequest, NextResponse } from 'next/server';
import { ensureNewsletterTables } from '@/lib/newsletter/db';
import {
    acquireRunLock, releaseRunLock, getSettings, runDripPass, hourET, inSendWindow,
} from '@/lib/newsletter/send-engine';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

/**
 * Newsletter drip cron (history-driven, Sep 2026).
 *
 * This job carries no issue number and no schedule state. Each run loops over
 * the whole address list (imported leads and website signups) and, per
 * address, sendNextIssue() reads the send history, works out the next issue,
 * checks whether it is due (cadence_days after the last completed issue) and
 * sends it. Cadence, send window, pacing and pause live in newsletter_settings.
 *
 *   GET ?dryRun=1  -> report what would be sent, send nothing
 *
 * A table lock stops overlapping runs (for example a second manual trigger
 * while the first is still working).
 */
export async function GET(req: NextRequest) {
    const expected = process.env.CRON_SECRET;
    if (!expected || req.headers.get('authorization') !== `Bearer ${expected}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dryRun = req.nextUrl.searchParams.get('dryRun') === '1';
    try {
        await ensureNewsletterTables();
        const settings = await getSettings();

        if (!dryRun) {
            if (settings.paused) return NextResponse.json({ ok: true, skipped: 'paused' });
            if (!inSendWindow(settings)) {
                return NextResponse.json({ ok: true, skipped: 'outside_window', hourET: hourET() });
            }
            if (!(await acquireRunLock())) {
                return NextResponse.json({ ok: true, skipped: 'already_running' });
            }
        }

        try {
            const summary = await runDripPass({ dryRun });
            return NextResponse.json({ ok: true, dryRun, settings, ...summary });
        } finally {
            if (!dryRun) await releaseRunLock();
        }
    } catch (err) {
        console.error('[cron/newsletter-drip]', err);
        return NextResponse.json({ error: 'Drip failed' }, { status: 500 });
    }
}
