import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { sendSignalEmail, type SignalEmailData } from '@/lib/signal-email';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * POST /api/internal/test-signal-email
 * Internal tool: render and send a signal email exactly as the fan-out would,
 * WITHOUT touching any virtual account. Used to verify email content/layout
 * (e.g. broker order-entry guides) end-to-end through Resend.
 *
 * Auth: same shared secret as /api/signals/notify (INTERNAL_API_SECRET env or
 * internal_config.fanout_secret DB row).
 *
 * Body: { to: string, data: SignalEmailData }
 */
export async function POST(req: Request) {
    const auth = req.headers.get('authorization') || '';
    const bearer = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
    const envSecret = process.env.INTERNAL_API_SECRET;
    let dbSecret: string | null = null;
    try {
        await pool.query(`CREATE TABLE IF NOT EXISTS internal_config (key TEXT PRIMARY KEY, value TEXT)`);
        const r = await pool.query(`SELECT value FROM internal_config WHERE key = 'fanout_secret'`);
        dbSecret = r.rows[0]?.value ?? null;
    } catch (e) {
        console.warn('[TestSignalEmail] internal_config lookup failed:', e);
    }
    const configured = [envSecret, dbSecret].filter(Boolean) as string[];
    if (configured.length === 0 || !configured.includes(bearer)) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const to = String(body.to || '');
        const data = body.data as SignalEmailData;
        if (!to || !to.includes('@')) {
            return NextResponse.json({ success: false, error: 'Valid "to" email required' }, { status: 400 });
        }
        if (!data || !data.strategy) {
            return NextResponse.json({ success: false, error: '"data" (SignalEmailData) required' }, { status: 400 });
        }
        await sendSignalEmail(to, data);
        return NextResponse.json({ success: true, sent: to });
    } catch (err) {
        console.error('[TestSignalEmail] failed:', err);
        return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
    }
}
