import { NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { query } from '@/lib/db';
import { ensureReferralCode } from '@/lib/referrals';

export const dynamic = 'force-dynamic';

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';

function buildEmailHtml(referralUrl: string): string {
    return `<!doctype html>
<html lang="en"><body style="margin:0;padding:32px;background:#0a0a0f;color:#fff;font-family:Arial,sans-serif">
  <main style="max-width:600px;margin:auto;padding:32px;background:#13111c;border:1px solid #312e42;border-radius:16px">
    <h1 style="margin-top:0">Your TradeMind referral link</h1>
    <p>Share this personal link with a friend:</p>
    <p><a href="${referralUrl}" style="color:#c4b5fd;word-break:break-all">${referralUrl}</a></p>
    <h2>How the day grants work</h2>
    <ul>
      <li>Your friend receives a $50 subscription day grant at their first payment. That is about 71 days on QQQ Basic or 53 days on QQQ LEAPS.</li>
      <li>Referred friends skip the free month and pay when they subscribe.</li>
      <li>You receive a $100 subscription day grant on your designated reward account after your friend stays active for 14 days. That is about 142 days on QQQ Basic or 107 days on QQQ LEAPS.</li>
    </ul>
    <p style="color:#a1a1aa;font-size:13px">Day grants are subscription benefits, not cash and cannot be redeemed for cash.</p>
  </main>
</body></html>`;
}

export async function POST(req: Request) {
    try {
        const userId = await getUserId();
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const { email } = await req.json();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 });
        }
        if (!RESEND_API_KEY) return NextResponse.json({ error: 'Email service is not configured.' }, { status: 503 });

        const settings = await query(`SELECT first_name FROM user_settings WHERE user_id = $1`, [userId]);
        const code = await ensureReferralCode(userId, settings.rows[0]?.first_name ?? '');
        const referralUrl = `https://trademind.bot/?ref=${code}`;
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                from: 'TradeMind <signals@trademind.bot>',
                to: [email],
                subject: 'Your TradeMind referral link',
                html: buildEmailHtml(referralUrl),
            }),
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
            console.error('[referral-invite] Resend error:', body);
            return NextResponse.json({ error: 'Unable to send referral invite' }, { status: 502 });
        }
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[referral-invite] failed:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
