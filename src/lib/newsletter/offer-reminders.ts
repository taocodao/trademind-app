/**
 * Reminders inside the 90 day subscriber offer window. Plain text, one link, one question.
 * Off unless outreach_settings offer_reminders is 'on'. Stops when the offer is redeemed, expired or revoked,
 * when the subscriber is not confirmed, or when the address is suppressed. Each reminder is sent once.
 */
import { query } from '@/lib/db';
import { MAILING_ADDRESS } from './email';
import { makeLongUnsubscribeToken, logNewsletterSend, ensureNewsletterTables } from './db';
import { makeDailyLinkToken } from './daily-link';
import { renderLinkEmail } from './link-email';
import { senderFor } from './link-send';
import { MEETING_URL } from '@/lib/outreach/copy-seq7';

/** Days after the offer starts. */
export const REMINDER_DAYS = [14, 35, 60, 80] as const;
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://trademind.bot';
const DAY = 864e5;

export const fmtDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' });

export async function offerRemindersOn(): Promise<boolean> {
    try { return (await query(`SELECT value FROM outreach_settings WHERE key = 'offer_reminders'`)).rows[0]?.value === 'on'; } catch { return false; }
}

/** Which reminder (1 to 4) is due, given days since the offer started and the reminders already sent. 0 when none. Only the newest due one is sent. */
export function dueReminder(daysIn: number, sent: number[]): number {
    let due = 0;
    REMINDER_DAYS.forEach((d, i) => { if (daysIn >= d) due = i + 1; });
    return due && !sent.includes(due) && !sent.some((n) => n > due) ? due : 0;
}

export function reminderText(n: number, end: Date, now: Date): { subject: string; description: string } {
    const left = Math.max(1, Math.round((end.getTime() - now.getTime()) / DAY));
    const when = fmtDate(end);
    const offer = 'Your 30% off the first year of a strategy subscription';
    if (n === 1) return { subject: 'Your subscriber offer', description: `${offer} is open until ${when}.\n\nWhat do you still want to see before you decide? A reply is enough, and I will answer you myself.` };
    if (n === 2) return { subject: 'A question on QQQ LEAPS or QQQ Defensive', description: `${offer} is open until ${when}.\n\nIs there something about QQQ LEAPS or QQQ Defensive that I can explain, or a number you want to check? Reply with it, or book a short call.` };
    if (n === 3) return { subject: `${left} days on your subscriber offer`, description: `${offer} is open for ${left} more days, until ${when}.\n\nWhat information would help you decide? I can send the data, walk through the method, or talk it over.` };
    return { subject: `Your subscriber offer ends on ${when}`, description: `${offer} ends in ${left} days, on ${when}.\n\nIf there is anything you still need to decide, tell me what it is and I will get it to you.` };
}

export async function runOfferReminders(o: { dry?: boolean; limit?: number } = {}): Promise<{ due: number; sent: number; failed: number }> {
    await ensureNewsletterTables();
    const key = process.env.RESEND_API_KEY || '';
    const rows = (await query(
        `SELECT s.id, s.email, d.window_start, d.window_end,
                COALESCE((SELECT array_agg(substring(l.kind from 16)::int) FROM newsletter_send_log l WHERE l.subscriber_id = s.id AND l.ok AND l.kind LIKE 'offer_reminder_%'), '{}') AS sent
           FROM newsletter_subscribers s JOIN newsletter_discounts d ON d.subscriber_id = s.id
          WHERE s.status = 'confirmed' AND d.state = 'eligible' AND d.window_start IS NOT NULL AND d.window_end > NOW()
            AND NOT EXISTS (SELECT 1 FROM newsletter_suppression sup WHERE sup.email = s.email)
            AND NOT EXISTS (SELECT 1 FROM newsletter_send_log r WHERE r.subscriber_id = s.id AND r.ok AND r.kind LIKE 'offer_reminder_%' AND r.created_at > NOW() - INTERVAL '5 days')
            AND NOT EXISTS (SELECT 1 FROM newsletter_send_log w WHERE w.subscriber_id = s.id AND w.ok AND w.kind IN ('welcome','weekly_issue') AND w.created_at > NOW() - INTERVAL '2 days')
          ORDER BY d.window_end LIMIT $1`, [o.limit ?? 200])).rows as { id: number; email: string; window_start: string; window_end: string; sent: number[] }[];
    const now = new Date();
    const due = rows.map((r) => ({ r, n: dueReminder(Math.floor((now.getTime() - new Date(r.window_start).getTime()) / DAY), r.sent || []) })).filter((x) => x.n > 0);
    if (o.dry || !key) return { due: due.length, sent: 0, failed: 0 };
    let sent = 0, failed = 0;
    const snd = await senderFor();
    const base = snd.host ? `https://${snd.host}` : BASE_URL;
    for (const { r, n } of due) {
        const t = reminderText(n, new Date(r.window_end), now);
        const tok = makeDailyLinkToken(r.id);
        const unsubscribeUrl = `${base}/newsletter/unsubscribe?token=${await makeLongUnsubscribeToken(r.id)}`;
        const m = renderLinkEmail({
            subject: t.subject, description: t.description, url: MEETING_URL, linkLabel: 'Book 20 minutes here',
            unsubscribeUrl, preferencesUrl: `${base}/newsletter/preferences?k=${encodeURIComponent(tok)}`, address: `TradeMind, ${MAILING_ADDRESS}`,
        });
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ from: snd.from, reply_to: snd.replyTo, to: r.email, subject: m.subject, text: m.text }),
        });
        await logNewsletterSend({ email: r.email, subscriberId: r.id, kind: `offer_reminder_${n}`, ok: res.ok });
        if (res.ok) sent++; else failed++;
        await new Promise((x) => setTimeout(x, 300));
    }
    return { due: due.length, sent, failed };
}
