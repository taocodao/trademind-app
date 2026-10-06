/**
 * Invitation email variants for the placement test framework.
 *
 * Instead of sending the newsletter itself, these short personal notes
 * introduce the newsletter and link to the signup page. The variants differ
 * only in the factors being tested: name in the subject, unsubscribe link in
 * the body, reply-based opt-in, plain text.
 */
import type { NewsletterIssue } from './issues';
import { MAILING_ADDRESS } from './email';

export type InviteVariant =
    | 'invite_named_unsub'      // name in subject and greeting, unsubscribe link in body
    | 'invite_named_nounsub'    // same, no unsubscribe link in body (header kept)
    | 'invite_generic_unsub'    // no name anywhere, unsubscribe link in body
    | 'invite_reply'            // named, asks the reader to reply yes instead of clicking
    | 'invite_plain';           // named, plain text only

export const INVITE_VARIANTS: InviteVariant[] = [
    'invite_named_unsub', 'invite_named_nounsub', 'invite_generic_unsub', 'invite_reply', 'invite_plain',
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

export function renderInvite(
    issue: NewsletterIssue,
    variant: InviteVariant,
    opts: { firstName: string; baseUrl: string; unsubscribeUrl: string }
): InviteRendered {
    const named = variant !== 'invite_generic_unsub';
    const unsub = variant === 'invite_named_unsub' || variant === 'invite_generic_unsub' || variant === 'invite_reply' || variant === 'invite_plain';
    const reply = variant === 'invite_reply';
    const plain = variant === 'invite_plain';
    const name = opts.firstName;
    const topic = issue.emailSubject.replace(/ before another prediction$/i, '');
    const subject = named ? `${name}, ${topic}` : topic;
    const signupUrl = `${opts.baseUrl}/newsletter`;
    const greeting = named ? `Hi ${name},` : 'Hi,';

    const p1 = 'I am Eric, the founder of TradeMindBot. I write a short newsletter for self-directed investors about building a repeatable process for evidence, structure, and risk.';
    const p2 = `The first issue is called "${issue.title}". ${issue.excerpt}`;
    const ask = reply
        ? 'If that sounds useful, just reply with the word yes and I will add you. If not, no action is needed.'
        : 'If that sounds useful, you can subscribe here and I will send you the next issue:';
    const disclaimer = 'TradeMind is software for self-directed investors, not investment advice.';

    const text = [
        greeting, '',
        p1, '',
        p2, '',
        ask,
        ...(reply ? [] : [signupUrl]),
        '',
        'Eric',
        'CEO, TrademindBot Corp',
        '',
        disclaimer,
        `TradeMind, ${MAILING_ADDRESS}`,
        ...(unsub ? [`Unsubscribe: ${opts.unsubscribeUrl}`] : []),
    ].join('\n');

    const html = `<div style="font-family:Arial,sans-serif;color:#111827;font-size:15px;line-height:1.55;max-width:560px">
        <p style="margin:0 0 14px">${esc(greeting)}</p>
        <p style="margin:0 0 14px">${esc(p1)}</p>
        <p style="margin:0 0 14px">${esc(p2)}</p>
        <p style="margin:0 0 14px">${esc(ask)}${reply ? '' : ` <a href="${signupUrl}" style="color:#6d28d9">${signupUrl.replace(/^https?:\/\//, '')}</a>`}</p>
        <p style="margin:18px 0 0">Eric<br/>CEO, TrademindBot Corp</p>
        <p style="margin:22px 0 0;font-size:12px;color:#6b7280">${esc(disclaimer)}<br/>TradeMind, ${esc(MAILING_ADDRESS)}${unsub ? ` &middot; <a href="${opts.unsubscribeUrl}" style="color:#6b7280">Unsubscribe</a>` : ''}</p>
    </div>`;

    return { subject, html: plain ? '' : html, text };
}
