import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FROM_ADDRESS   = process.env.SIGNAL_EMAIL_FROM || 'TradeMind <signals@trademind.bot>';
const INTERNAL_EMAIL = process.env.PARTNER_NOTIFY_EMAIL || 'eric@trademind.bot';

// ── DB migration guard — runs once on cold start ───────────────────────────────
let tableReady = false;
async function ensureTable() {
    if (tableReady) return;
    await pool.query(`
        CREATE TABLE IF NOT EXISTS affiliate_applications (
            id              SERIAL PRIMARY KEY,
            name            TEXT NOT NULL,
            email           TEXT NOT NULL,
            platform        TEXT,
            profile_url     TEXT,
            audience_size   TEXT,
            message         TEXT,
            status          TEXT DEFAULT 'pending',
            affiliate_link  TEXT,
            created_at      TIMESTAMPTZ DEFAULT NOW()
        )
    `);
    tableReady = true;
}

// ── Email via Resend REST ──────────────────────────────────────────────────────
async function sendEmail(to: string, subject: string, text: string, html?: string) {
    if (!RESEND_API_KEY) {
        console.warn('[Partners] RESEND_API_KEY not set — skipping email');
        return;
    }
    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from:    FROM_ADDRESS,
            to:      [to],
            subject,
            text,
            ...(html ? { html } : {}),
        }),
    });
    if (!res.ok) {
        console.error('[Partners] Email send failed:', await res.text());
    }
}

// ── POST /api/partners/apply ───────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { name, email, platform, profileUrl, audienceSize, message } = body;

        // Validation
        if (!name?.trim() || !email?.trim() || !platform?.trim() || !profileUrl?.trim()) {
            return NextResponse.json(
                { error: 'Missing required fields: name, email, platform, profileUrl' },
                { status: 400 }
            );
        }

        // Basic email format check
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
        }

        await ensureTable();

        // Save application to DB
        await pool.query(
            `INSERT INTO affiliate_applications
                (name, email, platform, profile_url, audience_size, message)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
                name.trim(),
                email.trim().toLowerCase(),
                platform.trim(),
                profileUrl.trim(),
                audienceSize?.trim() ?? '',
                message?.trim() ?? '',
            ]
        );

        // Auto-reply to applicant
        await sendEmail(
            email.trim(),
            'TradeMind Affiliate Application Received',
            [
                `Hi ${name.trim()},`,
                '',
                `Thanks for applying to the TradeMind affiliate program.`,
                '',
                `We review applications within 24 hours and will send your unique affiliate link and`,
                `full content kit once approved.`,
                '',
                `While you wait, you can review the program details at trademind.bot/partners.`,
                '',
                `Questions? Just reply to this email.`,
                '',
                `— Eric at TradeMind`,
                `trademind.bot`,
            ].join('\n'),
            // HTML version
            `<!DOCTYPE html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;background:#f3f4f6;padding:32px 16px;margin:0">
<table width="600" align="center" cellpadding="0" cellspacing="0"
       style="max-width:600px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
  <tr><td style="background:#111827;padding:24px 32px">
    <span style="font-size:20px;font-weight:800;color:#fff">TradeMind</span><br>
    <span style="font-size:12px;color:#9ca3af">Affiliate Program</span>
  </td></tr>
  <tr><td style="padding:28px 32px">
    <p style="color:#374151;font-size:15px;margin:0 0 16px">Hi ${name.trim()},</p>
    <p style="color:#111827;font-size:15px;margin:0 0 16px;font-weight:500">Your application has been received. ✓</p>
    <p style="color:#374151;font-size:14px;margin:0 0 16px;line-height:1.6">
      We review applications within <strong>24 hours</strong>. Once approved, you'll receive your unique
      affiliate link and the full content kit (TikTok hooks, tweet threads, performance charts) by email.
    </p>
    <p style="color:#374151;font-size:14px;margin:0 0 24px;line-height:1.6">
      Questions? Just reply to this email.
    </p>
    <table cellpadding="0" cellspacing="0"><tr><td>
      <a href="https://trademind.bot/partners"
         style="display:inline-block;background:#111827;color:#fff;padding:12px 28px;border-radius:6px;
                text-decoration:none;font-weight:700;font-size:14px">
        View Program Details →
      </a>
    </td></tr></table>
    <p style="color:#9ca3af;font-size:12px;margin:24px 0 0">— Eric at TradeMind &middot; trademind.bot</p>
  </td></tr>
</table>
</body></html>`
        );

        // Internal notification
        await sendEmail(
            INTERNAL_EMAIL,
            `[Partner Application] ${name.trim()} — ${platform.trim()}`,
            [
                `New affiliate application received.`,
                '',
                `Name:     ${name.trim()}`,
                `Email:    ${email.trim()}`,
                `Platform: ${platform.trim()}`,
                `Profile:  ${profileUrl.trim()}`,
                `Audience: ${audienceSize?.trim() || 'Not specified'}`,
                '',
                `Message:`,
                message?.trim() || '(none)',
                '',
                `---`,
                `Approve via Whop dashboard — set 300% affiliate rate on the $5 Trial product.`,
            ].join('\n')
        );

        return NextResponse.json({ success: true });

    } catch (err: any) {
        console.error('[Partners] Apply error:', err);
        return NextResponse.json(
            { error: 'Failed to submit application. Please try again.' },
            { status: 500 }
        );
    }
}
