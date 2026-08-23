const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FROM_EMAIL = 'TradeMind <signals@trademind.bot>';
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://trademind.bot';

export async function sendFreeMonthReminderEmail(input: {
    to: string;
    accountName: string;
    endsAt: string;
}): Promise<boolean> {
    if (!RESEND_API_KEY) {
        console.warn('[Membership email] RESEND_API_KEY not configured');
        return false;
    }

    const endDate = new Date(input.endsAt).toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric',
    });
    const subject = `Your TradeMind free month ends ${endDate}`;
    const text = [
        `Your free month for ${input.accountName} ends on ${endDate}.`,
        'Subscribe to keep receiving signals for this account.',
        `${BASE_URL}/accounts`,
    ].join('\n\n');
    const html = `<div style="font-family:Arial,sans-serif;color:#111827;max-width:560px;margin:0 auto">
        <h2 style="margin:0 0 16px">Keep ${escapeHtml(input.accountName)} active</h2>
        <p>Your free month ends on <strong>${escapeHtml(endDate)}</strong>.</p>
        <p>Subscribe to keep receiving signals for this account.</p>
        <p><a href="${BASE_URL}/accounts" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:6px">View account</a></p>
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
            console.error('[Membership email] Resend failed:', response.status, await response.text());
            return false;
        }
        return true;
    } catch (error) {
        console.error('[Membership email] Failed to send reminder:', error);
        return false;
    }
}

function escapeHtml(value: string): string {
    return value.replace(/[&<>'"]/g, (character) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
    }[character] || character));
}
