/**
 * Link-only subscriber email. One sentence, one button that opens the newsletter on the website,
 * and the standard footer. Every subscriber email (welcome, weekly, daily, library issues) uses this,
 * so the reading happens on the site and the email itself stays short.
 * Pure rendering: no database or network access here.
 */
import { C, F, btn, esc, pill } from '@/lib/outreach/copy-seq7';

export interface LinkEmailInput {
    subject: string;
    /** Hidden preview text shown next to the subject in the inbox. */
    preheader: string;
    heading: string;
    /** One short sentence under the heading. */
    line: string;
    buttonLabel: string;
    url: string;
    firstName?: string | null;
    unsubscribeUrl: string;
    preferencesUrl?: string | null;
    address: string;
}

const DISCLAIMER = 'Educational research, not personalized investment advice. Investing involves risk, including loss.';

export function renderLinkEmail(i: LinkEmailInput): { subject: string; html: string; text: string } {
    const hi = i.firstName ? `Hi ${i.firstName},` : 'Hi,';
    const prefs = i.preferencesUrl
        ? `&nbsp;&middot;&nbsp;<a href="${esc(i.preferencesUrl)}" style="color:${C.muted};text-decoration:underline;">Preferences</a>`
        : '';
    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"><title>${esc(i.subject)}</title></head><body style="margin:0;padding:0;background:${C.bg};"><div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.bg};">${esc(i.preheader)}</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};"><tr><td align="center" style="padding:24px 12px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;"><tr><td style="${F}"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="${F}font-size:18px;font-weight:800;color:${C.fg};">TradeMind<span style="color:${C.blue};">.bot</span></td><td align="right">${pill('Free research', C.blue, C.card)}</td></tr></table></td></tr><tr><td style="height:22px;line-height:22px;font-size:0;">&nbsp;</td></tr><tr><td style="${F}"><p style="margin:0 0 10px;${F}font-size:16px;color:${C.body};">${esc(hi)}</p><div style="${F}font-size:24px;font-weight:800;line-height:1.3;color:${C.fg};padding-bottom:10px;">${esc(i.heading)}</div><p style="margin:0 0 22px;${F}font-size:15px;line-height:1.65;color:${C.body};">${esc(i.line)}</p>${btn(i.url, i.buttonLabel)}</td></tr><tr><td style="height:30px;line-height:30px;font-size:0;">&nbsp;</td></tr><tr><td style="${F}border-top:1px solid ${C.line};padding-top:14px;font-size:11px;line-height:1.6;color:${C.muted};">You are getting this because you subscribed to the free TradeMind brief. <a href="${esc(i.unsubscribeUrl)}" style="color:${C.muted};text-decoration:underline;">Unsubscribe</a>${prefs}<br>${esc(i.address)}<br>${esc(DISCLAIMER)}</td></tr></table></td></tr></table></body></html>`;
    const text = [
        hi, '', i.heading, i.line, '', `${i.buttonLabel}: ${i.url}`, '',
        `Unsubscribe: ${i.unsubscribeUrl}`,
        ...(i.preferencesUrl ? [`Preferences: ${i.preferencesUrl}`] : []),
        i.address, DISCLAIMER,
    ].join('\n');
    return { subject: i.subject, html, text };
}
