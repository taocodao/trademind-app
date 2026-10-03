import { NextRequest, NextResponse } from 'next/server';
import { resolveAdmin } from '@/lib/admin-gate';
import { query } from '@/lib/db';
import { ensureNewsletterTables } from '@/lib/newsletter/db';

export const dynamic = 'force-dynamic';
// A full-list send can take minutes; without this the function dies at the
// platform default timeout and the UI reports a silent failure.
export const maxDuration = 300;

/**
 * Admin newsletter tools (support@trademind.bot only):
 *   GET  ?email=x        -> subscriber lookup (state, discount, emails, events)
 *   POST { action, email | subscriberId, reason?, days? }
 *      resend-confirmation | extend-window | revoke-discount
 *   GET  ?aggregate=1    -> aggregate numbers only (no raw email lists)
 *   GET  ?directory=1&q=&limit=&offset=
 *                        -> unified subscriber directory (email is the key,
 *                           covers signup forms and lead imports) with drip
 *                           position; optional q filters by email substring
 *   GET  ?history=<email> -> send history (newsletter_send_log) for one address,
 *                           with delivery status, Resend id, open and click times
 *   GET  ?summary=1       -> per-issue totals and rates (delivered, opened, clicked,
 *                           bounced, failed)
 *   GET  ?stuck=1         -> sends in flight over 24h and addresses failing repeatedly
 *   GET  ?settings=1      -> send engine settings (cadence, window, pause)
 *   POST { action: 'update-settings', ...fields } -> change cadence_days, window, paused, etc.
 */
export async function GET(req: NextRequest) {
    const gate = await resolveAdmin(req);
    if (!gate.isAdmin) return NextResponse.json({ error: gate.error ?? 'Forbidden' }, { status: gate.status });
    await ensureNewsletterTables();

    const sp = req.nextUrl.searchParams;

    if (sp.get('directory')) {
        const { backfillDirectory } = await import('@/lib/newsletter/db');
        await backfillDirectory();
        const q = (sp.get('q') ?? '').trim().toLowerCase();
        const limit = Math.min(200, Math.max(1, Number(sp.get('limit')) || 100));
        const offset = Math.max(0, Number(sp.get('offset')) || 0);
        const where = q ? `WHERE d.email LIKE $1` : '';
        const params: (string | number)[] = q ? [`%${q}%`, limit, offset] : [limit, offset];
        const rows = await query(
            `SELECT d.email, d.source, d.first_name, d.next_issue, d.next_issue_at,
                    d.last_seen_at, d.created_at, s.status AS subscriber_status
             FROM newsletter_directory d
             LEFT JOIN newsletter_subscribers s ON s.id = d.subscriber_id
             ${where}
             ORDER BY d.created_at DESC
             LIMIT $${q ? 2 : 1} OFFSET $${q ? 3 : 2}`,
            params
        );
        const total = await query(
            `SELECT COUNT(*)::int AS n FROM newsletter_directory d ${q ? `WHERE d.email LIKE $1` : ''}`,
            q ? [`%${q}%`] : []
        );
        return NextResponse.json({ directory: rows.rows, total: total.rows[0]?.n ?? 0 });
    }

    if (sp.get('settings')) {
        const { getSettings } = await import('@/lib/newsletter/send-engine');
        return NextResponse.json({ settings: await getSettings() });
    }

    if (sp.get('summary')) {
        const rows = await query(`
            SELECT issue_number,
                   COUNT(*)::int                                                     AS attempts,
                   COUNT(*) FILTER (WHERE status IN ('accepted','delivered','opened','clicked','bounced','complained'))::int AS accepted,
                   COUNT(*) FILTER (WHERE status IN ('delivered','opened','clicked'))::int AS delivered,
                   COUNT(*) FILTER (WHERE opened_at IS NOT NULL)::int                AS opened,
                   COUNT(*) FILTER (WHERE clicked_at IS NOT NULL)::int               AS clicked,
                   COUNT(*) FILTER (WHERE status = 'bounced')::int                   AS bounced,
                   COUNT(*) FILTER (WHERE status = 'complained')::int                AS complained,
                   COUNT(*) FILTER (WHERE status = 'failed')::int                    AS failed,
                   COUNT(*) FILTER (WHERE status = 'accepted')::int                  AS awaiting_event
            FROM newsletter_send_log
            WHERE kind = 'issue' AND status IS NOT NULL
            GROUP BY issue_number ORDER BY issue_number`);
        const out = rows.rows.map((r) => ({
            ...r,
            open_rate: r.delivered > 0 ? Number((r.opened / r.delivered).toFixed(4)) : null,
            click_rate: r.delivered > 0 ? Number((r.clicked / r.delivered).toFixed(4)) : null,
        }));
        return NextResponse.json({ issues: out });
    }

    if (sp.get('stuck')) {
        const inflight = await query(`
            SELECT email, issue_number, status, status_at, resend_id FROM newsletter_send_log
            WHERE kind = 'issue' AND status IN ('sending','accepted') AND status_at < NOW() - INTERVAL '24 hours'
            ORDER BY status_at LIMIT 200`);
        const failing = await query(`
            SELECT email, issue_number, COUNT(*)::int AS failures, MAX(error) AS last_error
            FROM newsletter_send_log WHERE kind = 'issue' AND status = 'failed'
            GROUP BY email, issue_number HAVING COUNT(*) >= 3 ORDER BY failures DESC LIMIT 200`);
        return NextResponse.json({ inFlightOver24h: inflight.rows, failingRepeatedly: failing.rows });
    }

    if (sp.get('history')) {
        const email = sp.get('history')!.trim().toLowerCase();
        const rows = await query(
            `SELECT kind, issue_number, issue_slug, ok, status, resend_id, attempt, error,
                    delivered_at, opened_at, clicked_at, open_count, click_count, created_at
             FROM newsletter_send_log WHERE email = $1
             ORDER BY created_at DESC LIMIT 100`,
            [email]
        );
        return NextResponse.json({ email, history: rows.rows });
    }

    const agg = req.nextUrl.searchParams.get('aggregate');
    if (agg) {
        const res = await query(`
            SELECT
              COUNT(*) FILTER (WHERE status = 'pending')              AS pending,
              COUNT(*) FILTER (WHERE status = 'confirmed')            AS confirmed,
              COUNT(*) FILTER (WHERE status = 'unsubscribed')         AS unsubscribed,
              COUNT(*) FILTER (WHERE status = 'email_change_pending') AS change_pending,
              COUNT(*) FILTER (WHERE status = 'expired_pending')      AS expired_pending
            FROM newsletter_subscribers`);
        const dres = await query(`
            SELECT
              COUNT(*) FILTER (WHERE state = 'eligible')  AS eligible,
              COUNT(*) FILTER (WHERE state = 'redeemed')  AS redeemed,
              COUNT(*) FILTER (WHERE state = 'expired')   AS expired,
              COUNT(*) FILTER (WHERE state = 'revoked')   AS revoked
            FROM newsletter_discounts`);
        return NextResponse.json({ subscribers: res.rows[0], discounts: dres.rows[0] });
    }

    const email = req.nextUrl.searchParams.get('email') ?? '';
    if (!email.includes('@')) return NextResponse.json({ error: 'Provide ?email=' }, { status: 400 });

    const sub = await query(
        `SELECT s.*, d.state AS discount_state, d.window_start, d.window_end, d.personal_code,
                d.redeemed_at, d.order_id, d.account_id, d.revoked_reason
         FROM newsletter_subscribers s
         LEFT JOIN newsletter_discounts d ON d.subscriber_id = s.id
         WHERE s.email = $1
            OR s.id IN (SELECT subscriber_id FROM newsletter_emails WHERE email = $1)`,
        [email.trim().toLowerCase()]
    );
    if (!sub.rows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const id = sub.rows[0].id;
    const emails = await query(
        `SELECT email, role, added_at, confirmed_at, retired_at FROM newsletter_emails
         WHERE subscriber_id = $1 ORDER BY added_at`, [id]
    );
    const events = await query(
        `SELECT event, meta, created_at FROM newsletter_events
         WHERE subscriber_id = $1 ORDER BY created_at DESC LIMIT 50`, [id]
    );
    return NextResponse.json({ subscriber: sub.rows[0], emails: emails.rows, events: events.rows });
}

export async function POST(req: NextRequest) {
    const gate = await resolveAdmin(req);
    if (!gate.isAdmin) return NextResponse.json({ error: gate.error ?? 'Forbidden' }, { status: gate.status });
    await ensureNewsletterTables();

    try {
        const body = await req.json();
        const action = String(body.action ?? '');

        if (action === 'update-settings') {
            const { updateSettings } = await import('@/lib/newsletter/send-engine');
            try {
                const { action: _a, ...patch } = body;
                return NextResponse.json({ ok: true, settings: await updateSettings(patch) });
            } catch (e) {
                return NextResponse.json({ error: (e as Error).message }, { status: 400 });
            }
        }

        const id = Number(body.subscriberId);
        if (!Number.isInteger(id)) return NextResponse.json({ error: 'subscriberId required' }, { status: 400 });

        if (action === 'resend-confirmation') {
            const sub = await query(`SELECT id, email, status FROM newsletter_subscribers WHERE id = $1`, [id]);
            if (!sub.rows[0] || sub.rows[0].status !== 'pending') {
                return NextResponse.json({ error: 'Subscriber is not pending' }, { status: 400 });
            }
            const { newToken } = await import('@/lib/newsletter/normalize');
            const { sendConfirmationEmail } = await import('@/lib/newsletter/email');
            const confirm = newToken();
            const change = newToken();
            await query(
                `INSERT INTO newsletter_tokens (token_hash, subscriber_id, purpose, target_email, expires_at)
                 VALUES ($1, $2, 'confirm', $3, NOW() + INTERVAL '7 days'),
                        ($4, $2, 'change_email', $3, NOW() + INTERVAL '7 days')`,
                [confirm.hash, id, sub.rows[0].email, change.hash]
            );
            const emailed = await sendConfirmationEmail({
                to: sub.rows[0].email, confirmToken: confirm.raw, changeToken: change.raw,
            });
            const { recordNewsletterEvent } = await import('@/lib/newsletter/db');
            await recordNewsletterEvent('confirmation_sent', { by: 'admin' }, id);
            return NextResponse.json({ ok: true, emailed });
        }

        if (action === 'extend-window' || action === 'revoke-discount') {
            const reason = String(body.reason ?? '').trim();
            if (!reason) return NextResponse.json({ error: 'A reason is required' }, { status: 400 });
            if (action === 'extend-window') {
                const days = Math.min(180, Math.max(1, Number(body.days) || 30));
                const res = await query(
                    `UPDATE newsletter_discounts
                     SET state = 'eligible', window_end = GREATEST(COALESCE(window_end, NOW()), NOW()) + ($2 || ' days')::interval,
                         updated_at = NOW()
                     WHERE subscriber_id = $1 RETURNING window_end`,
                    [id, String(days)]
                );
                if (!res.rows[0]) return NextResponse.json({ error: 'No discount record' }, { status: 404 });
                const { recordNewsletterEvent } = await import('@/lib/newsletter/db');
                await recordNewsletterEvent('lifecycle_email_sent', { admin_action: 'extend-window', days, reason }, id);
                return NextResponse.json({ ok: true, windowEnd: res.rows[0].window_end });
            }
            const res = await query(
                `UPDATE newsletter_discounts
                 SET state = 'revoked', revoked_reason = $2, updated_at = NOW()
                 WHERE subscriber_id = $1 AND state <> 'redeemed' RETURNING state`,
                [id, `admin: ${reason}`]
            );
            if (!res.rows[0]) return NextResponse.json({ error: 'Nothing to revoke (already redeemed or missing)' }, { status: 400 });
            const { recordNewsletterEvent } = await import('@/lib/newsletter/db');
            await recordNewsletterEvent('discount_revoked', { reason: `admin: ${reason}` }, id);
            return NextResponse.json({ ok: true });
        }

        if (action === 'send-issue') {
            const issueNumber = Number(body.issueNumber);
            const { getIssueByNumber, issueRecipients } = await import('@/lib/newsletter/issue-email');
            const issue = getIssueByNumber(issueNumber);
            if (!issue) return NextResponse.json({ error: 'Unknown issue number' }, { status: 400 });
            const previewTo = body.previewTo ? String(body.previewTo) : null;

            if (previewTo) {
                // Test send to one address only. Logged as kind='preview' (the
                // drip engine reads only kind='issue') so the delivery webhook
                // can update its status and bounces become visible.
                const { sendIssueEmailDetailed } = await import('@/lib/newsletter/issue-email');
                const res = await sendIssueEmailDetailed(issue, {
                    id, email: previewTo, referral_id: null,
                    discount_state: 'eligible', window_end: null,
                });
                if (!res.ok) {
                    return NextResponse.json({ error: `Preview send failed: ${res.error ?? 'unknown'}` }, { status: 502 });
                }
                await query(
                    `INSERT INTO newsletter_send_log
                       (email, subscriber_id, kind, issue_number, issue_slug, ok, status, status_at, attempt, resend_id)
                     VALUES ($1, $2, 'preview', $3, $4, TRUE, 'accepted', NOW(), 1, $5)`,
                    [previewTo.trim().toLowerCase(), id, issue.number, issue.slug, res.resendId]
                );
                return NextResponse.json({ ok: true, preview: previewTo, resendId: res.resendId });
            }

            const limit = Number.isInteger(Number(body.limit)) && Number(body.limit) > 0
                ? Math.floor(Number(body.limit))
                : undefined;
            const recipients = await issueRecipients(limit);
            const { sendIssueEmailDetailed } = await import('@/lib/newsletter/issue-email');
            const { getSettings, sleep } = await import('@/lib/newsletter/send-engine');
            const pace = (await getSettings()).pace_ms;
            let sent = 0, failed = 0, alreadySent = 0;
            const failures: string[] = [];
            let lastSendAt = 0;
            for (const r of recipients) {
                // Claim a row in the send log first: the unique live-send index
                // rejects a second send of the same issue to the same address,
                // and the drip engine's history stays aware of what went out.
                let logId: number | null = null;
                try {
                    const ins = await query(
                        `INSERT INTO newsletter_send_log
                           (email, subscriber_id, kind, issue_number, issue_slug, ok, status, status_at, attempt)
                         VALUES ($1, $2, 'issue', $3, $4, FALSE, 'sending', NOW(), 1) RETURNING id`,
                        [r.email.trim().toLowerCase(), r.id, issue.number, issue.slug]
                    );
                    logId = ins.rows[0].id;
                } catch (err) {
                    if ((err as { code?: string })?.code === '23505') { alreadySent++; continue; }
                    throw err;
                }
                const gap = pace - (Date.now() - lastSendAt);
                if (lastSendAt > 0 && gap > 0) await sleep(gap);
                lastSendAt = Date.now();
                const res = await sendIssueEmailDetailed(issue, r);
                if (res.ok) {
                    sent++;
                    await query(
                        `UPDATE newsletter_send_log
                         SET ok = TRUE, status = 'accepted', status_at = NOW(), resend_id = $2, error = NULL
                         WHERE id = $1`, [logId, res.resendId]
                    );
                } else {
                    failed++;
                    if (failures.length < 5 && res.error) failures.push(res.error.slice(0, 200));
                    await query(
                        `UPDATE newsletter_send_log SET ok = FALSE, status = 'failed', status_at = NOW(), error = $2 WHERE id = $1`,
                        [logId, res.error ?? 'unknown error']
                    );
                }
            }
            return NextResponse.json({
                ok: true, issue: issueNumber, sent, failed, alreadySent,
                total: recipients.length,
                ...(failures.length ? { failures } : {}),
            });
        }

        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    } catch (err) {
        console.error('[admin/newsletter]', err);
        return NextResponse.json({ error: 'Admin action failed' }, { status: 500 });
    }
}
