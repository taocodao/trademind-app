/**
 * Email normalization and abuse-prevention helpers.
 * canonical() is the duplicate-check key: plus tags stripped everywhere,
 * dots ignored for Gmail, so name+1@gmail.com and n.a.m.e@gmail.com collapse
 * onto the same subscriber identity.
 */
import { createHash, randomBytes } from 'crypto';

const GMAIL_DOMAINS = new Set(['gmail.com', 'googlemail.com']);

const DISPOSABLE_DOMAINS = new Set([
    'mailinator.com', 'tempmail.com', 'temp-mail.org', 'guerrillamail.com',
    'guerrillamail.net', '10minutemail.com', '10minutemail.net', 'throwawaymail.com',
    'yopmail.com', 'sharklasers.com', 'getnada.com', 'maildrop.cc',
    'dispostable.com', 'fakeinbox.com', 'trashmail.com', 'trashmail.net',
    'moakt.com', 'emailondeck.com', 'tempail.com', 'burnermail.io',
    'inboxkitten.com', 'mailsac.com', 'haribu.net', 'tempmailo.com',
    'mintemail.com', 'mytemp.email', 'tmpmail.org', 'spamgourmet.com',
]);

export interface NormalizedEmail {
    email: string;     // stored primary form (lowercased)
    canonical: string; // duplicate-check identity key
    valid: boolean;
    disposable: boolean;
}

export function normalizeEmail(raw: string): NormalizedEmail {
    const trimmed = raw.trim().replace(/\s+/g, '');
    const at = trimmed.lastIndexOf('@');
    if (at <= 0 || at === trimmed.length - 1) {
        return { email: trimmed.toLowerCase(), canonical: trimmed.toLowerCase(), valid: false, disposable: false };
    }
    const local = trimmed.slice(0, at);
    const domain = trimmed.slice(at + 1).toLowerCase();
    const email = `${local.toLowerCase()}@${domain}`;
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    let canonicalLocal = local.toLowerCase();
    const plus = canonicalLocal.indexOf('+');
    if (plus > 0) canonicalLocal = canonicalLocal.slice(0, plus);
    if (GMAIL_DOMAINS.has(domain)) canonicalLocal = canonicalLocal.replace(/\./g, '');

    return {
        email,
        canonical: `${canonicalLocal}@${domain}`,
        valid,
        disposable: DISPOSABLE_DOMAINS.has(domain),
    };
}

/** Mask an email for display, e.g. j***@gmail.com. */
export function maskEmail(email: string): string {
    const at = email.indexOf('@');
    if (at <= 0) return '***';
    return `${email.slice(0, 1)}***${email.slice(at)}`;
}

/** Random URL-safe token. The raw value goes in the email link; only the hash is stored. */
export function newToken(): { raw: string; hash: string } {
    const raw = randomBytes(24).toString('base64url');
    return { raw, hash: hashToken(raw) };
}

export function hashToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
}

/** Short personal discount code, e.g. TM30-8KQ2F9XD. */
export function newDiscountCode(): string {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const bytes = randomBytes(8);
    let out = '';
    for (const b of bytes) out += alphabet[b % alphabet.length];
    return `TM30-${out}`;
}
