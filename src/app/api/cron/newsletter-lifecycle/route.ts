import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import {
    ensureNewsletterTables, markLifecycle, makeUnsubscribeToken,
    recordNewsletterEvent, PENDING_EXPIRY_DAYS,
} from '@/lib/newsletter/db';
import {
    sendConfirmationReminderEmail, sendPendingExpiryWarningEmail,
    sendOfferEmail,
} from '@/lib/newsletter/email';
import { newToken } from '@/lib/newsletter/normalize';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const HOUR = 3600e3;
const DAY = 24 * HOUR;
const BASE = process.env.NEXT_PUBLIC_APP_URL || 'https://trademind.bot';

interface PendingRow { id: number; email: string; created_at: string }
interface ConfirmedRow {
    id: number; email: string; first_confirmed_at: string;
    window_end: string; personal_code: string;
}

/** Fresh single-use confirm token for reminder emails. */
async function issueConfirmToken(subscriberId: number, email: string): Promise<string> {
    const { raw, hash } = newToken();
    await query(
        `INSERT INTO newsletter_tokens (token_hash, subscriber_id, purpose, target_email, expires_at)
         VALUES ($1, $2, 'confirm', $3, NOW() + INTERVAL '7 days')`,
        [hash, subscriberId, email]
    );
    return raw;
}

/** Daily lifecycle: confirmation reminders, pending expiry, offer timeline. */
export async function GET(req: NextRequest) {
    const expected = process.env.CRON_SECRET;
    if (!expected || req.headers.get('authorization') !== `Bearer ${expected}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        await ensureNewsletterTables();
        const now = Date.now();
        let reminders = 0, warnings = 0, expiredPending = 0, offerEmails = 0, expiredDiscounts = 0;

        // --- Pending subscribers: reminders at 24h and 72h, warning 7 days
        // before the 60-day pending expiry, then expire.
        const pending = await query(
            `SELECT id, email, created_at FROM newsletter_subscribers WHERE status = 'pending'`
        );
        for (const row of pending.rows as PendingRow[]) {
            const age = now - new Date(row.created_at).getTime();

            if (age >= PENDING_EXPIRY_DAYS * DAY) {
                await query(
                    `UPDATE newsletter_subscribers SET status = 'expired_pending', updated_at = NOW()
                     WHERE id = $1 AND status = 'pending'`, [row.id]
                );
                await recordNewsletterEvent('pending_expired', {}, row.id);
                expiredPending++;
                continue;
            }
            if (age >= (PENDING_EXPIRY_DAYS - 7) * DAY) {
                if (await markLifecycle(row.id, 'expiry_warning')) {
                    const raw = await issueConfirmToken(row.id, row.email);
                    if (await sendPendingExpiryWarningEmail({ to: row.email, confirmToken: raw })) warnings++;
                }
                continue;
            }
            if (age >= 72 * HOUR) {
                if (await markLifecycle(row.id, 'reminder2')) {
                    const raw = await issueConfirmToken(row.id, row.email);
                    if (await sendConfirmationReminderEmail({ to: row.email, confirmToken: raw, which: 2 })) {
                        reminders++;
                        await recordNewsletterEvent('confirmation_reminder_sent', { which: 2 }, row.id);
                    }
                }
                continue;
            }
            if (age >= 24 * HOUR) {
                if (await markLifecycle(row.id, 'reminder1')) {
                    const raw = await issueConfirmToken(row.id, row.email);
                    if (await sendConfirmationReminderEmail({ to: row.email, confirmToken: raw, which: 1 })) {
                        reminders++;
                        await recordNewsletterEvent('confirmation_reminder_sent', { which: 1 }, row.id);
                    }
                }
            }
        }

        // --- Confirmed subscribers with an eligible discount: 90-day timeline.
        // Rule: unsubscribed people get no marketing reminders, so only
        // confirmed / email_change_pending rows are selected here.
        const eligible = await query(
            `SELECT s.id, s.email, s.first_confirmed_at, d.window_end, d.personal_code
             FROM newsletter_subscribers s
             JOIN newsletter_discounts d ON d.subscriber_id = s.id
             WHERE s.status IN ('confirmed', 'email_change_pending')
               AND d.state = 'eligible'`
        );
        for (const row of eligible.rows as ConfirmedRow[]) {
            const days = (now - new Date(row.first_confirmed_at).getTime()) / DAY;
            const unsubUrl = `${BASE}/newsletter/unsubscribe?token=${await makeUnsubscribeToken(row.id)}`;

            if (days >= 90) {
                await query(
                    `UPDATE newsletter_discounts SET state = 'expired', updated_at = NOW()
                     WHERE subscriber_id = $1 AND state = 'eligible'`, [row.id]
                );
                await recordNewsletterEvent('discount_expired', {}, row.id);
                expiredDiscounts++;
                if (await markLifecycle(row.id, 'offer_expired_email')) {
                    await sendOfferEmail({ to: row.email, kind: 'expired', unsubscribeUrl: unsubUrl });
                    offerEmails++;
                }
                continue;
            }

            let kind: 'checkin' | 'reminder' | 'final-week' | 'last-day' | null = null;
            let mark = '';
            if (days >= 89) { kind = 'last-day'; mark = 'offer_day89'; }
            else if (days >= 83) { kind = 'final-week'; mark = 'offer_day83'; }
            else if (days >= 60) { kind = 'reminder'; mark = 'offer_day60'; }
            else if (days >= 30) { kind = 'checkin'; mark = 'offer_day30'; }

            if (kind && await markLifecycle(row.id, mark)) {
                const sent = await sendOfferEmail({
                    to: row.email, kind, offerExpires: row.window_end, unsubscribeUrl: unsubUrl,
                });
                if (sent) {
                    offerEmails++;
                    await recordNewsletterEvent('lifecycle_email_sent', { kind }, row.id);
                }
            }
        }

        return NextResponse.json({
            ok: true, reminders, warnings, expiredPending, offerEmails, expiredDiscounts,
        });
    } catch (err) {
        console.error('[cron/newsletter-lifecycle]', err);
        return NextResponse.json({ error: 'Lifecycle run failed' }, { status: 500 });
    }
}
