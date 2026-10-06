/**
 * Placement test framework.
 *
 * A plan is a set of queued test sends: one message per owned seed mailbox per
 * day, each with a variant, a first name, and a send time with random spacing.
 * A cron tick sends whatever is due. Only addresses registered as active seeds
 * can ever be sent to, so this cannot be used to mail real subscribers.
 * Results come from the existing seed monitor (read-only IMAP) joined by
 * send_log_id, so the test never opens or touches the seed messages.
 */
import { query } from '@/lib/db';
import { ensureSeedTables } from './seed-monitor';
import { getIssueByNumber, sendIssueEmailDetailed } from './issue-email';

export const DEFAULT_FROM = 'Eric Huang <eric@trademindbot.com>';

let ready = false;
export async function ensureTestTables(): Promise<void> {
    if (ready) return;
    await ensureSeedTables();
    await query(`
        CREATE TABLE IF NOT EXISTS newsletter_test_queue (
            id           BIGSERIAL PRIMARY KEY,
            plan         TEXT NOT NULL,
            email        TEXT NOT NULL,
            variant      TEXT NOT NULL,
            first_name   TEXT NOT NULL DEFAULT 'Tom',
            issue_number INT  NOT NULL DEFAULT 1,
            from_addr    TEXT NOT NULL DEFAULT '${DEFAULT_FROM}',
            send_at      TIMESTAMPTZ NOT NULL,
            sent_at      TIMESTAMPTZ,
            send_log_id  BIGINT,
            error        TEXT,
            cancelled    BOOLEAN NOT NULL DEFAULT FALSE,
            created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await query(`CREATE INDEX IF NOT EXISTS newsletter_test_queue_due_idx ON newsletter_test_queue (send_at) WHERE sent_at IS NULL AND cancelled = FALSE`);
    ready = true;
}

/** Sends at most `max` due queue rows. Safe to call every few minutes. */
export async function processDueTests(max = 2): Promise<{ sent: number; failed: number; due: number }> {
    await ensureTestTables();
    const due = (await query(
        `SELECT q.* FROM newsletter_test_queue q
          WHERE q.sent_at IS NULL AND q.cancelled = FALSE AND q.error IS NULL AND q.send_at <= NOW()
          ORDER BY q.send_at ASC LIMIT $1`, [max]
    )).rows as Array<{ id: number; email: string; variant: string; first_name: string; issue_number: number; from_addr: string }>;
    let sent = 0, failed = 0;
    for (const row of due) {
        const seed = await query(`SELECT 1 FROM newsletter_seeds WHERE email = $1 AND active = TRUE`, [row.email]);
        const issue = getIssueByNumber(row.issue_number);
        if (seed.rows.length === 0 || !issue) {
            await query(`UPDATE newsletter_test_queue SET error = $2 WHERE id = $1`, [row.id, seed.rows.length === 0 ? 'not an active seed' : 'unknown issue']);
            failed++;
            continue;
        }
        const own = await query(`SELECT id FROM newsletter_subscribers WHERE email = $1 LIMIT 1`, [row.email]);
        const res = await sendIssueEmailDetailed(issue, {
            id: own.rows[0]?.id ?? 0, email: row.email, referral_id: null,
            discount_state: 'eligible', window_end: null, first_name: row.first_name,
        }, { preview: true, variant: row.variant as never, fromOverride: row.from_addr });
        if (!res.ok) {
            await query(`UPDATE newsletter_test_queue SET error = $2 WHERE id = $1`, [row.id, (res.error ?? 'send failed').slice(0, 400)]);
            failed++;
            continue;
        }
        const log = await query(
            `INSERT INTO newsletter_send_log
               (email, subscriber_id, kind, issue_number, issue_slug, ok, status, status_at, attempt, resend_id)
             VALUES ($1, 0, 'preview', $2, $3, TRUE, 'accepted', NOW(), 1, $4) RETURNING id`,
            [row.email, issue.number, issue.slug, res.resendId]
        );
        await query(`UPDATE newsletter_test_queue SET sent_at = NOW(), send_log_id = $2 WHERE id = $1`, [row.id, log.rows[0].id]);
        sent++;
    }
    return { sent, failed, due: due.length };
}

/** Placement results per variant and per seed for one plan. */
export async function placementReport(plan: string) {
    await ensureTestTables();
    const rows = (await query(
        `SELECT q.id, q.email, q.variant, q.send_at, q.sent_at, q.error, q.cancelled,
                k.placement, k.labels, k.spf, k.dkim, k.dmarc
           FROM newsletter_test_queue q
           LEFT JOIN newsletter_seed_checks k ON k.send_log_id = q.send_log_id
          WHERE q.plan = $1 ORDER BY q.send_at ASC`, [plan]
    )).rows as Array<Record<string, unknown>>;
    const byVariant: Record<string, Record<string, number>> = {};
    for (const r of rows) {
        const v = String(r.variant);
        byVariant[v] ??= { queued: 0, sent: 0, inbox: 0, promotions: 0, spam: 0, other: 0, missing: 0, pending: 0 };
        const b = byVariant[v];
        if (r.cancelled) continue;
        if (!r.sent_at) { b.queued++; continue; }
        b.sent++;
        const p = r.placement as string | null;
        if (!p) b.pending++; else b[p] = (b[p] ?? 0) + 1;
    }
    return { plan, byVariant, rows };
}
