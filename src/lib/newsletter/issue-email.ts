/**
 * Issue email generator (Phase 2 buttons matrix + Phase 3 template).
 *
 * The website issue page stays the canonical full article. The email is a
 * shorter summary with per-subscriber blocks: the offer block is filled
 * according to the reader's discount state so we never promote an offer the
 * reader cannot use, and forwarded readers get a fresh subscribe link
 * carrying the original subscriber's referral id, never their identity.
 */
import { query } from '@/lib/db';
import { ISSUES, issueUrl, formatDate, type NewsletterIssue } from './issues';
import { makeUnsubscribeToken, recordNewsletterEvent } from './db';
import { maskEmail } from './normalize';

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const NEWSLETTER_FROM = 'The AI Systematic Investor <newsletter@trademind.bot>';
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://trademind.bot';

const RISK_DISCLOSURE =
    'TradeMind is software for self-directed investors, not investment advice. Options involve risk and are not suitable for every investor. Backtested results are hypothetical and depend on assumptions, costs, liquidity, and execution.';

function esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Tiny markdown subset to email-safe HTML: paragraphs, ## headings, - lists, bold, links. */
function mdToHtml(md: string): string {
    const blocks = md.trim().split(/\n\n+/);
    const out: string[] = [];
    for (const block of blocks) {
        const b = block.trim();
        if (!b) continue;
        if (b.startsWith('## ')) {
            out.push(`<h2 style="font-size:18px;margin:24px 0 8px">${inline(b.slice(3))}</h2>`);
        } else if (b.split('\n').every((l) => l.trim().startsWith('- '))) {
            const items = b.split('\n').map((l) => `<li style="margin:5px 0">${inline(l.trim().slice(2))}</li>`).join('');
            out.push(`<ul style="padding-left:20px;color:#374151">${items}</ul>`);
        } else {
            out.push(`<p style="margin:0 0 14px;line-height:1.65;color:#374151">${inline(b.replace(/\n/g, ' '))}</p>`);
        }
    }
    return out.join('\n');
}

function inline(s: string): string {
    return esc(s)
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, t, u) => {
            const href = String(u).startsWith('http') ? String(u) : `${BASE_URL}${u}`;
            return `<a href="${esc(href)}" style="color:#8B5CF6">${t}</a>`;
        });
}

interface SubscriberForEmail {
    id: number;
    email: string;
    referral_id: string | null;
    discount_state: string | null;
    window_end: string | null;
}

function fmtDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

/** The offer block, personalized to the reader's discount state. */
function offerBlock(sub: SubscriberForEmail, daysLeft: number | null): string {
    const wrap = (inner: string) =>
        `<div style="background:#f4f2ff;border:1px solid #ddd6fe;border-radius:12px;padding:18px 20px;margin:28px 0">${inner}</div>`;
    const btn = (label: string, url: string) =>
        `<p style="margin:14px 0 0"><a href="${url}" style="display:inline-block;background:#8B5CF6;color:#ffffff;text-decoration:none;padding:11px 20px;border-radius:8px;font-weight:bold">${label}</a></p>`;

    if (sub.discount_state === 'eligible' && sub.window_end && daysLeft !== null) {
        const until = fmtDate(sub.window_end);
        const line = daysLeft > 14
            ? `Your 30% annual offer is active until ${until}.`
            : `Your 30% offer ends on ${until}.`;
        return wrap(`<p style="margin:0;font-size:15px;color:#111827"><strong>${line}</strong></p>
            <p style="margin:8px 0 0;font-size:13.5px;color:#4b5563">Applied automatically at annual checkout with this email address. <a href="${BASE_URL}/newsletter/offer" style="color:#8B5CF6">Offer terms</a></p>
            ${btn('Claim 30% off annual plan', `${BASE_URL}/upgrade`)}`);
    }
    if (sub.discount_state === 'redeemed') {
        return wrap(`<p style="margin:0;font-size:15px;color:#111827"><strong>Your subscription is active.</strong></p>
            <p style="margin:8px 0 0;font-size:13.5px;color:#4b5563">Every signal, the full trade ledger, and the verification record are in your account.</p>
            ${btn('Open my TradeMind account', `${BASE_URL}/accounts`)}`);
    }
    return wrap(`<p style="margin:0;font-size:15px;color:#111827"><strong>TradeMind plans</strong></p>
        <p style="margin:8px 0 0;font-size:13.5px;color:#4b5563">QQQ Basic and QQQ LEAPS, annual billing, every signal verified in the public ledger.</p>
        ${btn('Explore TradeMind plans', `${BASE_URL}/upgrade`)}`);
}

export interface IssueEmail {
    subject: string;
    html: string;
    text: string;
    unsubscribeUrl: string;
    listUnsubscribe: string;
}

export async function renderIssueEmail(
    issue: NewsletterIssue,
    sub: SubscriberForEmail
): Promise<IssueEmail> {
    const canonical = `${BASE_URL}${issueUrl(issue)}`;
    const unsubscribeUrl = `${BASE_URL}/newsletter/unsubscribe?token=${await makeUnsubscribeToken(sub.id)}`;

    const daysLeft = sub.window_end
        ? Math.ceil((new Date(sub.window_end).getTime() - Date.now()) / 864e5)
        : null;

    // Email body: intro + the first three content sections, then read-on-web CTA.
    const sections = issue.body.trim().split(/(?=^## )/m).filter((s) => s.trim());
    const intro = sections[0] ?? '';
    const firstThree = sections.slice(1, 4);
    const bodyHtml = [intro, ...firstThree].map((s) => mdToHtml(s)).join('\n');

    const deep = issue.deepLinks
        .map((d) => `<a href="${BASE_URL}${d.href}" style="color:#8B5CF6">${esc(d.label)}</a>`)
        .join(' &middot; ');

    const refParam = sub.referral_id ? `?ref=${encodeURIComponent(sub.referral_id)}` : '';
    const subscribeForForward = `${BASE_URL}/newsletter${refParam}`;
    const shareUrl = `${canonical}?ref=${encodeURIComponent(sub.referral_id ?? '')}&utm_source=email&utm_medium=share&utm_campaign=${issue.slug}`;

    const html = `<div style="font-family:Arial,sans-serif;color:#111827;max-width:580px;margin:0 auto">
        <p style="font-size:12.5px;color:#9ca3af;margin:0 0 16px">
            Trouble reading? <a href="${canonical}" style="color:#8B5CF6">View in browser</a>
        </p>
        <p style="font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#8B5CF6;font-weight:bold;margin:0 0 6px">The AI Systematic Investor &middot; Issue ${issue.number}</p>
        <h1 style="font-size:24px;line-height:1.25;margin:0 0 10px">${esc(issue.title)}</h1>
        <p style="color:#6b7280;font-size:13px;margin:0 0 20px">${formatDate(issue.publishDate)} &middot; ${esc(issue.readTime)}</p>
        ${bodyHtml}
        <p style="margin:20px 0"><a href="${canonical}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:11px 20px;border-radius:8px;font-weight:bold">Read the full issue</a></p>
        <p style="font-size:13.5px;color:#6b7280">Go deeper: ${deep}</p>
        ${offerBlock(sub, daysLeft)}
        <p style="font-size:13.5px;color:#6b7280">
            Was this forwarded to you? <a href="${subscribeForForward}" style="color:#8B5CF6">Subscribe with your own email</a><br/>
            Enjoying it? <a href="${shareUrl}" style="color:#8B5CF6">Share this issue</a>
        </p>
        <p style="font-size:12.5px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:14px;margin-top:28px">
            ${esc(RISK_DISCLAIMER)}
        </p>
        <p style="font-size:12px;color:#9ca3af">
            Sent to ${esc(maskEmail(sub.email))} &middot;
            <a href="${BASE_URL}/newsletter/offer" style="color:#9ca3af">Offer terms</a> &middot;
            <a href="${BASE_URL}/newsletter/disclosures" style="color:#9ca3af">Disclosures</a> &middot;
            <a href="${unsubscribeUrl}" style="color:#9ca3af">Unsubscribe</a>
        </p>
    </div>`;

    const text = [
        `The AI Systematic Investor - Issue ${issue.number}: ${issue.title}`,
        `${formatDate(issue.publishDate)} - ${issue.readTime}`,
        '',
        issue.excerpt,
        '',
        `Read the full issue: ${canonical}`,
        '',
        sub.discount_state === 'eligible' && sub.window_end
            ? `Your 30% annual offer is active until ${fmtDate(sub.window_end)}: ${BASE_URL}/upgrade`
            : `TradeMind plans: ${BASE_URL}/upgrade`,
        '',
        RISK_DISCLAIMER,
        `Unsubscribe: ${unsubscribeUrl}`,
    ].join('\n');

    return {
        subject: `Issue ${issue.number}: ${issue.title}`,
        html,
        text,
        unsubscribeUrl,
        listUnsubscribe: unsubscribeUrl,
    };
}

const RISK_DISCLAIMER = RISK_DISCLOSURE;

/** Send one issue to one subscriber, with one-click unsubscribe headers. */
export async function sendIssueEmail(
    issue: NewsletterIssue,
    sub: SubscriberForEmail
): Promise<boolean> {
    if (!RESEND_API_KEY) return false;
    const rendered = await renderIssueEmail(issue, sub);
    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: NEWSLETTER_FROM,
                to: sub.email,
                subject: rendered.subject,
                html: rendered.html,
                text: rendered.text,
                headers: {
                    'List-Unsubscribe': `<${rendered.listUnsubscribe}>`,
                    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
                },
            }),
        });
        if (response.ok) {
            await recordNewsletterEvent('issue_sent', { issue: issue.number, slug: issue.slug }, sub.id);
            return true;
        }
        console.error('[issue email] Resend failed:', response.status, await response.text());
        return false;
    } catch (err) {
        console.error('[issue email]', err);
        return false;
    }
}

/** Eligible recipients: confirmed or mid-email-change, not suppressed. */
export async function issueRecipients(): Promise<SubscriberForEmail[]> {
    const res = await query(
        `SELECT s.id, s.email, s.referral_id, d.state AS discount_state, d.window_end
         FROM newsletter_subscribers s
         LEFT JOIN newsletter_discounts d ON d.subscriber_id = s.id
         WHERE s.status IN ('confirmed', 'email_change_pending')
           AND NOT EXISTS (SELECT 1 FROM newsletter_suppression sup WHERE sup.email = s.email)`
    );
    return res.rows;
}

export function getIssueByNumber(n: number): NewsletterIssue | undefined {
    return ISSUES.find((i) => i.number === n);
}
