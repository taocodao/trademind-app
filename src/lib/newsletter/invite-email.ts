/**
 * Invitation and plain-text variants for the placement test framework.
 *
 * Instead of sending the newsletter itself, the invitation variants introduce the
 * newsletter and link to a first-party signup page that requires confirmation.
 * They differ only in the factors being tested. Copy follows the optimized
 * acquisition plan: fixed sender identity, one primary subscribe button, a real
 * signature, and (except in the diagnostic variant) a visible opt-out.
 */
import type { NewsletterIssue } from './issues';
import { MAILING_ADDRESS } from './email';

export type InviteVariant =
    | 'fulltext_plain'          // the whole issue as plain text, unsubscribe link in body
    | 'invite_hello'            // generic subject, "Hello,", button, opt-out
    | 'invite_hi_name'          // generic subject, "Hi {name},", button, opt-out
    | 'invite_hello_nounsub'    // diagnostic: as invite_hello without the visible opt-out
    | 'invite_name_subject'     // diagnostic: first name in the subject and greeting
    | 'invite_short_question';  // plain text, reason for contact, one question, under 75 words

export const INVITE_VARIANTS: InviteVariant[] = [
    'fulltext_plain', 'invite_hello', 'invite_hi_name', 'invite_hello_nounsub', 'invite_name_subject', 'invite_short_question',
];

export function isInviteVariant(v: string | undefined | null): v is InviteVariant {
    return !!v && (INVITE_VARIANTS as string[]).includes(v);
}

function esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export interface InviteRendered {
    subject: string;
    html: string;
    text: string;
}

const DISCLAIMER = 'TradeMind is software for self-directed investors, not investment advice. Options involve risk and are not suitable for every investor.';

/** Markdown subset to readable plain text. */
function mdToText(md: string): string {
    return md
        .replace(/^## (.*)$/gm, (_m, h: string) => `${h.toUpperCase()}`)
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

export function renderInvite(
    issue: NewsletterIssue,
    variant: InviteVariant,
    opts: { firstName: string; baseUrl: string; unsubscribeUrl: string }
): InviteRendered {
    const name = opts.firstName;
    const signupUrl = `${opts.baseUrl}/newsletter`;

    if (variant === 'fulltext_plain') {
        const text = [
            issue.title, '',
            mdToText(issue.body), '',
            `Read this issue online: ${opts.baseUrl}/newsletter/${issue.slug}`, '',
            'Eric Huang',
            'Founder, TradeMind', '',
            DISCLAIMER,
            `TradeMind, ${MAILING_ADDRESS}`,
            `Unsubscribe: ${opts.unsubscribeUrl}`,
        ].join('\n');
        return { subject: issue.emailSubject, html: '', text };
    }

    if (variant === 'invite_short_question') {
        const text = [
            'Hello,', '',
            'I am writing because your address appears in a database of investor contacts. TradeMind publishes a free educational newsletter on portfolio risk, options, and model-based research. Would you like me to send the first issue? Reply yes, or review it first:',
            `${signupUrl}`, '',
            'Eric Huang',
            'Founder, TradeMind', '',
            `One-time note. If you do not want any more email from TradeMind, unsubscribe here: ${opts.unsubscribeUrl}`,
            `TradeMind, ${MAILING_ADDRESS}`,
        ].join('\n');
        return { subject: 'A risk-first investing newsletter', html: '', text };
    }

    const topic = 'a risk-first investing newsletter';
    const subject = variant === 'invite_name_subject'
        ? `${name}, ${topic}`
        : 'A risk-first investing newsletter';
    const greeting = variant === 'invite_hi_name' || variant === 'invite_name_subject' ? `Hi ${name},` : 'Hello,';
    const showUnsub = variant !== 'invite_hello_nounsub';

    const p1 = 'TradeMind publishes The AI Systematic Investor, a free educational newsletter for self-directed investors who want a more structured approach to market regime, portfolio risk, options, and model-based research.';
    const p2 = 'If that sounds useful, you can review the newsletter and choose whether to subscribe. You will receive a confirmation email, and no newsletter issues will be sent unless you confirm.';
    const once = 'This is a one-time invitation.';
    const optout = 'If you do not want any further email from TradeMind, unsubscribe here.';

    const text = [
        greeting, '',
        p1, '',
        p2, '',
        `Review and subscribe: ${signupUrl}`, '',
        'Regards,',
        'Eric Huang',
        'Founder, TradeMind', '',
        showUnsub ? `${once} ${optout} ${opts.unsubscribeUrl}` : once,
        `TradeMind, ${MAILING_ADDRESS}`,
    ].join('\n');

    const html = `<div style="font-family:Arial,sans-serif;color:#111827;font-size:15px;line-height:1.55;max-width:560px">
        <p style="margin:0 0 14px">${esc(greeting)}</p>
        <p style="margin:0 0 14px">${esc(p1)}</p>
        <p style="margin:0 0 18px">${esc(p2)}</p>
        <p style="margin:0 0 22px"><a href="${signupUrl}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:11px 20px;border-radius:8px;font-weight:bold">Review and subscribe</a></p>
        <p style="margin:0">Regards,<br/>Eric Huang<br/>Founder, TradeMind</p>
        <p style="margin:24px 0 0;font-size:12px;color:#6b7280">${esc(once)}${showUnsub ? ` ${esc('If you do not want any further email from TradeMind,')} <a href="${opts.unsubscribeUrl}" style="color:#6b7280">unsubscribe here</a>.` : ''}<br/>TradeMind, ${esc(MAILING_ADDRESS)}</p>
    </div>`;

    return { subject, html, text };
}
