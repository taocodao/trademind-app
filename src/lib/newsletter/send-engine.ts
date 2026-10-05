/**
 * History-driven newsletter send engine (Sep 2026).
 *
 * The send log (newsletter_send_log) is the single source of truth. For every
 * address the next issue is computed at send time as:
 *
 *     highest COMPLETED issue + 1
 *
 * A send is COMPLETED when it is delivered / opened / clicked, or when it was
 * accepted by Resend more than `accepted_grace_hours` ago with no bounce or
 * complaint. The cron job and the signup flow share sendNextIssue(), so a new
 * subscriber gets issue 1 through exactly the same path as the daily loop.
 */
import { query } from '@/lib/db';
import { ensureNewsletterTables } from './db';
import { ISSUES } from './issues';
import { getIssueByNumber, sendIssueEmailDetailed, DEFAULT_SENDER_NAME, type SubscriberForEmail } from './issue-email';
import { describeSenderName } from './sender-name';

// ---------- settings ----------

export interface NewsletterSettings {
    cadence_days: number;
    send_hour_start_et: number;
    send_hour_end_et: number;
    accepted_grace_hours: number;
    max_attempts: number;
    pace_ms: number;
    paused: boolean;
    /** Canary mode: when set, only this address is ever sent to. */
    only_email: string | null;
    /** Spread the daily send across the whole window with random gaps. */
    spread_mode: boolean;
    /** Hold the daily send for imported (purchased list) Gmail addresses. Opt-in signups still send. */
    hold_gmail: boolean;
}

/** SQL fragment that removes held addresses. `col` is the column prefix, e.g. 'd.' or ''. */
function heldClause(s: { hold_gmail: boolean }, col = ''): string {
    if (!s.hold_gmail) return '';
    return `AND NOT (${col}source = 'lead-import' AND ${col}email ~* '@(gmail|googlemail)\\.com$')`;
}

export const DEFAULT_SETTINGS: NewsletterSettings = {
    cadence_days: 2, send_hour_start_et: 9, send_hour_end_et: 18,
    accepted_grace_hours: 24, max_attempts: 5, pace_ms: 150, paused: true, only_email: null, spread_mode: true, hold_gmail: true,
};

export async function getSettings(): Promise<NewsletterSettings> {
    await ensureNewsletterTables();
    const r = await query(
        `SELECT cadence_days, send_hour_start_et, send_hour_end_et, accepted_grace_hours,
                max_attempts, pace_ms, paused, only_email, spread_mode, hold_gmail FROM newsletter_settings WHERE id = 1`
    );
    return { ...DEFAULT_SETTINGS, ...(r.rows[0] ?? {}) };
}

const SETTING_BOUNDS: Record<string, [number, number]> = {
    cadence_days: [1, 30], send_hour_start_et: [0, 23], send_hour_end_et: [1, 24],
    accepted_grace_hours: [1, 168], max_attempts: [1, 20], pace_ms: [100, 5000],
};

export async function updateSettings(patch: Record<string, unknown>): Promise<NewsletterSettings> {
    await ensureNewsletterTables();
    const sets: string[] = [];
    const vals: unknown[] = [];
    for (const [k, v] of Object.entries(patch)) {
        if (k === 'only_email') {
            const v2 = v == null || v === '' ? null : String(v).trim().toLowerCase();
            sets.push(`only_email = $${vals.length + 1}`); vals.push(v2);
        } else if (k === 'paused') {
            sets.push(`paused = $${vals.length + 1}`); vals.push(Boolean(v));
        } else if (k === 'hold_gmail') {
            sets.push(`hold_gmail = $${vals.length + 1}`); vals.push(Boolean(v));
        } else if (k === 'spread_mode') {
            sets.push(`spread_mode = $${vals.length + 1}`); vals.push(Boolean(v));
        } else if (k in SETTING_BOUNDS) {
            const n = Number(v);
            const [lo, hi] = SETTING_BOUNDS[k];
            if (!Number.isInteger(n) || n < lo || n > hi) throw new Error(`${k} must be an integer between ${lo} and ${hi}`);
            sets.push(`${k} = $${vals.length + 1}`); vals.push(n);
        }
    }
    if (sets.length) {
        await query(`UPDATE newsletter_settings SET ${sets.join(', ')}, updated_at = NOW() WHERE id = 1`, vals);
    }
    return getSettings();
}

/** Current hour (0-23) in America/New_York. */
export function hourET(now: Date = new Date()): number {
    return Number(new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York', hour: 'numeric', hour12: false,
    }).format(now)) % 24;
}

/** Seconds left in today's send window (America/New_York); negative once it has closed. */
export function secondsUntilWindowEnd(s: NewsletterSettings, now: Date = new Date()): number {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York', hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false,
    }).formatToParts(now);
    const g = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0) % 24;
    const cur = g('hour') * 3600 + g('minute') * 60 + g('second');
    return s.send_hour_end_et * 3600 - cur;
}

/** Random gap around a mean: uniform between 0.4x and 1.6x, never under 2 s. */
export function randomGapMs(meanMs: number): number {
    return Math.max(2000, Math.round(meanMs * (0.4 + Math.random() * 1.2)));
}

export function inSendWindow(s: NewsletterSettings, now: Date = new Date()): boolean {
    const h = hourET(now);
    return h >= s.send_hour_start_et && h < s.send_hour_end_et;
}

export { DUE_TOLERANCE_HOURS, decideNext, type Decision, type HistoryFacts } from './send-decision';
import { decideNext, type Decision, type HistoryFacts } from './send-decision';

// ---------- history read ----------

const COMPLETED_SQL = (graceHours: number) => `(
    status IN ('delivered','opened','clicked')
    OR (status = 'accepted' AND status_at < NOW() - INTERVAL '${Math.floor(graceHours)} hours')
)`;

export async function readHistory(email: string, s: NewsletterSettings): Promise<HistoryFacts> {
    const done = await query(
        `SELECT issue_number, created_at FROM newsletter_send_log
         WHERE email = $1 AND kind = 'issue' AND ${COMPLETED_SQL(s.accepted_grace_hours)}
         ORDER BY issue_number DESC LIMIT 1`, [email]
    );
    const lastCompleted: number = done.rows[0]?.issue_number ?? 0;
    const lastCompletedAt: Date | null = done.rows[0]?.created_at ? new Date(done.rows[0].created_at) : null;

    const fl = await query(
        `SELECT
            EXISTS (SELECT 1 FROM newsletter_send_log
                    WHERE email = $1 AND kind = 'issue'
                      AND (status = 'sending' OR (status = 'accepted' AND status_at >= NOW() - INTERVAL '${Math.floor(s.accepted_grace_hours)} hours'))) AS in_flight,
            (SELECT COUNT(*)::int FROM newsletter_send_log
              WHERE email = $1 AND kind = 'issue' AND issue_number = $2 AND status = 'failed') AS failed_next`,
        [email, lastCompleted + 1]
    );
    return {
        lastCompleted, lastCompletedAt,
        inFlight: Boolean(fl.rows[0]?.in_flight),
        failedAttemptsNext: fl.rows[0]?.failed_next ?? 0,
    };
}

// ---------- sending one address ----------

export type SendOutcome =
    | { result: 'sent'; issue: number; resendId: string | null }
    | { result: 'failed'; issue: number; error: string }
    | { result: 'skipped'; reason: string };

export interface SendNextOptions {
    settings?: NewsletterSettings;
    /** Ignore the daily send window (signup flow). Never ignores pause. */
    bypassWindow?: boolean;
    /** Compute the decision but send nothing. */
    dryRun?: boolean;
    /** Override recipient details (signup flow passes discount info). */
    subscriber?: Partial<SubscriberForEmail>;
    /** Awaited right before the Resend call (used for pacing). */
    beforeSend?: () => Promise<void>;
}

export async function sendNextIssue(email: string, opts: SendNextOptions = {}): Promise<SendOutcome & { decision?: Decision }> {
    await ensureNewsletterTables();
    const s = opts.settings ?? await getSettings();
    const addr = email.trim().toLowerCase();
    // A dry run reports what would happen regardless of pause or window.
    if (s.only_email && addr !== s.only_email) return { result: 'skipped', reason: 'canary_only' };
    if (!opts.dryRun) {
        if (s.paused) return { result: 'skipped', reason: 'paused' };
        if (!opts.bypassWindow && !inSendWindow(s)) return { result: 'skipped', reason: 'outside_window' };
    }

    // Eligibility: directory row, active subscriber (or none), not suppressed.
    const el = await query(
        `SELECT d.email, d.source, d.subscriber_id, d.first_name, s.status AS sub_status,
                EXISTS (SELECT 1 FROM newsletter_suppression sup WHERE sup.email = d.email) AS suppressed
         FROM newsletter_directory d
         LEFT JOIN newsletter_subscribers s ON s.id = d.subscriber_id
         WHERE d.email = $1`, [addr]
    );
    const row = el.rows[0];
    if (!row) return { result: 'skipped', reason: 'not_in_directory' };
    if (row.suppressed) return { result: 'skipped', reason: 'suppressed' };
    // Gmail hold: the daily run skips imported Gmail addresses while Gmail files our mail as spam.
    // Direct sends (admin add, instant signup, seeds) set bypassWindow and still go out.
    if (s.hold_gmail && !opts.bypassWindow && row.source === 'lead-import' && /@(gmail|googlemail)\.com$/i.test(addr)) {
        return { result: 'skipped', reason: 'gmail_hold' };
    }
    // Every issue carries a per-subscriber unsubscribe link, which needs a subscriber record.
    if (!row.subscriber_id) return { result: 'skipped', reason: 'no_subscriber_record' };
    if (row.sub_status && !['confirmed', 'email_change_pending'].includes(row.sub_status)) {
        return { result: 'skipped', reason: `subscriber_${row.sub_status}` };
    }

    const facts = await readHistory(addr, s);
    const decision = decideNext(facts, s, ISSUES.length);
    if (decision.action !== 'send') {
        return { result: 'skipped', reason: decision.reason, decision };
    }
    if (opts.dryRun) return { result: 'skipped', reason: `dry_run_would_send_issue_${decision.issue}`, decision };

    const issue = getIssueByNumber(decision.issue);
    if (!issue) return { result: 'skipped', reason: 'unknown_issue', decision };

    // Claim. The partial unique index rejects a second live send for the same
    // address and issue, so overlapping runs can never double send.
    let logId: number;
    try {
        const ins = await query(
            `INSERT INTO newsletter_send_log
               (email, subscriber_id, kind, issue_number, issue_slug, ok, status, status_at, attempt)
             VALUES ($1, $2, 'issue', $3, $4, FALSE, 'sending', NOW(), $5) RETURNING id`,
            [addr, row.subscriber_id ?? null, issue.number, issue.slug, decision.attempt]
        );
        logId = ins.rows[0].id;
    } catch (err) {
        if ((err as { code?: string })?.code === '23505') return { result: 'skipped', reason: 'already_claimed', decision };
        throw err;
    }

    const sub: SubscriberForEmail = {
        id: row.subscriber_id ?? 0, email: addr, referral_id: null,
        discount_state: null, window_end: null, first_name: row.first_name,
        ...opts.subscriber,
    };
    if (opts.beforeSend) await opts.beforeSend();
    let res: Awaited<ReturnType<typeof sendIssueEmailDetailed>>;
    try {
        res = await sendIssueEmailDetailed(issue, sub);
        if (!res.ok && res.httpStatus === 429) {
            // Respect Resend's rate limit once, then record a normal failure.
            await sleep(Math.min(5000, Math.max(1000, (res.retryAfterSec ?? 1) * 1000)));
            res = await sendIssueEmailDetailed(issue, sub);
        }
    } catch (err) {
        // Rendering or token errors must never leave a claim stuck in 'sending'.
        res = { ok: false, resendId: null, error: `exception: ${String((err as Error)?.message ?? err)}`.slice(0, 1000), httpStatus: null, retryAfterSec: null };
    }

    if (res.ok) {
        await query(
            `UPDATE newsletter_send_log
             SET ok = TRUE, status = 'accepted', status_at = NOW(), resend_id = $2, error = NULL
             WHERE id = $1`, [logId, res.resendId]
        );
        return { result: 'sent', issue: issue.number, resendId: res.resendId, decision };
    }
    await query(
        `UPDATE newsletter_send_log SET ok = FALSE, status = 'failed', status_at = NOW(), error = $2 WHERE id = $1`,
        [logId, res.error ?? 'unknown error']
    );
    return { result: 'failed', issue: issue.number, error: res.error ?? 'unknown error', decision };
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---------- delivery status ----------

export const STATUS_RANK: Record<string, number> = {
    sending: 0, accepted: 1, delivered: 2, opened: 3, clicked: 4,
};

/** Apply a Resend lifecycle event to the matching send. Status only moves
 *  forward; opened/clicked also count repeats. Returns rows changed. */
export async function applyDeliveryEvent(
    resendId: string,
    type: 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained' | 'failed' | 'delivery_delayed',
    at: Date = new Date(),
    detail?: string
): Promise<number> {
    await ensureNewsletterTables();
    if (type === 'delivery_delayed') {
        const r = await query(`UPDATE newsletter_send_log SET error = $2 WHERE resend_id = $1`, [resendId, detail ?? 'delivery delayed']);
        return r.rowCount ?? 0;
    }
    if (type === 'bounced' || type === 'complained' || type === 'failed') {
        const r = await query(
            `UPDATE newsletter_send_log
             SET status = $2, status_at = $3, ok = FALSE, error = COALESCE($4, error)
             WHERE resend_id = $1`, [resendId, type, at.toISOString(), detail ?? null]
        );
        return r.rowCount ?? 0;
    }
    const rank = STATUS_RANK[type];
    const r = await query(
        `UPDATE newsletter_send_log SET
            status = CASE WHEN COALESCE(CASE status
                        WHEN 'sending' THEN 0 WHEN 'accepted' THEN 1 WHEN 'delivered' THEN 2
                        WHEN 'opened' THEN 3 WHEN 'clicked' THEN 4 ELSE -1 END, -1) < $2
                     THEN $3 ELSE status END,
            status_at = CASE WHEN COALESCE(CASE status
                        WHEN 'sending' THEN 0 WHEN 'accepted' THEN 1 WHEN 'delivered' THEN 2
                        WHEN 'opened' THEN 3 WHEN 'clicked' THEN 4 ELSE -1 END, -1) < $2
                     THEN $4::timestamptz ELSE status_at END,
            delivered_at = CASE WHEN $3 IN ('delivered','opened','clicked') THEN COALESCE(delivered_at, $4::timestamptz) ELSE delivered_at END,
            opened_at    = CASE WHEN $3 IN ('opened','clicked') THEN COALESCE(opened_at, $4::timestamptz) ELSE opened_at END,
            clicked_at   = CASE WHEN $3 = 'clicked' THEN COALESCE(clicked_at, $4::timestamptz) ELSE clicked_at END,
            open_count   = open_count  + CASE WHEN $3 = 'opened'  THEN 1 ELSE 0 END,
            click_count  = click_count + CASE WHEN $3 = 'clicked' THEN 1 ELSE 0 END,
            ok = TRUE
         WHERE resend_id = $1 AND status IN ('accepted','delivered','opened','clicked','sending')`,
        [resendId, rank, type, at.toISOString()]
    );
    return r.rowCount ?? 0;
}

/** Safety net for missed webhooks: check sends still 'accepted' after 15
 *  minutes against Resend's own record. Also fails stale 'sending' claims. */
export async function reconcile(s: NewsletterSettings, maxChecks = 100): Promise<{ checked: number; updated: number; staleFailed: number }> {
    const stale = await query(
        `UPDATE newsletter_send_log SET status = 'failed', status_at = NOW(), ok = FALSE,
                error = COALESCE(error, 'stale sending claim (run interrupted)')
         WHERE kind = 'issue' AND status = 'sending' AND status_at < NOW() - INTERVAL '10 minutes'`
    );
    const key = process.env.RESEND_API_KEY;
    if (!key) return { checked: 0, updated: 0, staleFailed: stale.rowCount ?? 0 };
    const pending = await query(
        `SELECT resend_id FROM newsletter_send_log
         WHERE kind = 'issue' AND status = 'accepted' AND resend_id IS NOT NULL
           AND status_at < NOW() - INTERVAL '15 minutes'
         ORDER BY status_at ASC LIMIT $1`, [maxChecks]
    );
    let updated = 0;
    for (const p of pending.rows as { resend_id: string }[]) {
        try {
            const r = await fetch(`https://api.resend.com/emails/${p.resend_id}`, { headers: { Authorization: `Bearer ${key}` } });
            if (r.status === 429) { await sleep(1000); continue; }
            if (!r.ok) continue;
            const j = await r.json();
            const ev: string = j?.last_event ?? '';
            const map: Record<string, 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained'> = {
                delivered: 'delivered', opened: 'opened', clicked: 'clicked', bounced: 'bounced', complained: 'complained',
            };
            if (map[ev]) updated += await applyDeliveryEvent(p.resend_id, map[ev]);
        } catch { /* try again next run */ }
        await sleep(s.pace_ms);
    }
    return { checked: pending.rows.length, updated, staleFailed: stale.rowCount ?? 0 };
}

// ---------- run lock (pool-safe, table based) ----------

export async function acquireRunLock(minutes = 6): Promise<boolean> {
    await ensureNewsletterTables();
    const r = await query(
        `UPDATE newsletter_settings SET lock_until = NOW() + ($1 || ' minutes')::interval
         WHERE id = 1 AND (lock_until IS NULL OR lock_until < NOW()) RETURNING id`, [String(minutes)]
    );
    return (r.rowCount ?? 0) > 0;
}

export async function releaseRunLock(): Promise<void> {
    await query(`UPDATE newsletter_settings SET lock_until = NULL WHERE id = 1`);
}

// ---------- persisted run state ----------

/** Eastern calendar date, YYYY-MM-DD. */
export function etDateString(d: Date = new Date()): string {
    const p = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(d);
    return p; // en-CA formats as YYYY-MM-DD
}

export interface RunState { run_day: string | null; run_cursor: string | null; run_done: boolean }

export async function getRunState(): Promise<RunState> {
    await ensureNewsletterTables();
    const r = await query(`SELECT run_day, run_cursor, run_done FROM newsletter_settings WHERE id = 1`);
    return (r.rows[0] as RunState) ?? { run_day: null, run_cursor: null, run_done: false };
}

export async function saveRunState(day: string, cursor: string | null, done: boolean): Promise<void> {
    await query(
        `UPDATE newsletter_settings SET run_day = $1, run_cursor = $2, run_done = $3 WHERE id = 1`,
        [day, cursor, done]
    );
}

/** Accumulate this invocation's totals into the day's run summary (admin visibility). */
export async function saveRunSummary(day: string, part: RunSummary, done: boolean): Promise<void> {
    const r = await query(`SELECT run_summary FROM newsletter_settings WHERE id = 1`);
    let prev: Record<string, any> | null = null;
    try { prev = r.rows[0]?.run_summary ? JSON.parse(r.rows[0].run_summary) : null; } catch { prev = null; }
    const base: Record<string, any> = prev && prev.day === day
        ? prev : { day, checked: 0, sent: 0, failed: 0, perIssue: {}, skipped: {}, invocations: 0 };
    base.checked += part.checked; base.sent += part.sent; base.failed += part.failed;
    for (const [k, v] of Object.entries(part.perIssue)) base.perIssue[k] = (base.perIssue[k] ?? 0) + v;
    for (const [k, v] of Object.entries(part.skipped)) base.skipped[k] = (base.skipped[k] ?? 0) + v;
    base.invocations += 1; base.done = done; base.updatedAt = new Date().toISOString();
    await query(`UPDATE newsletter_settings SET run_summary = $1 WHERE id = 1`, [JSON.stringify(base)]);
}

/**
 * Read-only estimate of what the next run would send: per issue, how many
 * addresses are due by Eastern calendar date and which display name applies.
 * Sends nothing and picks nothing.
 */
export async function previewTodaysRun() {
    const s = await getSettings();
    const r = await query(
        `WITH elig AS (
             SELECT d.email FROM newsletter_directory d
             LEFT JOIN newsletter_subscribers sub ON sub.id = d.subscriber_id
             WHERE d.subscriber_id IS NOT NULL
               AND (sub.status IS NULL OR sub.status IN ('confirmed','email_change_pending'))
               AND NOT EXISTS (SELECT 1 FROM newsletter_suppression x WHERE x.email = d.email)
               ${heldClause(s, 'd.')}
         ), last AS (
             SELECT DISTINCT ON (email) email, issue_number, created_at FROM newsletter_send_log
             WHERE kind = 'issue' AND ${COMPLETED_SQL(s.accepted_grace_hours)}
             ORDER BY email, issue_number DESC
         )
         SELECT COALESCE(l.issue_number, 0) AS last_issue,
                CASE WHEN l.created_at IS NULL THEN NULL
                     ELSE ((NOW() AT TIME ZONE 'America/New_York')::date
                           - (l.created_at AT TIME ZONE 'America/New_York')::date) END AS days_since,
                COUNT(*)::int AS n
         FROM elig e LEFT JOIN last l USING (email) GROUP BY 1, 2`
    );
    const total = await query(`SELECT COUNT(*)::int AS n FROM newsletter_directory`);
    const held = await query(
        `SELECT COUNT(*)::int AS n FROM newsletter_directory
         WHERE source = 'lead-import' AND email ~* '@(gmail|googlemail)\\.com$'`
    );
    const perIssue: Record<number, number> = {};
    let notDue = 0, complete = 0, eligible = 0;
    for (const row of r.rows as { last_issue: number; days_since: number | null; n: number }[]) {
        eligible += row.n;
        const next = row.last_issue + 1;
        if (next > ISSUES.length) { complete += row.n; continue; }
        const due = row.last_issue === 0 || (row.days_since ?? 0) >= s.cadence_days;
        if (due) perIssue[next] = (perIssue[next] ?? 0) + row.n; else notDue += row.n;
    }
    const issues = [];
    for (const [num, n] of Object.entries(perIssue)) {
        issues.push({ issue: Number(num), recipients: n, senderName: await describeSenderName(Number(num), DEFAULT_SENDER_NAME) });
    }
    issues.sort((a, b) => a.issue - b.issue);
    const sr = await query(`SELECT run_summary FROM newsletter_settings WHERE id = 1`);
    let lastRun = null;
    try { lastRun = sr.rows[0]?.run_summary ? JSON.parse(sr.rows[0].run_summary) : null; } catch { lastRun = null; }
    return {
        todayET: etDateString(), cadenceDays: s.cadence_days, windowStartET: s.send_hour_start_et,
        directory: total.rows[0].n, holdGmail: s.hold_gmail, heldGmail: s.hold_gmail ? held.rows[0].n : 0, spreadMode: s.spread_mode, windowEndET: s.send_hour_end_et, eligible, notDue, sequenceComplete: complete, dueByIssue: issues, lastRun,
    };
}

// ---------- full list pass ----------

/** Max addresses per invocation. Small batches (200, about a minute of
 *  sending) keep each invocation far inside the 270 s deadline; a bigger
 *  list simply chains more invocations via cursor. */
export const DEFAULT_BATCH_SIZE = 200;

export interface RunSummary {
    checked: number; sent: number; failed: number;
    skipped: Record<string, number>; perIssue: Record<string, number>;
    stoppedEarly: boolean;
    /** Pass cursor: 'created_at_iso|email' of the last address processed. */
    nextCursor: string | null;
    /** True when addresses remain beyond this batch; the caller should chain. */
    hasMore: boolean;
    reconcile?: { checked: number; updated: number; staleFailed: number };
}

export async function runDripPass(opts: {
    dryRun?: boolean; deadlineMs?: number; cursor?: string | null;
    batchSize?: number; runReconcile?: boolean;
    /** Share of each cron interval this invocation can spend sending (spread mode). */
    dutyCycle?: number;
} = {}): Promise<RunSummary> {
    const s = await getSettings();
    const deadline = Date.now() + (opts.deadlineMs ?? 270_000);
    const batchSize = Math.max(1, Math.min(opts.batchSize ?? DEFAULT_BATCH_SIZE, 2000));
    const summary: RunSummary = {
        checked: 0, sent: 0, failed: 0, skipped: {}, perIssue: {}, stoppedEarly: false,
        nextCursor: opts.cursor ?? null, hasMore: false,
    };

    if (!opts.dryRun && (opts.runReconcile ?? true)) summary.reconcile = await reconcile(s);

    // Keyset pagination on (created_at, email), oldest first so nobody starves.
    // Vercel functions are stateless and time boxed, so a large list is walked
    // in batches: each invocation returns a cursor and the route chains the
    // next invocation until the whole directory has been checked.
    let curCreated: string | null = null;
    let curEmail: string | null = null;
    if (opts.cursor) {
        const i = opts.cursor.indexOf('|');
        if (i > 0) { curCreated = opts.cursor.slice(0, i); curEmail = opts.cursor.slice(i + 1); }
    }
    const list = await query(
        `SELECT email, created_at, created_at::text AS created_at_txt FROM newsletter_directory
         WHERE ($1::timestamptz IS NULL OR (created_at, email) > ($1::timestamptz, $2::text))
         ORDER BY created_at ASC, email ASC LIMIT $3`,
        [curCreated, curEmail, batchSize + 1]
    );
    const rows = list.rows as { email: string; created_at: Date; created_at_txt: string }[];
    const hasBeyondBatch = rows.length > batchSize;
    const batch = hasBeyondBatch ? rows.slice(0, batchSize) : rows;

    // Spread mode: aim to finish the remaining addresses by the end of the send
    // window, with a random gap before each real send. The mean gap adapts to
    // the addresses left and the time left, so the run always fits the window.
    const spread = !opts.dryRun && s.spread_mode;
    let meanGapMs = 0;
    if (spread) {
        const left = await query(
            `SELECT COUNT(*)::int AS n FROM newsletter_directory
             WHERE ($1::timestamptz IS NULL OR (created_at, email) > ($1::timestamptz, $2::text))
             ${heldClause(s)}`,
            [curCreated, curEmail]
        );
        const remaining = Math.max(1, Number(left.rows[0]?.n ?? 1));
        const secsLeft = Math.max(0, secondsUntilWindowEnd(s));
        const duty = Math.min(1, Math.max(0.2, opts.dutyCycle ?? 0.8));
        meanGapMs = Math.min(90_000, Math.max(2_000, Math.floor((secsLeft * duty * 1000) / remaining)));
    }

    let lastSendAt = 0;
    for (const { email, created_at_txt } of batch) {
        if (Date.now() > deadline - (spread ? 5_000 : 0)) { summary.stoppedEarly = true; break; }
        if (spread && secondsUntilWindowEnd(s) <= 0) { summary.stoppedEarly = true; break; }
        summary.checked++;

        // Pace only real sends. Normal mode: fixed pace_ms. Spread mode: a random
        // gap, never sleeping past this invocation's deadline.
        const out = await sendNextIssue(email, {
            settings: s, dryRun: opts.dryRun,
            beforeSend: async () => {
                if (spread) {
                    if (lastSendAt > 0) {
                        const want = randomGapMs(meanGapMs) - (Date.now() - lastSendAt);
                        const room = deadline - 15_000 - Date.now();
                        const wait = Math.min(want, room);
                        if (wait > 0) await sleep(wait);
                    }
                } else {
                    const gap = s.pace_ms - (Date.now() - lastSendAt);
                    if (lastSendAt > 0 && gap > 0) await sleep(gap);
                }
                lastSendAt = Date.now();
            },
        });
        if (out.result === 'sent') {
            summary.sent++; lastSendAt = Date.now();
            summary.perIssue[String(out.issue)] = (summary.perIssue[String(out.issue)] ?? 0) + 1;
        } else if (out.result === 'failed') {
            summary.failed++; lastSendAt = Date.now();
        } else {
            summary.skipped[out.reason] = (summary.skipped[out.reason] ?? 0) + 1;
            if (opts.dryRun && out.decision?.action === 'send') {
                summary.perIssue[String(out.decision.issue)] = (summary.perIssue[String(out.decision.issue)] ?? 0) + 1;
            }
        }
        // Keep the full microsecond timestamp: bulk imports share one created_at,
        // and a millisecond cursor would restart the same rows every batch.
        summary.nextCursor = `${created_at_txt}|${email}`;
    }
    summary.hasMore = summary.stoppedEarly || hasBeyondBatch;
    return summary;
}
