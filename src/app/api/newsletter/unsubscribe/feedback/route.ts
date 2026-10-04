import { NextRequest, NextResponse } from 'next/server';
import { findToken, recordNewsletterEvent } from '@/lib/newsletter/db';

export const dynamic = 'force-dynamic';

const REASONS = new Set([
    'too_frequent', 'not_relevant', 'too_advanced', 'too_basic',
    'never_signed_up', 'wrong_email', 'other',
]);

/**
 * Optional exit survey shown on the unsubscribe confirmation page. The reader
 * has already been removed; this only records why, tied to the same
 * unsubscribe token. It never sends mail and never changes list status.
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => ({}));
        const token = String(body.token ?? '');
        const reason = String(body.reason ?? '');
        const note = String(body.note ?? '').trim().slice(0, 500);
        if (!token || !REASONS.has(reason)) {
            return NextResponse.json({ error: 'Invalid feedback' }, { status: 400 });
        }
        const tok = await findToken(token, 'unsubscribe');
        if (!tok) return NextResponse.json({ error: 'Invalid link' }, { status: 404 });
        await recordNewsletterEvent('unsubscribe_feedback', { reason, ...(note ? { note } : {}) }, tok.subscriber_id);
        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error('[newsletter/unsubscribe/feedback]', err);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
