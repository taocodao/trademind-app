import { randomInt } from 'crypto';
import { query } from '@/lib/db';
import { ensureNewsletterTables } from './db';

/**
 * Sender display name per issue.
 *
 *  1. An issue with a recorded name keeps it, so every batch and every late
 *     subscriber of that issue sees the same name.
 *  2. An issue sent before this feature existed counts as the default name.
 *  3. Otherwise one of the four names is picked at random, never the same as
 *     the previous issue's name (the default name counts as a previous name).
 *  4. With no earlier issue, or on any lookup error, the default name is used.
 */
export const SENDER_ROTATION = [
    'AI Investor Copilot',
    'Systematic Investor Copilot',
    'Growth & Risk Copilot',
    'The Investment Flight Plan',
];

const cache = new Map<number, { name: string; at: number }>();
const CACHE_MS = 60_000;

async function loadKnown(defaultName: string): Promise<Map<number, string>> {
    const rec = await query(`SELECT issue_number, sender_name FROM newsletter_issue_sender`);
    const sent = await query(`SELECT DISTINCT issue_number FROM newsletter_send_log WHERE kind = 'issue' AND issue_number IS NOT NULL`);
    const known = new Map<number, string>();
    for (const r of sent.rows as { issue_number: number }[]) known.set(r.issue_number, defaultName); // sent before this feature
    for (const r of rec.rows as { issue_number: number; sender_name: string }[]) known.set(r.issue_number, r.sender_name);
    return known;
}

/** Name of the closest earlier issue that has one, or null if there is none. */
function previousName(known: Map<number, string>, issueNumber: number): string | null {
    let best = -1;
    for (const k of known.keys()) if (k < issueNumber && k > best) best = k;
    return best < 0 ? null : (known.get(best) as string);
}

function pickRandomExcluding(prev: string): string {
    const choices = SENDER_ROTATION.filter((n) => n !== prev);
    return choices[randomInt(choices.length)];
}

/** persist=true on real sends records the choice; persist=false (previews) does not. */
export async function senderNameForIssue(issueNumber: number, defaultName: string, persist: boolean): Promise<string> {
    // Gmail's sender guidelines ask for a display name that consistently identifies the sender,
    // so rotation is off unless SENDER_ROTATION=on is set in the environment.
    if (process.env.SENDER_ROTATION !== 'on') return defaultName;
    try {
        const hit = cache.get(issueNumber);
        if (hit && Date.now() - hit.at < CACHE_MS) return hit.name;
        await ensureNewsletterTables();
        const known = await loadKnown(defaultName);
        const existing = known.get(issueNumber);
        if (existing) {
            cache.set(issueNumber, { name: existing, at: Date.now() });
            return existing;
        }
        const prev = previousName(known, issueNumber);
        let name = prev === null ? defaultName : pickRandomExcluding(prev);
        if (persist) {
            // Concurrent first sends race here; the table keeps the first insert.
            await query(
                `INSERT INTO newsletter_issue_sender (issue_number, sender_name) VALUES ($1, $2)
                 ON CONFLICT (issue_number) DO NOTHING`, [issueNumber, name]);
            const back = await query(`SELECT sender_name FROM newsletter_issue_sender WHERE issue_number = $1`, [issueNumber]);
            name = (back.rows[0] as { sender_name: string } | undefined)?.sender_name ?? name;
            cache.set(issueNumber, { name, at: Date.now() });
        }
        return name;
    } catch (err) {
        console.error('[newsletter sender name]', err);
        return defaultName;
    }
}

/** Human description for the admin run preview, without picking anything. */
export async function describeSenderName(issueNumber: number, defaultName: string): Promise<string> {
    if (process.env.SENDER_ROTATION !== 'on') return `${defaultName} (fixed)`;
    try {
        const known = await loadKnown(defaultName);
        const existing = known.get(issueNumber);
        if (existing) return existing;
        const prev = previousName(known, issueNumber);
        return prev === null ? defaultName : `random of the four names, not "${prev}"`;
    } catch {
        return defaultName;
    }
}
