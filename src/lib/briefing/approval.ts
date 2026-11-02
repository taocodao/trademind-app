import { createHash } from 'node:crypto';
import pool from '@/lib/db';

/** JSON with sorted keys, so a value read back from a JSONB column hashes the same as the value that was approved. */
export function stable(v: unknown): string {
    if (Array.isArray(v)) return `[${v.map(stable).join(',')}]`;
    if (v && typeof v === 'object') return `{${Object.keys(v as object).sort().map((k) => `${JSON.stringify(k)}:${stable((v as any)[k])}`).join(',')}}`;
    return JSON.stringify(v);
}

/** Hash of the exact subject and text that a reviewer approved. Any later edit changes it. */
export function contentHash(subject: string, text: string): string {
    return createHash('sha256').update(`${subject}\n${text}`).digest('hex');
}

/**
 * The send route may only run for a day whose daily issue is approved, unchanged since approval,
 * and built from the same locked facts record that the send will use.
 */
export async function sendApproval(date: string, factsHash: string): Promise<{ ok: boolean; reason?: string }> {
    const r = await pool.query(`SELECT status, subject, text_body, facts_hash, approved_hash FROM briefing_issue WHERE run_date = $1::date AND kind = 'daily'`, [date]);
    const i = r.rows[0];
    if (!i) return { ok: false, reason: 'no daily issue for this date' };
    if (i.status !== 'approved' || !i.approved_hash) return { ok: false, reason: `daily issue is ${i.status}, not approved` };
    if (contentHash(i.subject, i.text_body) !== i.approved_hash) return { ok: false, reason: 'issue changed after approval' };
    if (i.facts_hash !== factsHash) return { ok: false, reason: 'facts record changed after approval' };
    return { ok: true };
}
