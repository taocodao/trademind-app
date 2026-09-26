import { NextRequest, NextResponse } from 'next/server';
import { resolveAdmin } from '@/lib/admin-gate';
import { query } from '@/lib/db';
import { ensureNewsletterTables } from '@/lib/newsletter/db';

export const dynamic = 'force-dynamic';

/**
 * Admin newsletter tools (support@trademind.bot only):
 *   GET  ?email=x        -> subscriber lookup (state, discount, emails, events)
 *   POST { action, email | subscriberId, reason?, days? }
 *      resend-confirmation | extend-window | revoke-discount
 *   GET  ?aggregate=1    -> aggregate numbers only (no raw email lists)
 */
export async function GET(req: NextRequest) {
    const gate = await resolveAdmin(req);
    if (!gate.isAdmin) return NextResponse.json({ error: gate.error ?? 'Forbidden' }, { status: gate.status });
    await ensureNewsletterTables();

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
            const { getIssueByNumber, issueRecipients, sendIssueEmail } = await import('@/lib/newsletter/issue-email');
            const issue = getIssueByNumber(issueNumber);
            if (!issue) return NextResponse.json({ error: 'Unknown issue number' }, { status: 400 });
            const previewTo = body.previewTo ? String(body.previewTo) : null;

            if (previewTo) {
                // Test send to one address only.
                const sent = await sendIssueEmail(issue, {
                    id, email: previewTo, referral_id: null,
                    discount_state: 'eligible', window_end: null,
                });
                return NextResponse.json({ ok: sent, preview: previewTo });
            }

            const limit = Number.isInteger(Number(body.limit)) && Number(body.limit) > 0
                ? Math.floor(Number(body.limit))
                : undefined;
            const recipients = await issueRecipients(limit);
            let sent = 0, failed = 0;
            for (const r of recipients) {
                const ok = await sendIssueEmail(issue, r);
                if (ok) sent++; else failed++;
            }
            return NextResponse.json({ ok: true, issue: issueNumber, sent, failed, total: recipients.length });
        }

        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    } catch (err) {
        console.error('[admin/newsletter]', err);
        return NextResponse.json({ error: 'Admin action failed' }, { status: 500 });
    }
}
