/**
 * Subscriber email: plain text only. A short description of what is on the site and the link to it, then the
 * standard footer. No HTML and no images, because plain text with one link is what reaches the inbox.
 * Every subscriber email (welcome, weekly, daily, library issues) uses this. Pure rendering: no database or network access.
 */
export interface LinkEmailInput {
    subject: string;
    /** One or two short sentences about what the reader will find on the page. */
    description: string;
    url: string;
    firstName?: string | null;
    unsubscribeUrl: string;
    preferencesUrl?: string | null;
    address: string;
    /** Optional profile link shown under the signature (light HTML version only). */
    signatureLink?: { label: string; url: string } | null;
}

const DISCLAIMER = 'Educational research, not personalized investment advice. Investing involves risk, including loss.';

export function renderLinkEmail(i: LinkEmailInput): { subject: string; html: string; text: string } {
    const hi = i.firstName ? `Hi ${i.firstName},` : 'Hi,';
    const text = [
        hi, '',
        i.description, '',
        `Read it here: ${i.url}`, '',
        'Eric Huang',
        'Founder, TradeMind', '',
        'You are getting this because you subscribed to the free TradeMind brief.',
        `Unsubscribe: ${i.unsubscribeUrl}`,
        ...(i.preferencesUrl ? [`Preferences: ${i.preferencesUrl}`] : []),
        i.address,
        DISCLAIMER,
    ].join('\n');
    return { subject: i.subject, html: '', text };
}

// ---------- HTML version (sample, not wired into the senders) ----------

const H = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

export interface LinkEmailHtmlInput extends LinkEmailInput {
    /** Small line shown before the email opens in some clients. */
    preheader: string;
    /** Short bold heading above the description, for example the issue title. */
    heading?: string | null;
    buttonLabel?: string;
}

/**
 * Decorated HTML subscriber email: brand line, a greeting by first name, one short description and one button.
 * The link sits behind the button, so no raw address is shown. A plain text part with the link is always sent too.
 */
export function renderLinkEmailHtml(i: LinkEmailHtmlInput): { subject: string; html: string; text: string } {
    const plain = renderLinkEmail(i);
    const hi = i.firstName ? `Hi ${H(i.firstName)},` : 'Hi,';
    const label = i.buttonLabel ?? 'View the issue';
    const pre = `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#0b0f17;font-size:1px;line-height:1px;">${H(i.preheader)}</div>`;
    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark light"><meta name="supported-color-schemes" content="dark light"><title>${H(i.subject)}</title></head>
<body style="margin:0;padding:0;background:#0b0f17;">${pre}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#0b0f17" style="background:#0b0f17;"><tr><td align="center" style="padding:28px 14px 36px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
<tr><td align="center" style="padding:0 0 4px;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:bold;color:#a78bfa;letter-spacing:-0.2px;">AI Investor Copilot</td></tr>
<tr><td align="center" style="padding:0 0 22px;"><table role="presentation" cellpadding="0" cellspacing="0" width="180"><tr><td width="90" height="2" bgcolor="#a78bfa" style="height:2px;font-size:0;line-height:0;">&nbsp;</td><td width="90" height="2" bgcolor="#e0a458" style="height:2px;font-size:0;line-height:0;">&nbsp;</td></tr></table></td></tr>
<tr><td bgcolor="#121826" style="background:#121826;border:1px solid #232c3d;border-radius:14px;padding:26px 26px 24px;font-family:${FONT};">
<p style="margin:0 0 14px;font-family:${FONT};font-size:17px;line-height:1.5;color:#f3f5f9;font-weight:bold;">${hi}</p>
${i.heading ? `<p style="margin:0 0 10px;font-family:Georgia,'Times New Roman',serif;font-size:21px;line-height:1.3;color:#ffffff;">${H(i.heading)}</p>` : ''}
<p style="margin:0 0 22px;font-family:${FONT};font-size:15px;line-height:1.65;color:#d5dae3;">${H(i.description)}</p>
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td align="center" bgcolor="#2f6bff" style="border-radius:10px;background:#2f6bff;"><a href="${H(i.url)}" style="display:inline-block;padding:14px 30px;font-family:${FONT};font-size:16px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:10px;">${H(label)}</a></td></tr></table>
<p style="margin:22px 0 0;font-family:${FONT};font-size:14px;line-height:1.5;color:#f3f5f9;font-weight:bold;">Eric Huang</p>
<p style="margin:0;font-family:${FONT};font-size:13px;line-height:1.5;color:#9aa4b5;">Founder, TradeMind</p>
</td></tr>
<tr><td style="padding:18px 6px 0;font-family:${FONT};font-size:12px;line-height:1.6;color:#9aa4b5;text-align:center;">You are getting this because you subscribed to the free TradeMind brief.<br>
<a href="${H(i.unsubscribeUrl)}" style="color:#7aa2ff;text-decoration:underline;">Unsubscribe</a>${i.preferencesUrl ? ` &middot; <a href="${H(i.preferencesUrl)}" style="color:#7aa2ff;text-decoration:underline;">Preferences</a>` : ''}<br>
${H(i.address)}<br>${H(DISCLAIMER)}</td></tr>
</table></td></tr></table></body></html>`;
    return { subject: i.subject, html, text: plain.text };
}

// ---------- Light HTML version (live for the single subscriber link email) ----------

/**
 * Light HTML subscriber email: plain Arial paragraphs, the link written out, and a short footer
 * (reason, unsubscribe link, address). Tested at Microsoft 365 business and consumer mailboxes and Gmail:
 * dark designs, hidden preheaders and long footers pushed it to Junk, this shape did not.
 * Sender and every link in the email must share one domain. Pure rendering.
 */
export function renderLinkEmailLight(i: LinkEmailInput): { subject: string; html: string; text: string } {
    const hi = i.firstName ? `Hi ${H(i.firstName)},` : 'Hi,';
    const why = 'You are getting this because you subscribed to the free TradeMind brief.';
    const text = [
        i.firstName ? `Hi ${i.firstName},` : 'Hi,', '',
        i.description, '',
        `Read it here: ${i.url}`, '',
        'Eric Huang',
        'Founder, TradeMind',
        ...(i.signatureLink ? [`${i.signatureLink.label}: ${i.signatureLink.url}`] : []), '',
        `${why} Unsubscribe: ${i.unsubscribeUrl}`, '',
        i.address,
    ].join('\n');
    const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#222"><p>${hi}</p><p>${H(i.description)}</p><p>Read it here: <a href="${H(i.url)}">${H(i.url)}</a></p><p>Eric Huang<br>Founder, TradeMind${i.signatureLink ? `<br><a href="${H(i.signatureLink.url)}">${H(i.signatureLink.label)}</a>` : ''}</p><p style="font-size:12px;color:#777">${why} <a href="${H(i.unsubscribeUrl)}" style="color:#777">Unsubscribe</a><br><br>${H(i.address)}</p></div>`;
    return { subject: i.subject, html, text };
}
