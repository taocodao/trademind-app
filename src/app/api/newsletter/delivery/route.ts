import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { query } from '@/lib/db';
import { ensureNewsletterTables, recordNewsletterEvent } from '@/lib/newsletter/db';

export const dynamic = 'force-dynamic';

/**
 * Resend delivery webhook: hard bounces and complaints suppress the address
 * permanently. Complaints also revoke the discount (spam-trap farming rule).
 *
 * Requires RESEND_WEBHOOK_SECRET (svix signing secret) so senders cannot
 * forge bounce events. Returns 503 until configured.
 */
export async function POST(req: NextRequest) {
    const secret = process.env.RESEND_WEBHOOK_SECRET;
    if (!secret) return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });

    const rawBody = await req.text();
    const id = req.headers.get('svix-id') ?? '';
    const ts = req.headers.get('svix-timestamp') ?? '';
    const sig = req.headers.get('svix-signature') ?? '';
    if (!id || !ts || !sig) return NextResponse.json({ error: 'Missing signature' }, { status: 400 });

    // svix HMAC: base64(secret after "whsec_") over `${id}.${ts}.${body}`
    const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
    const expected = crypto.createHmac('sha256', key).update(`${id}.${ts}.${rawBody}`).digest('base64');
    const valid = sig.split(' ').some((part) => {
        const v = part.startsWith('v1,') ? part.slice(3) : part;
        return crypto.timingSafeEqual(Buffer.from(v), Buffer.from(expected));
    });
    if (!valid) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });

    try {
        const event = JSON.parse(rawBody);
        const email: string | undefined = event?.data?.to?.[0] ?? event?.data?.email;
        if (!email) return NextResponse.json({ ok: true, ignored: true });

        await ensureNewsletterTables();
        const normalized = email.trim().toLowerCase();
        const type: string = event?.type ?? '';

        if (type === 'email.bounced') {
            await query(
                `INSERT INTO newsletter_suppression (email, reason) VALUES ($1, 'hard_bounce')
                 ON CONFLICT (email) DO NOTHING`, [normalized]
            );
            const res = await query(
                `UPDATE newsletter_subscribers SET status = 'bounced', updated_at = NOW()
                 WHERE email = $1 AND status IN ('confirmed', 'email_change_pending', 'pending')
                 RETURNING id`, [normalized]
            );
            if (res.rows[0]) await recordNewsletterEvent('bounced', {}, res.rows[0].id);
        } else if (type === 'email.complained') {
            await query(
                `INSERT INTO newsletter_suppression (email, reason) VALUES ($1, 'complaint')
                 ON CONFLICT (email) DO NOTHING`, [normalized]
            );
            const res = await query(
                `UPDATE newsletter_subscribers SET status = 'complained', updated_at = NOW()
                 WHERE email = $1 RETURNING id`, [normalized]
            );
            if (res.rows[0]) {
                await query(
                    `UPDATE newsletter_discounts
                     SET state = 'revoked', revoked_reason = 'spam complaint', updated_at = NOW()
                     WHERE subscriber_id = $1 AND state IN ('eligible', 'redeemed')`,
                    [res.rows[0].id]
                );
                await recordNewsletterEvent('complained', {}, res.rows[0].id);
                await recordNewsletterEvent('discount_revoked', { reason: 'spam complaint' }, res.rows[0].id);
            }
        }
        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error('[newsletter/delivery]', err);
        return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
    }
}
