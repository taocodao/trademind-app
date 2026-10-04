import { query } from '@/lib/db';
import { ensureNewsletterTables } from './db';

/**
 * Sender display name per issue, driven by send history.
 *
 *  1. An issue that already has a recorded name keeps it (every batch and
 *     every late subscriber sees the same name for that issue).
 *  2. An issue sent before this feature existed counts as the default name.
 *  3. Otherwise the name is the next one in the rotation after the previous
 *     issue's name (default -> first rotation name -> ... -> wraps around).
 *  4. With no earlier issue at all, the default name is used.
 */
export const SENDER_ROTATION = [
    'AI Investor Copilot',
    'Systematic Investor Copilot',
    'Growth & Risk Copilot',
    'The Investment Flight Plan',
];

const cache = new Map<number, { name: string; at: number }>();
const CACHE_MS = 60_000;

function nextName(prev: string, defaultName: string): string {
    if (prev === defaultName) return SENDER_ROTATION[0];
    const i = SENDER_ROTATION.indexOf(prev);
    return i < 0 ? SENDER_ROTATION[0] : SENDER_ROTATION[(i + 1) % SENDER_ROTATION.length];
}

async function compute(issueNumber: number, defaultName: string): Promise<string> {
    const rec = await query(`SELECT issue_number, sender_name FROM newsletter_issue_sender`);
    const sent = await query(`SELECT DISTINCT issue_number FROM newsletter_send_log WHERE kind = 'issue' AND issue_number IS NOT NULL`);
    const known = new Map<number, string>();
    for (const r of sent.rows as { issue_number: number }[]) known.set(r.issue_number, defaultName); // legacy sends
    for (const r of rec.rows as { issue_number: number; sender_name: string }[]) known.set(r.issue_number, r.sender_name);
    let name = known.get(1) ?? defaultName;
    for (let k = 2; k <= issueNumber; k++) name = known.get(k) ?? nextName(name, defaultName);
    return name;
}

/** persist=true on real sends: records the choice so later batches match. */
export async function senderNameForIssue(issueNumber: number, defaultName: string, persist: boolean): Promise<string> {
    try {
        const hit = cache.get(issueNumber);
        if (hit && Date.now() - hit.at < CACHE_MS) return hit.name;
        await ensureNewsletterTables();
        let name = await compute(issueNumber, defaultName);
        if (persist) {
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
