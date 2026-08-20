/**
 * Compliance helpers
 * ==================
 * FTC Endorsement Guides (16 CFR Part 255): any share whose author receives
 * compensation (referral credits / free months) is a compensated endorsement
 * and must carry a clear, conspicuous, non-removable disclosure.
 *
 * Every share path that carries a referral code or link is compensated —
 * the disclosure is appended at the moment of copy/post (not in editable
 * state) so the user cannot strip it before publishing.
 */

export const COMPENSATED_DISCLOSURE = '#ad — I get free months if you sign up';

/**
 * Append the compensated-endorsement disclosure to share text.
 * Idempotent — safe to call on text that already discloses.
 */
export function withCompensationDisclosure(text: string): string {
    if (/#ad\b/i.test(text)) return text;
    return `${text.trimEnd()}\n\n${COMPENSATED_DISCLOSURE}`;
}
