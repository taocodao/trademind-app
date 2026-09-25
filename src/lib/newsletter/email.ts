/**
 * Newsletter transactional and lifecycle emails (Resend).
 * Transactional sender is separate from the newsletter sender per
 * deliverability rules; newsletter sends arrive in a later phase.
 */
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const TRANSACTIONAL_FROM = 'TradeMind <signals@trademind.bot>';
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://trademind.bot';

const RISK_DISCLOSURE =
    'TradeMind is software for self-directed investors, not investment advice. Options involve risk. Any performance figures are hypothetical or simulated and do not guarantee future results.';
const COMPANY_FOOTER = 'TradeMind, Queens, New York. You are receiving this because of an action taken at trademind.bot.';

function esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

interface MailPayload {
    to: string;
    subject: string;
    heading: string;
    intro: string;
    bullets?: string[];
    cta?: { label: string; url: string };
    secondaryLink?: { label: string; url: string };
    note?: string;
}

function render(p: MailPayload): { text: string; html: string } {
    const btn =
        'display:inline-block;background:#8B5CF6;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:bold';
    const lines = [p.intro];
    for (const b of p.bullets ?? []) lines.push(`- ${b}`);
    if (p.cta) lines.push('', `${p.cta.label}: ${p.cta.url}`);
    if (p.secondaryLink) lines.push('', `${p.secondaryLink.label}: ${p.secondaryLink.url}`);
    if (p.note) lines.push('', p.note);
    lines.push('', RISK_DISCLOSURE, '', COMPANY_FOOTER);

    const bulletHtml = (p.bullets ?? [])
        .map((b) => `<li style="margin:6px 0">${esc(b)}</li>`)
        .join('');
    const html = `<div style="font-family:Arial,sans-serif;color:#111827;max-width:560px;margin:0 auto">
        <h2 style="margin:0 0 12px">${esc(p.heading)}</h2>
        <p>${esc(p.intro)}</p>
        ${bulletHtml ? `<ul style="padding-left:20px;color:#374151">${bulletHtml}</ul>` : ''}
        ${p.cta ? `<p style="margin:24px 0"><a href="${esc(p.cta.url)}" style="${btn}">${esc(p.cta.label)}</a></p>` : ''}
        ${p.secondaryLink ? `<p style="font-size:14px"><a href="${esc(p.secondaryLink.url)}" style="color:#8B5CF6">${esc(p.secondaryLink.label)}</a></p>` : ''}
        ${p.note ? `<p style="color:#6b7280;font-size:14px">${esc(p.note)}</p>` : ''}
        <p style="color:#9ca3af;font-size:12px;margin-top:28px">${esc(RISK_DISCLOSURE)}</p>
        <p style="color:#9ca3af;font-size:12px">${esc(COMPANY_FOOTER)}</p>
    </div>`;
    return { text: lines.join('\n'), html };
}

async function send(p: MailPayload): Promise<boolean> {
    if (!RESEND_API_KEY) {
        console.warn('[Newsletter email] RESEND_API_KEY not configured');
        return false;
    }
    const { text, html } = render(p);
    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ from: TRANSACTIONAL_FROM, to: p.to, subject: p.subject, text, html }),
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

export function sendConfirmationEmail(input: {
    to: string; confirmToken: string; changeToken: string;
}): Promise<boolean> {
    return send({
        to: input.to,
        subject: 'Confirm your subscription to The AI Systematic Investor',
        heading: 'One click and you are in',
        intro: 'Welcome. You signed up for The AI Systematic Investor, the weekly TradeMind research letter.',
        bullets: [
            'One weekly research issue on systematic investing, machine learning, options structure, and risk control',
            'Confirming unlocks 30% off the first year of an annual TradeMind plan for 90 days',
        ],
        cta: { label: 'Confirm this email', url: `${BASE_URL}/newsletter/confirm?token=${input.confirmToken}` },
        secondaryLink: { label: 'Use a different email address', url: `${BASE_URL}/newsletter/change-email?token=${input.changeToken}` },
        note: 'If you did not sign up, ignore this email and you will not hear from us. Offer terms: trademind.bot/newsletter/offer',
    });
}

export function sendConfirmationReminderEmail(input: {
    to: string; confirmToken: string; which: 1 | 2;
}): Promise<boolean> {
    return send({
        to: input.to,
        subject: input.which === 1
            ? 'Still want The AI Systematic Investor? Confirm inside'
            : 'Last reminder: confirm your subscription',
        heading: input.which === 1 ? 'Your confirmation link is waiting' : 'Final reminder',
        intro: input.which === 1
            ? 'You started signing up for The AI Systematic Investor. Confirming takes one click and unlocks your 30% annual offer.'
            : 'This is the last reminder. If you do not confirm, your pending signup will simply expire and you will not hear from us again.',
        cta: { label: 'Confirm this email', url: `${BASE_URL}/newsletter/confirm?token=${input.confirmToken}` },
    });
}

export function sendPendingExpiryWarningEmail(input: { to: string; confirmToken: string }): Promise<boolean> {
    return send({
        to: input.to,
        subject: 'Your newsletter signup expires in 7 days',
        heading: 'Still interested?',
        intro: 'Your pending signup for The AI Systematic Investor expires in 7 days. Confirm now to keep your 90-day 30% annual offer, or do nothing and the signup will be removed.',
        cta: { label: 'Confirm this email', url: `${BASE_URL}/newsletter/confirm?token=${input.confirmToken}` },
    });
}

export function sendWelcomeEmail(input: {
    to: string; code: string; offerExpires: string;
}): Promise<boolean> {
    const until = new Date(input.offerExpires).toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric',
    });
    return send({
        to: input.to,
        subject: 'Welcome. Your 30% offer is active until ' + until,
        heading: 'You are confirmed',
        intro: `Your subscription is confirmed and your 30% annual offer is active until ${until}. The discount applies automatically at annual checkout when you use this email address.`,
        bullets: [
            `Your personal code: ${input.code} (only works with this email address)`,
            'Start reading: Issue 1, Why most retail investors need a process before another prediction',
        ],
        cta: { label: 'View your offer', url: `${BASE_URL}/upgrade` },
        secondaryLink: { label: 'Start with Issue 1', url: `${BASE_URL}/newsletter/issues/2026-08-06-why-most-investors-need-a-process` },
        note: 'Offer terms: trademind.bot/newsletter/offer. Renews at the standard annual price after the first year.',
    });
}

export function sendOldAddressChangeNotice(input: {
    to: string; newEmailMasked: string; cancelToken: string;
}): Promise<boolean> {
    return send({
        to: input.to,
        subject: 'Email change requested for your TradeMind newsletter',
        heading: 'A change was requested',
        intro: `Someone asked to move your newsletter subscription from this address to ${input.newEmailMasked}. Issues will keep coming here until the new address confirms.`,
        cta: { label: 'This was not me', url: `${BASE_URL}/newsletter/change-email/cancel?token=${input.cancelToken}` },
        note: 'If you made this request, you can ignore this email.',
    });
}

export function sendChangeConfirmEmail(input: {
    to: string; confirmToken: string;
}): Promise<boolean> {
    return send({
        to: input.to,
        subject: 'Confirm your new newsletter email address',
        heading: 'Confirm this new address',
        intro: 'Confirm to move your TradeMind newsletter subscription to this address. Your original signup date and 90-day offer window stay exactly as they were.',
        cta: { label: 'Confirm new email', url: `${BASE_URL}/newsletter/change-email/complete?token=${input.confirmToken}` },
        note: 'If you did not request this, ignore this email.',
    });
}

export function sendOfferEmail(input: {
    to: string;
    kind: 'checkin' | 'reminder' | 'final-week' | 'last-day' | 'expired';
    offerExpires?: string;
    unsubscribeUrl?: string;
}): Promise<boolean> {
    const until = input.offerExpires
        ? new Date(input.offerExpires).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        : '';
    const map = {
        checkin: {
            subject: 'A month in: what the research says, plus your offer status',
            heading: 'Your 30% offer is still active',
            intro: `One month into your subscription to The AI Systematic Investor. Your 30% annual offer runs until ${until}, in case TradeMind earns a place in your process.`,
        },
        reminder: {
            subject: `Your 30% offer ends ${until}`,
            heading: 'A plain reminder',
            intro: `Your 30% annual offer ends on ${until}. After that, TradeMind is available at the standard annual price, which is still the plan we recommend if the research is useful.`,
        },
        'final-week': {
            subject: 'Your 30% offer ends in 7 days',
            heading: 'One week left',
            intro: `Your 30% annual offer ends on ${until}. No extension emails after this one, just one final note on the last day.`,
        },
        'last-day': {
            subject: 'Your 30% offer ends tomorrow',
            heading: 'Last day',
            intro: `Your 30% annual offer ends tomorrow (${until}). If TradeMind belongs in your process, today is the day.`,
        },
        expired: {
            subject: 'Your 30% offer has ended',
            heading: 'The window has closed',
            intro: 'Your 30% annual offer has expired, as scheduled. TradeMind is still available at the standard annual price, and the newsletter keeps coming either way.',
        },
    }[input.kind];
    return send({
        to: input.to,
        subject: map.subject,
        heading: map.heading,
        intro: map.intro,
        cta: input.kind === 'expired'
            ? { label: 'Explore TradeMind plans', url: `${BASE_URL}/upgrade` }
            : { label: 'Claim 30% off', url: `${BASE_URL}/upgrade` },
        secondaryLink: input.unsubscribeUrl
            ? { label: 'Unsubscribe', url: input.unsubscribeUrl }
            : undefined,
        note: 'Offer terms: trademind.bot/newsletter/offer',
    });
}

export function sendRedemptionReceiptEmail(input: {
    to: string; planLabel: string; renewalDate?: string;
}): Promise<boolean> {
    return send({
        to: input.to,
        subject: 'Your 30% newsletter discount was applied',
        heading: 'Discount applied',
        intro: `Your newsletter subscriber discount was applied to your ${input.planLabel} annual plan.${input.renewalDate ? ` Your subscription renews at the standard annual price on ${input.renewalDate}.` : ' It renews at the standard annual price.'}`,
        note: 'Receipts and invoices are available in your TradeMind account settings.',
    });
}
