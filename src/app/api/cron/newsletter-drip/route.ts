import { NextRequest, NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { ensureNewsletterTables } from '@/lib/newsletter/db';
import {
    acquireRunLock, releaseRunLock, getSettings, runDripPass, hourET, inSendWindow,
} from '@/lib/newsletter/send-engine';

/** Hard cap on chained invocations per daily run (runaway guard). */
const MAX_CHAIN_DEPTH = 30;

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
 * The list is walked in batches (keyset cursor on created_at/email). When a
 * batch finishes with addresses remaining, the route chains one more
 * invocation via waitUntil(fetch) so a 10k+ list completes in a single daily
 * run without ever exceeding the function time limit.
 *
 * A table lock stops overlapping runs (for example a second manual trigger
 * while the first is still working). Chained runs release the lock before
 * calling the next batch, which re-acquires it.
 */
export async function GET(req: NextRequest) {
    const expected = process.env.CRON_SECRET;
    if (!expected || req.headers.get('authorization') !== `Bearer ${expected}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dryRun = req.nextUrl.searchParams.get('dryRun') === '1';
    const cursor = req.nextUrl.searchParams.get('cursor');
    const chain = Number(req.nextUrl.searchParams.get('chain') ?? '0');
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
            // Reconcile delivery status only on the first batch of a run.
            const summary = await runDripPass({ dryRun, cursor, runReconcile: chain === 0 });

            // Chain the next batch after this invocation ends, so each batch
            // gets a fresh function time budget. The fetch runs via waitUntil:
            // the response is already sent, but the platform keeps the function
            // alive long enough to dispatch the next request.
            if (!dryRun && summary.hasMore && summary.nextCursor && chain < MAX_CHAIN_DEPTH) {
                const nextUrl = new URL(req.nextUrl);
                nextUrl.searchParams.set('cursor', summary.nextCursor);
                nextUrl.searchParams.set('chain', String(chain + 1));
                const auth = req.headers.get('authorization') ?? '';
                waitUntil((async () => {
                    // The next invocation starts as soon as the request is
                    // dispatched; waiting for its full response would hold this
                    // function alive for the whole batch. Abort after dispatch
                    // so this invocation can end on time.
                    const ac = new AbortController();
                    const timer = setTimeout(() => ac.abort(), 10_000);
                    try {
                        await fetch(nextUrl.toString(), {
                            headers: { authorization: auth }, signal: ac.signal,
                        });
                    } catch (err) {
                        if (!ac.signal.aborted) {
                            console.error('[cron/newsletter-drip] chain fetch failed', err);
                        }
                    } finally {
                        clearTimeout(timer);
                    }
                })());
            }

            return NextResponse.json({ ok: true, dryRun, chain, settings, ...summary });
        } finally {
            if (!dryRun) await releaseRunLock();
        }
    } catch (err) {
        console.error('[cron/newsletter-drip]', err);
        return NextResponse.json({ error: 'Drip failed' }, { status: 500 });
    }
}
