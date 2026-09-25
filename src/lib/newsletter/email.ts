/**
 * Newsletter confirmation emails (Resend, same pipeline as signal emails).
 */
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FROM_EMAIL = 'TradeMind <signals@trademind.bot>';
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://trademind.bot';

function esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function sendConfirmationEmail(input: {
    to: string;
    confirmToken: string;
    changeToken: string;
}): Promise<boolean> {
    if (!RESEND_API_KEY) {
        console.warn('[Newsletter email] RESEND_API_KEY not configured');
        return false;
    }
    const confirmUrl = `${BASE_URL}/newsletter/confirm?token=${input.confirmToken}`;
    const changeUrl = `${BASE_URL}/newsletter/change-email?token=${input.changeToken}`;
    const subject = 'Confirm your subscription to The AI Systematic Investor';
    const text = [
        'Confirm your subscription to The AI Systematic Investor, the TradeMind newsletter.',
        '',
        `Confirm this email: ${confirmUrl}`,
        '',
        `Signed up with the wrong address? Use a different email address: ${changeUrl}`,
        '',
        'Confirmed subscribers get 30% off a one-year TradeMind subscription for 3 months after confirming.',
    ].join('\n');
    const btn =
        'display:inline-block;background:#8B5CF6;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:bold';
    const html = `<div style="font-family:Arial,sans-serif;color:#111827;max-width:560px;margin:0 auto">
        <h2 style="margin:0 0 12px">Confirm your subscription</h2>
        <p>You asked for <strong>The AI Systematic Investor</strong>, the weekly TradeMind research letter on QQQ, LEAPS, PMCC, semiconductor options, and risk control.</p>
        <p style="margin:24px 0"><a href="${esc(confirmUrl)}" style="${btn}">Confirm this email</a></p>
        <p style="color:#6b7280;font-size:14px">Confirmed subscribers get <strong>30% off a one-year TradeMind subscription</strong> for 3 months after confirming.</p>
        <p style="font-size:14px"><a href="${esc(changeUrl)}" style="color:#8B5CF6">Use a different email address</a></p>
        <p style="color:#9ca3af;font-size:12px;margin-top:28px">If you did not request this, you can ignore this email.</p>
    </div>`;

    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ from: FROM_EMAIL, to: input.to, subject, text, html }),
        });
        if (!response.ok) {
            console.error('[Newsletter email] Resend failed:', response.status, await response.text());
            return false;
        }
        return true;
    } catch (error) {
        console.error('[Newsletter email]', error);
        return false;
    }
}
