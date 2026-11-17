/**
 * Outbound transport for the invitation campaign. Each sending domain is routed through one provider
 * ('resend' or 'sendgrid'); the choice is stored on outreach_domains.transport.
 *
 * SendGrid is used with click, open and subscription tracking off, no SendGrid footer, our own redirect
 * links and a one-click List-Unsubscribe header. token and step travel as custom_args so webhook events
 * can be matched to the send without relying on the provider message id.
 */
export type Transport = 'resend' | 'sendgrid' | 'workspace';

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
    if (t === 'workspace') return false;   // Workspace readiness is per sending domain, see workspaceReady
    return t === 'sendgrid' ? !!process.env.SENDGRID_API_KEY : !!process.env.RESEND_API_KEY;
}

/**
 * Google Workspace over SMTP (smtp.gmail.com:587, app password). One login per sending domain, set by hand in the host environment:
 *   WORKSPACE_SMTP_<DOMAIN>_USER and WORKSPACE_SMTP_<DOMAIN>_PASS, where <DOMAIN> is the domain upper cased with dots as underscores
 *   (for example WORKSPACE_SMTP_ECHOADS_TV_USER). A domain without its own login falls back to WORKSPACE_SMTP_DEFAULT_USER and
 *   WORKSPACE_SMTP_DEFAULT_PASS and sends as that domain's address, which works when the address is a Send mail as alias of that user.
 */
function wsCreds(domain: string): { user: string; pass: string } | null {
    const k = domain.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
    const user = process.env[`WORKSPACE_SMTP_${k}_USER`] || process.env.WORKSPACE_SMTP_DEFAULT_USER;
    const pass = process.env[`WORKSPACE_SMTP_${k}_PASS`] || process.env.WORKSPACE_SMTP_DEFAULT_PASS;
    return user && pass ? { user, pass } : null;
}
export function gmailApiReady(): boolean { return !!(process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET && process.env.GMAIL_REFRESH_TOKEN); }
export function workspaceReady(domain: string): boolean { return gmailApiReady() || !!wsCreds(domain); }

let gmTok: { v: string; exp: number } | null = null;
async function gmailAccessToken(): Promise<string> {
    if (gmTok && gmTok.exp > Date.now() + 60000) return gmTok.v;
    const r = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        body: new URLSearchParams({ client_id: process.env.GMAIL_CLIENT_ID || '', client_secret: process.env.GMAIL_CLIENT_SECRET || '', refresh_token: process.env.GMAIL_REFRESH_TOKEN || '', grant_type: 'refresh_token' }),
    });
    const j = (await r.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error?: string };
    if (!r.ok || !j.access_token) throw Object.assign(new Error('token ' + (j.error || r.status)), { responseCode: r.status });
    gmTok = { v: j.access_token, exp: Date.now() + (j.expires_in ?? 3000) * 1000 };
    return gmTok.v;
}

/** Gmail REST API (users.messages.send, OAuth refresh token, gmail.send scope). Used for Workspace sends unless the message asks for SMTP with header X-Via: smtp. */
async function sendViaGmailApi(m: MailInput, messageId: string | undefined, headers: Record<string, string>): Promise<MailResult> {
    try {
        const MailComposer = (await import('nodemailer/lib/mail-composer')).default;
        const buf = await new MailComposer({ from: m.from, to: m.to, replyTo: m.replyTo || undefined, subject: m.subject, ...(m.text ? { text: m.text } : {}), ...(m.html ? { html: m.html } : {}), messageId, headers, textEncoding: 'quoted-printable' }).compile().build();
        const raw = buf.toString('base64url');
        const tok = await gmailAccessToken();
        const r = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
            method: 'POST', headers: { authorization: `Bearer ${tok}`, 'content-type': 'application/json' }, body: JSON.stringify({ raw }),
        });
        const j = (await r.json().catch(() => ({}))) as { id?: string; error?: { message?: string } };
        if (!r.ok) return { ok: false, status: r.status, id: null, body: ('gmail api ' + (j.error?.message || '')).slice(0, 250), permanent: r.status === 400 };
        return { ok: true, status: r.status, id: messageId ?? j.id ?? null, body: '', permanent: false };
    } catch (e) {
        const err = e as { responseCode?: number; message?: string };
        return { ok: false, status: err.responseCode ?? 0, id: null, body: String(err.message || '').slice(0, 250), permanent: false };
    }
}

async function sendViaWorkspace(m: MailInput): Promise<MailResult> {
    const from = parseFrom(m.from);
    const domain = from.email.split('@')[1]?.toLowerCase() || '';
    const creds = wsCreds(domain);
    const forceSmtp = (m.headers ?? {})['X-Via'] === 'smtp';
    const useApi = gmailApiReady() && !forceSmtp;
    if (!creds && !useApi) return { ok: false, status: 0, id: null, body: 'no Workspace login for ' + domain, permanent: false };
    if (useApi) {
        const h = { ...(m.headers ?? {}) };
        const noId2 = h['X-Std-Id'] === '1';
        delete h['X-Std-Id']; delete h['X-Via'];
        const mid = noId2 ? undefined : (h['Message-ID'] || `<cx.${m.token}.${m.step}@${domain}>`);
        delete h['Message-ID'];
        return sendViaGmailApi(m, mid, h);
    }
    if (!creds) return { ok: false, status: 0, id: null, body: 'no Workspace login for ' + domain, permanent: false };
    const nodemailer = (await import('nodemailer')).default;
    const tr = nodemailer.createTransport({ host: 'smtp.gmail.com', port: 587, secure: false, requireTLS: true, auth: creds, connectionTimeout: 15000, socketTimeout: 30000 });
    const headers = { ...(m.headers ?? {}) };
    const noId = headers['X-Std-Id'] === '1';   // test option: let Google generate the Message-ID
    delete headers['X-Std-Id']; delete headers['X-Via'];
    const messageId = noId ? undefined : (headers['Message-ID'] || `<cx.${m.token}.${m.step}@${domain}>`);
    delete headers['Message-ID'];
    try {
        await tr.sendMail({ from: m.from, to: m.to, replyTo: m.replyTo || undefined, subject: m.subject, ...(m.text ? { text: m.text } : {}), ...(m.html ? { html: m.html } : {}), messageId, headers });
        return { ok: true, status: 250, id: messageId ?? null, body: '', permanent: false };
    } catch (e) {
        const err = e as { responseCode?: number; message?: string };
        const code = err.responseCode ?? 0;
        const diag = ` [login user=${creds.user} passlen=${creds.pass.length} spaces=${/\s/.test(creds.pass)} quoted=${/^["']|["']$/.test(creds.pass)}]`;
        return { ok: false, status: code, id: null, body: (String(err.message || '').slice(0, 200) + diag), permanent: code === 550 || code === 553 || code === 551 };
    } finally { tr.close(); }
}

export async function sendMail(m: MailInput): Promise<MailResult> {
    if (m.transport === 'sendgrid') return sendViaSendGrid(m);
    if (m.transport === 'workspace') return sendViaWorkspace(m);
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
