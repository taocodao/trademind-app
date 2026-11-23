import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { ensureNewsletterTables } from '@/lib/newsletter/db';
import { sendSubscriberLink } from '@/lib/newsletter/link-send';
import { CLOCK_KINDS, editionSendAt, weeklyEditions, weeklySendOn } from '@/lib/newsletter/weekly';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;

const BATCH = 90;

/**
 * Weekly issue sender. Every subscriber gets the latest weekly edition on Sunday at 9:00 AM ET (editionSendAt), and only
 * when the edition is newer than the last issue email they were sent (a welcome email sent after it counts).
 * It never sends to an address with no earlier issue email, so imported addresses are not touched.
 * On only when outreach_settings weekly_issue_send is 'on'.   ?dry=1 counts who is due and sends nothing.
 */
/**
 * Retries the welcome email for recent subscribers who have no successful issue email at all. The weekly sender only
 * writes to addresses that already received one, so a failed welcome would otherwise leave that person out for good.
 * At most 3 tries, one every 20 minutes, only for people confirmed in the last 7 days.
 */
async function retryWelcomes(): Promise<{ tried: number; sent: number }> {
    const r = await query(
        `SELECT s.id, s.email, s.cadence FROM newsletter_subscribers s
          WHERE s.status = 'confirmed' AND s.confirmed_at > NOW() - INTERVAL '7 days'
            AND NOT EXISTS (SELECT 1 FROM newsletter_suppression sup WHERE sup.email = s.email)
            AND NOT EXISTS (SELECT 1 FROM newsletter_send_log l WHERE l.subscriber_id = s.id AND l.ok AND l.kind IN ${CLOCK_KINDS})
            AND (SELECT count(*) FROM newsletter_send_log l WHERE l.subscriber_id = s.id AND l.kind = 'welcome') < 3
            AND NOT EXISTS (SELECT 1 FROM newsletter_send_log l WHERE l.subscriber_id = s.id AND l.kind = 'welcome' AND l.created_at > NOW() - INTERVAL '20 minutes')
            AND s.confirmed_at < NOW() - INTERVAL '10 minutes'
          ORDER BY s.confirmed_at LIMIT 20`);
    let sent = 0;
    for (const s of r.rows as { id: number; email: string; cadence: string }[]) {
        if (await sendSubscriberLink({ email: s.email, subscriberId: s.id, cadence: s.cadence })) sent++;
        await new Promise((x) => setTimeout(x, 350));
    }
    return { tried: r.rowCount ?? 0, sent };
}

export async function GET(req: NextRequest) {
    const expected = process.env.CRON_SECRET;
    if (!expected || req.headers.get('authorization') !== `Bearer ${expected}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const dry = req.nextUrl.searchParams.get('dry') === '1';
    if (!dry && !(await weeklySendOn())) return NextResponse.json({ skipped: 'weekly issue sending is off' });
    await ensureNewsletterTables();
    const welcomeRetry = dry ? null : await retryWelcomes().catch(() => null);
    const editions = await weeklyEditions();
    const latest = editions[editions.length - 1];
    if (!latest) return NextResponse.json({ skipped: 'no published weekly edition yet' });
    const sendAt = editionSendAt(latest.date, latest.createdAt);
    if (!dry && Date.now() < sendAt.getTime()) return NextResponse.json({ welcomeRetry, skipped: 'not yet send time', edition: latest.subject, sendAt: sendAt.toISOString() });
    await ensureNewsletterTables();
    const due = await query(
        `SELECT s.id, s.email, s.cadence, l.last FROM newsletter_subscribers s
           JOIN LATERAL (SELECT max(created_at) AS last FROM newsletter_send_log WHERE subscriber_id = s.id AND ok AND kind IN ${CLOCK_KINDS}) l ON l.last IS NOT NULL
          WHERE s.status = 'confirmed' AND s.cadence IN ('weekly','both')
            AND NOT EXISTS (SELECT 1 FROM newsletter_suppression sup WHERE sup.email = s.email)
            AND l.last < $1::timestamptz
            AND NOT EXISTS (SELECT 1 FROM newsletter_send_log c WHERE c.subscriber_id = s.id AND c.kind = 'weekly_claim' AND c.created_at > NOW() - INTERVAL '30 minutes')
          ORDER BY l.last LIMIT $2`, [latest.createdAt, dry ? 100000 : BATCH]);
    if (dry) return NextResponse.json({ dry: true, edition: latest.subject, sendAt: sendAt.toISOString(), due: due.rowCount });
    let sent = 0, failed = 0;
    for (const s of due.rows as { id: number; email: string; cadence: string }[]) {
        await query(`INSERT INTO newsletter_send_log (email, subscriber_id, kind, ok) VALUES ($1,$2,'weekly_claim',false)`, [s.email, s.id]);
        const ok = await sendSubscriberLink({
            email: s.email, subscriberId: s.id, cadence: s.cadence,
            weekly: { subject: latest.subject, description: `${latest.issue.excerpt} The full brief is on the site, risk first. About five minutes.`, path: latest.path, slug: latest.issue.slug },
        });
        if (ok) sent++; else failed++;
        await new Promise((r) => setTimeout(r, 350));
    }
    return NextResponse.json({ welcomeRetry, edition: latest.subject, due: due.rowCount, sent, failed });
}
