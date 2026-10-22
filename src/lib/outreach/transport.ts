/**
 * Outbound transport for the invitation campaign. Each sending domain is routed through one provider
 * ('resend' or 'sendgrid'); the choice is stored on outreach_domains.transport.
 *
 * SendGrid is used with click, open and subscription tracking off, no SendGrid footer, our own redirect
 * links and a one-click List-Unsubscribe header. token and step travel as custom_args so webhook events
 * can be matched to the send without relying on the provider message id.
 */
export type Transport = 'resend' | 'sendgrid';

export interface MailInput {
    transport: Transport;
    from: string;                 // "Display Name <local@domain>"
    to: string;
    replyTo?: string;
    subject: string;
    text: string;
    html?: string | null;
    headers?: Record<string, string>;
    token: string;
    step: number;
    campaign: string;
    idempotencyKey?: string;
}

export interface MailResult { ok: boolean; status: number; id: string | null; body: string; permanent: boolean }

function parseFrom(from: string): { email: string; name?: string } {
    const m = from.match(/^(.*)<([^>]+)>\s*$/);
    if (!m) return { email: from.trim() };
    const name = m[1].trim().replace(/^"|"$/g, '');
    return name ? { email: m[2].trim(), name } : { email: m[2].trim() };
}

export function transportKeyPresent(t: Transport): boolean {
    return t === 'sendgrid' ? !!process.env.SENDGRID_API_KEY : !!process.env.RESEND_API_KEY;
}

export async function sendMail(m: MailInput): Promise<MailResult> {
    if (m.transport === 'sendgrid') return sendViaSendGrid(m);
    return sendViaResend(m);
}

async function sendViaResend(m: MailInput): Promise<MailResult> {
    const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY || ''}`,
            'Content-Type': 'application/json',
            ...(m.idempotencyKey ? { 'Idempotency-Key': m.idempotencyKey } : {}),
        },
        body: JSON.stringify({
            from: m.from, to: [m.to], reply_to: m.replyTo || undefined, subject: m.subject, text: m.text,
            ...(m.html ? { html: m.html } : {}),
            ...(m.headers && Object.keys(m.headers).length ? { headers: m.headers } : {}),
            tags: [{ name: 'campaign', value: m.campaign }, { name: 'step', value: String(m.step >= 100 ? 0 : m.step) }],
        }),
    });
    if (!resp.ok) {
        const body = (await resp.text()).slice(0, 300);
        return { ok: false, status: resp.status, id: null, body, permanent: resp.status === 422 || resp.status === 400 };
    }
    const data = (await resp.json().catch(() => ({}))) as { id?: string };
    return { ok: true, status: resp.status, id: data.id ?? null, body: '', permanent: false };
}

async function sendViaSendGrid(m: MailInput): Promise<MailResult> {
    const from = parseFrom(m.from);
    const payload = {
        personalizations: [{
            to: [{ email: m.to }],
            ...(m.headers && Object.keys(m.headers).length ? { headers: m.headers } : {}),
            custom_args: { token: m.token, step: String(m.step), campaign: m.campaign },
        }],
        from,
        ...(m.replyTo ? { reply_to: parseFrom(m.replyTo) } : {}),
        subject: m.subject,
        content: [
            { type: 'text/plain', value: m.text },
            ...(m.html ? [{ type: 'text/html', value: m.html }] : []),
        ],
        mail_settings: { footer: { enable: false } },
        tracking_settings: {
            click_tracking: { enable: false, enable_text: false },
            open_tracking: { enable: false },
            subscription_tracking: { enable: false },
        },
    };
    const resp = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.SENDGRID_API_KEY || ''}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!resp.ok) {
        const body = (await resp.text()).slice(0, 300);
        return { ok: false, status: resp.status, id: null, body, permanent: resp.status === 400 || resp.status === 413 };
    }
    return { ok: true, status: resp.status, id: resp.headers.get('x-message-id'), body: '', permanent: false };
}
