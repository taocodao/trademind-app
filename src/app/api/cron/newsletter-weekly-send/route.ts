import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { ensureNewsletterTables } from '@/lib/newsletter/db';
import { sendSubscriberLink } from '@/lib/newsletter/link-send';
import { CLOCK_KINDS, weeklyEditions, weeklySendOn } from '@/lib/newsletter/weekly';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;

const BATCH = 30;

/**
 * Weekly issue sender. Every subscriber gets the latest weekly edition exactly seven days after the last issue email
 * they were sent (the welcome email counts), and only when a newer edition exists than the one they last got.
 * It never sends to an address with no earlier issue email, so imported addresses are not touched.
 * On only when outreach_settings weekly_issue_send is 'on'.   ?dry=1 counts who is due and sends nothing.
 */
export async function GET(req: NextRequest) {
    const expected = process.env.CRON_SECRET;
    if (!expected || req.headers.get('authorization') !== `Bearer ${expected}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const dry = req.nextUrl.searchParams.get('dry') === '1';
    if (!dry && !(await weeklySendOn())) return NextResponse.json({ skipped: 'weekly issue sending is off' });
    const editions = await weeklyEditions();
    const latest = editions[editions.length - 1];
    if (!latest) return NextResponse.json({ skipped: 'no published weekly edition yet' });
    await ensureNewsletterTables();
    const due = await query(
        `SELECT s.id, s.email, s.cadence, l.last FROM newsletter_subscribers s
           JOIN LATERAL (SELECT max(created_at) AS last FROM newsletter_send_log WHERE subscriber_id = s.id AND ok AND kind IN ${CLOCK_KINDS}) l ON l.last IS NOT NULL
          WHERE s.status = 'confirmed' AND s.cadence IN ('weekly','both')
            AND NOT EXISTS (SELECT 1 FROM newsletter_suppression sup WHERE sup.email = s.email)
            AND l.last <= NOW() - INTERVAL '7 days' AND l.last < $1::timestamptz
            AND NOT EXISTS (SELECT 1 FROM newsletter_send_log c WHERE c.subscriber_id = s.id AND c.kind = 'weekly_claim' AND c.created_at > NOW() - INTERVAL '30 minutes')
          ORDER BY l.last LIMIT $2`, [latest.createdAt, dry ? 100000 : BATCH]);
    if (dry) return NextResponse.json({ dry: true, edition: latest.subject, due: due.rowCount });
    let sent = 0, failed = 0;
    for (const s of due.rows as { id: number; email: string; cadence: string }[]) {
        await query(`INSERT INTO newsletter_send_log (email, subscriber_id, kind, ok) VALUES ($1,$2,'weekly_claim',false)`, [s.email, s.id]);
        const ok = await sendSubscriberLink({
            email: s.email, subscriberId: s.id, cadence: s.cadence,
            weekly: { subject: latest.subject, description: `${latest.issue.excerpt} The full brief is on the site, risk first. About five minutes.`, path: latest.path, slug: latest.issue.slug },
        });
        if (ok) sent++; else failed++;
        await new Promise((r) => setTimeout(r, 300));
    }
    return NextResponse.json({ edition: latest.subject, due: due.rowCount, sent, failed });
}
