import { NextRequest, NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { ensureNewsletterTables } from '@/lib/newsletter/db';
import {
    acquireRunLock, releaseRunLock, getSettings, runDripPass, hourET, inSendWindow,
    etDateString, getRunState, saveRunState, type RunSummary,
} from '@/lib/newsletter/send-engine';

/** Hard cap on chained invocations per daily run (runaway guard).
 *  120 batches x 200 addresses covers a 24,000-address directory. */
const MAX_CHAIN_DEPTH = 120;

/** Chain dispatch attempts before giving up; the run resumes tomorrow either way. */
const CHAIN_DISPATCH_ATTEMPTS = 3;

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
 * Run position is persisted in newsletter_settings (run_day, run_cursor,
 * run_done), keyed by Eastern calendar day. The cron fires every 10 minutes
 * through the morning; the first fire of the day starts a run and later fires
 * resume it or exit immediately once it is complete. So a failed chain
 * dispatch never strands part of the list: the next fire picks it up.
 *
 *   GET ?force=1   -> start a fresh run today even if one already completed
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
    const force = req.nextUrl.searchParams.get('force') === '1';
    const dryCursor = req.nextUrl.searchParams.get('cursor');
    const chain = Number(req.nextUrl.searchParams.get('chain') ?? '0');
    let summary: RunSummary;
    let settings;
    try {
        await ensureNewsletterTables();
        settings = await getSettings();

        if (dryRun) {
            summary = await runDripPass({ dryRun: true, cursor: dryCursor, runReconcile: false });
            return NextResponse.json({ ok: true, dryRun, chain, settings, ...summary });
        }

        if (settings.paused) return NextResponse.json({ ok: true, skipped: 'paused' });
        if (!inSendWindow(settings)) {
            return NextResponse.json({ ok: true, skipped: 'outside_window', hourET: hourET() });
        }
        if (!(await acquireRunLock())) {
            return NextResponse.json({ ok: true, skipped: 'already_running' });
        }

        try {
            const today = etDateString();
            const state = await getRunState();
            let cursor: string | null;
            let fresh = false;
            if (force || state.run_day !== today) {
                cursor = null; fresh = true;
                await saveRunState(today, null, false);
            } else if (state.run_done) {
                return NextResponse.json({ ok: true, skipped: 'run_complete', day: today });
            } else {
                cursor = state.run_cursor;
            }

            // Reconcile delivery status only when a day's run starts.
            summary = await runDripPass({ cursor, runReconcile: fresh });
            await saveRunState(today, summary.nextCursor, !summary.hasMore);
        } finally {
            // Release BEFORE chaining so the next batch never sees our lock.
            await releaseRunLock();
        }
    } catch (err) {
        console.error('[cron/newsletter-drip]', err);
        return NextResponse.json({ error: 'Drip failed' }, { status: 500 });
    }

    // Chain the next batch after this invocation ends, so each batch gets a
    // fresh function time budget. If dispatch fails, the 10-minute cron resumes
    // from the persisted cursor.
    if (summary.hasMore && chain < MAX_CHAIN_DEPTH) {
        const nextUrl = new URL(req.nextUrl);
        nextUrl.searchParams.delete('cursor');
        nextUrl.searchParams.delete('force');
        nextUrl.searchParams.set('chain', String(chain + 1));
        const auth = req.headers.get('authorization') ?? '';
        waitUntil((async () => {
            for (let attempt = 1; attempt <= CHAIN_DISPATCH_ATTEMPTS; attempt++) {
                const ac = new AbortController();
                const timer = setTimeout(() => ac.abort(), 10_000);
                try {
                    await fetch(nextUrl.toString(), { headers: { authorization: auth }, signal: ac.signal });
                    return; // full response arrived before the abort
                } catch (err) {
                    if (ac.signal.aborted) return; // dispatched, then aborted on purpose
                    console.error(`[cron/newsletter-drip] chain dispatch attempt ${attempt} failed`, err);
                    if (attempt < CHAIN_DISPATCH_ATTEMPTS) {
                        await new Promise((r) => setTimeout(r, 2000 * attempt));
                    }
                } finally {
                    clearTimeout(timer);
                }
            }
            console.error('[cron/newsletter-drip] chain dispatch abandoned; cron will resume', {
                cursor: summary.nextCursor, chain: chain + 1,
            });
        })());
    }

    return NextResponse.json({ ok: true, dryRun, chain, settings, ...summary });
}
