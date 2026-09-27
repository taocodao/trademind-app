import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { ensureNewsletterTables, logNewsletterSend } from '@/lib/newsletter/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

/**
 * Daily newsletter drip (Sep 2026):
 *   - every directory address is enrolled at issue 1 immediately
 *   - issues 2 through 8 send every two days
 *   - issues after 8 send weekly
 *   - no issue ever sends twice to the same address; sends are logged in
 *     newsletter_send_log
 */
export async function GET(req: NextRequest) {
    const expected = process.env.CRON_SECRET;
    if (!expected || req.headers.get('authorization') !== `Bearer ${expected}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        await ensureNewsletterTables();
        const { ISSUES } = await import('@/lib/newsletter/issues');
        const { getIssueByNumber } = await import('@/lib/newsletter/issue-email');
        const { sendIssueEmail } = await import('@/lib/newsletter/issue-email');
        const maxIssue = ISSUES.length;

        // Due rows: drip enrolled, scheduled for now or earlier.
        const due = await query(
            `SELECT d.email, d.subscriber_id, d.first_name, d.next_issue
             FROM newsletter_directory d
             LEFT JOIN newsletter_subscribers s ON s.id = d.subscriber_id
             WHERE d.next_issue IS NOT NULL
               AND d.next_issue <= $1
               AND d.next_issue_at <= NOW()
               AND (s.id IS NULL OR s.status IN ('confirmed', 'email_change_pending'))
               AND NOT EXISTS (SELECT 1 FROM newsletter_suppression sup WHERE sup.email = d.email)
             ORDER BY d.next_issue_at ASC
             LIMIT 300`,
            [maxIssue]
        );

        let sent = 0, failed = 0, skipped = 0;
        for (const row of due.rows as { email: string; subscriber_id: number | null; first_name: string | null; next_issue: number }[]) {
            const issue = getIssueByNumber(row.next_issue);
            if (!issue) { skipped++; continue; }

            // Never send the same issue twice to the same address.
            const already = await query(
                `SELECT 1 FROM newsletter_send_log
                 WHERE email = $1 AND kind = 'issue' AND issue_number = $2 AND ok`,
                [row.email, issue.number]
            );
            if (already.rowCount! > 0) {
                await advance(row.email, row.next_issue, maxIssue);
                skipped++;
                continue;
            }

            const ok = await sendIssueEmail(issue, {
                id: row.subscriber_id ?? 0,
                email: row.email,
                referral_id: null,
                discount_state: null,
                window_end: null,
                first_name: row.first_name,
            });
            await logNewsletterSend({
                email: row.email, subscriberId: row.subscriber_id, kind: 'issue',
                issueNumber: issue.number, issueSlug: issue.slug, ok,
            });
            if (ok) { sent++; await advance(row.email, row.next_issue, maxIssue); }
            else {
                failed++;
                // Retry the same issue tomorrow rather than skipping ahead.
                await query(
                    `UPDATE newsletter_directory SET next_issue_at = NOW() + INTERVAL '1 day' WHERE email = $1`,
                    [row.email]
                );
            }
        }

        return NextResponse.json({ ok: true, due: due.rows.length, sent, failed, skipped, maxIssue });
    } catch (err) {
        console.error('[cron/newsletter-drip]', err);
        return NextResponse.json({ error: 'Drip failed' }, { status: 500 });
    }
}

async function advance(email: string, justSent: number, maxIssue: number): Promise<void> {
    if (justSent >= maxIssue) {
        // Sequence complete: stop the drip (weekly cadence handled by the
        // standing issue broadcast when a new issue is published).
        await query(
            `UPDATE newsletter_directory SET next_issue = NULL, next_issue_at = NULL WHERE email = $1`,
            [email]
        );
        return;
    }
    const gapDays = justSent < 8 ? 2 : 7; // issues 2-8 every two days, then weekly
    await query(
        `UPDATE newsletter_directory
         SET next_issue = $2, next_issue_at = NOW() + ($3 || ' days')::interval
         WHERE email = $1`,
        [email, justSent + 1, String(gapDays)]
    );
}
