import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSettings, applySendgridEvent } from '@/lib/outreach/db';
import { ensureNewsletterTables } from '@/lib/newsletter/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * SendGrid Event Webhook for the invitation campaign (signed webhook).
 * The ECDSA public key SendGrid returns when signing is enabled is stored in outreach_settings.sg_webhook_pubkey.
 * Without a key this returns 503 and records nothing. Events are matched by the token and step sent as custom_args.
 */
export async function POST(req: NextRequest) {
    const s = await getSettings();
    const pub = (s.sg_webhook_pubkey || process.env.SENDGRID_WEBHOOK_PUBLIC_KEY || '').trim();
    if (!pub) return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });

    const raw = await req.text();
    const sig = req.headers.get('x-twilio-email-event-webhook-signature') ?? '';
    const ts = req.headers.get('x-twilio-email-event-webhook-timestamp') ?? '';
    if (!sig || !ts) return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    let valid = false;
    try {
        const key = crypto.createPublicKey({ key: Buffer.from(pub, 'base64'), format: 'der', type: 'spki' });
        valid = crypto.createVerify('sha256').update(ts + raw).verify(key, sig, 'base64');
    } catch { valid = false; }
    if (!valid) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });

    try {
        await ensureNewsletterTables();
        const events = JSON.parse(raw) as Record<string, unknown>[];
        let matched = 0;
        for (const e of Array.isArray(events) ? events : []) {
            const ok = await applySendgridEvent({
                event: String(e.event ?? ''), token: e.token as string | undefined, step: e.step as string | number | undefined,
                sg_message_id: e.sg_message_id as string | undefined, reason: e.reason as string | undefined,
                type: e.type as string | undefined, email: e.email as string | undefined,
            });
            if (ok) matched++;
        }
        return NextResponse.json({ ok: true, matched });
    } catch (err) {
        console.error('[outreach/sendgrid-events]', err);
        return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
    }
}
