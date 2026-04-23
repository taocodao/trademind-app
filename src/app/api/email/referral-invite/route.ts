import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const PROMO_REF_URL = 'https://trademind.bot/?ref=ACE79';

function buildEmailHtml(email: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your $100 TradeMind Referral Link</title>
</head>
<body style="margin:0;padding:0;background-color:#0A0A0F;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0F;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:linear-gradient(135deg,#13111c 0%,#0d0b18 100%);border-radius:16px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,rgba(124,58,237,0.3) 0%,rgba(59,130,246,0.2) 100%);padding:40px 40px 30px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.08);">
              <div style="width:64px;height:64px;background:rgba(124,58,237,0.2);border-radius:50%;border:1px solid rgba(124,58,237,0.4);display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
                <span style="font-size:28px;">🎁</span>
              </div>
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:800;letter-spacing:-0.5px;">Your $100 Referral Reward</h1>
              <p style="margin:10px 0 0;color:rgba(255,255,255,0.5);font-size:14px;">Exclusively from TradeMind</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="color:rgba(255,255,255,0.8);font-size:16px;line-height:1.7;margin:0 0 24px;">
                Hi there! 👋 Here's your personal referral link that unlocks <strong style="color:#a78bfa;">$100 worth of free subscription days</strong> — split between you and whoever you invite.
              </p>

              <!-- CTA Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(124,58,237,0.1);border:1px solid rgba(124,58,237,0.3);border-radius:12px;margin-bottom:28px;">
                <tr>
                  <td style="padding:24px;text-align:center;">
                    <p style="margin:0 0 8px;color:rgba(255,255,255,0.5);font-size:12px;text-transform:uppercase;letter-spacing:1px;">Your Personal Referral Link</p>
                    <a href="${PROMO_REF_URL}" style="display:inline-block;color:#a78bfa;font-size:16px;font-weight:700;text-decoration:none;word-break:break-all;margin-bottom:16px;">${PROMO_REF_URL}</a>
                    <br />
                    <a href="${PROMO_REF_URL}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:50px;letter-spacing:0.3px;">
                      Claim My $100 Reward →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- How it works -->
              <h2 style="color:#ffffff;font-size:18px;font-weight:700;margin:0 0 16px;">How the $100 reward works</h2>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="vertical-align:top;padding:12px 16px 12px 0;width:32px;">
                    <div style="width:28px;height:28px;background:rgba(124,58,237,0.2);border-radius:50%;text-align:center;line-height:28px;color:#a78bfa;font-weight:700;font-size:13px;">1</div>
                  </td>
                  <td style="vertical-align:top;padding:12px 0;">
                    <p style="margin:0;color:#ffffff;font-size:14px;font-weight:600;">Stage 1 — At Signup (instant $50 for both)</p>
                    <p style="margin:4px 0 0;color:rgba(255,255,255,0.5);font-size:13px;line-height:1.6;">Your friend gets $50 in extra trial days on top of the 14-day base trial. You get $50 added to your subscription immediately.</p>
                  </td>
                </tr>
                <tr>
                  <td style="vertical-align:top;padding:12px 16px 12px 0;width:32px;">
                    <div style="width:28px;height:28px;background:rgba(34,197,94,0.2);border-radius:50%;text-align:center;line-height:28px;color:#4ade80;font-weight:700;font-size:13px;">2</div>
                  </td>
                  <td style="vertical-align:top;padding:12px 0;">
                    <p style="margin:0;color:#ffffff;font-size:14px;font-weight:600;">Stage 2 — At First Charge (another $50 for both)</p>
                    <p style="margin:4px 0 0;color:rgba(255,255,255,0.5);font-size:13px;line-height:1.6;">When your friend's card is first charged, both of you automatically get another $50 in free subscription days. Total: $100 each.</p>
                  </td>
                </tr>
              </table>

              <p style="color:rgba(255,255,255,0.4);font-size:12px;line-height:1.6;margin:0;border-top:1px solid rgba(255,255,255,0.06);padding-top:20px;">
                Credits are applied as free subscription days at your plan's daily rate. No cash out needed. You received this email because you requested your referral link on trademind.bot.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:rgba(0,0,0,0.3);padding:20px 40px;text-align:center;border-top:1px solid rgba(255,255,255,0.06);">
              <p style="margin:0;color:rgba(255,255,255,0.3);font-size:12px;">© 2025 TradeMind · <a href="https://trademind.bot/privacy" style="color:rgba(255,255,255,0.3);text-decoration:none;">Privacy Policy</a> · <a href="https://trademind.bot/terms" style="color:rgba(255,255,255,0.3);text-decoration:none;">Terms</a></p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

export async function POST(req: Request) {
    try {
        const { email } = await req.json();

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 });
        }

        if (!RESEND_API_KEY) {
            console.warn('RESEND_API_KEY not configured — referral invite email skipped.');
            return NextResponse.json({ error: 'Email service not configured on server. Add RESEND_API_KEY to Vercel env vars.' }, { status: 503 });
        }

        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: 'TradeMind <signals@trademind.bot>',
                to: [email],
                subject: '🎁 Your $100 TradeMind Referral Link is here',
                html: buildEmailHtml(email),
            }),
        });

        const resBody = await res.json().catch(() => ({ raw: 'non-JSON response' }));

        if (!res.ok) {
            // Surface the exact Resend error so it's visible in Vercel function logs
            // AND returned to the client for debugging
            console.error('[referral-invite] Resend API error:', JSON.stringify(resBody));
            const resendMessage = (resBody as any)?.message || (resBody as any)?.name || JSON.stringify(resBody);
            return NextResponse.json(
                { error: `Resend error: ${resendMessage}` },
                { status: 502 }
            );
        }

        console.log('[referral-invite] Email sent to', email, '— Resend id:', (resBody as any)?.id);
        return NextResponse.json({ success: true });

    } catch (err: any) {
        console.error('[referral-invite] Unexpected error:', err);
        return NextResponse.json({ error: `Internal server error: ${err.message}` }, { status: 500 });
    }
}

// GET — quick health check: hit /api/email/referral-invite in browser to verify key + domain
export async function GET() {
    if (!RESEND_API_KEY) {
        return NextResponse.json({ ok: false, reason: 'RESEND_API_KEY env var is missing on Vercel' });
    }

    // Check which domains are verified in this Resend account
    const res = await fetch('https://api.resend.com/domains', {
        headers: { 'Authorization': `Bearer ${RESEND_API_KEY}` },
    });
    const body = await res.json().catch(() => ({}));

    return NextResponse.json({
        ok: res.ok,
        key_present: true,
        key_prefix: RESEND_API_KEY.substring(0, 10) + '...',
        domains: body,
    });
}
