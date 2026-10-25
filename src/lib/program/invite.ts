import pool from '@/lib/db';
import { makeUnsubscribeToken } from '@/lib/newsletter/db';
import { MAILING_ADDRESS } from '@/lib/newsletter/email';
import { getSettings, inSendWindow } from '@/lib/newsletter/send-engine';
import { ensureProgramTables } from './db';
import { INVITE_SUBJECT, inviteHtml, inviteText } from './invite-copy';

const BASE = process.env.NEXT_PUBLIC_APP_URL || 'https://trademind.bot';
const FROM = process.env.NEWSLETTER_FROM ?? 'The AI Systematic Investor by TradeMind <newsletter@news.trademind.bot>';
const REPLY_TO = process.env.NEWSLETTER_REPLY_TO ?? 'support@trademind.bot';

/** Addresses the owner has authorized for test sends. Nothing else is ever used for a test. */
export const TEST_ADDRESSES = [
    'web3aistore@gmail.com', 'web3aistore1@gmail.com', 'web3aistore2@gmail.com', 'web3aistore3@gmail.com', 'web3aistore4@gmail.com',
    'testtrademind@gmail.com', 'erichuang2005@gmail.com', 'eric@vochat.ai', 'eric@vochat.com', 'eric@arenza.tv', 'eric@trademind.bot', 'eric@taocodao.com',
];

export async function ensureInviteTable(): Promise<void> {
    await ensureProgramTables();
    await pool.query(`CREATE TABLE IF NOT EXISTS program_invite_log (
        subscriber_id INT PRIMARY KEY,
        email TEXT NOT NULL,
        wave INT NOT NULL DEFAULT 1,
        resend_id TEXT,
        sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
}

interface Sub { id: number; email: string; first_name: string | null }

function greeting(raw: string | null): string | null {
    const t = (raw ?? '').trim().split(/\s+/)[0] ?? '';
    return !t || t.length > 24 ? null : t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

/**
 * People who may receive the invite: confirmed, not suppressed, not already invited, not already applied or in the
 * program. Follows the same "include imported contacts" setting as the newsletter itself.
 */
export async function eligible(limit?: number): Promise<{ list: Sub[]; includeImported: boolean }> {
    await ensureInviteTable();
    const s = await getSettings();
    const cap = limit && limit > 0 ? `LIMIT ${Math.floor(limit)}` : '';
    const { rows } = await pool.query(
        `SELECT s.id, s.email, l."First Name" AS first_name
         FROM newsletter_subscribers s
         LEFT JOIN leads l ON LOWER(l."Email") = LOWER(s.email)
         WHERE s.status = 'confirmed'
           ${s.include_imported ? '' : `AND COALESCE(s.source, '') NOT IN ('lead-import', 'seed-test', 'qa')`}
           AND NOT EXISTS (SELECT 1 FROM newsletter_suppression sup WHERE sup.email = s.email)
           AND NOT EXISTS (SELECT 1 FROM program_invite_log i WHERE i.subscriber_id = s.id)
           AND NOT EXISTS (SELECT 1 FROM program_application a WHERE a.email_norm = LOWER(s.email))
           AND NOT EXISTS (SELECT 1 FROM program_participant p WHERE p.email_norm = LOWER(s.email))
         ORDER BY s.first_confirmed_at DESC NULLS LAST ${cap}`
    ).catch(async () => ({ rows: [] as Sub[] }));
    return { list: rows, includeImported: s.include_imported };
}

async function post(to: string, sub: Sub | null, unsubscribeUrl: string, firstName: string | null, source: string) {
    const key = process.env.RESEND_API_KEY;
    if (!key) return { ok: false, id: null as string | null, error: 'RESEND_API_KEY missing' };
    const input = {
        firstName, applyUrl: `${BASE}/founding?source=${source}`, sampleUrl: `${BASE}/founding/sample`,
        unsubscribeUrl, address: MAILING_ADDRESS,
    };
    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            from: FROM, reply_to: REPLY_TO, to, subject: INVITE_SUBJECT, html: inviteHtml(input), text: inviteText(input),
            headers: {
                'List-Unsubscribe': `<${unsubscribeUrl.replace('/newsletter/unsubscribe?', '/api/newsletter/unsubscribe?')}>`,
                'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
            },
        }),
    });
    if (!res.ok) return { ok: false, id: null, error: `HTTP ${res.status}` };
    const j: any = await res.json().catch(() => ({}));
    return { ok: true, id: (j?.id as string) ?? null, error: null as string | null };
}

/** Test send to an authorized address. Uses a placeholder unsubscribe link so no subscriber record is touched. */
export async function sendTestInvite(to: string) {
    if (!TEST_ADDRESSES.includes(to.toLowerCase())) return { ok: false, error: 'Not an authorized test address' };
    return post(to, null, `${BASE}/newsletter/unsubscribe?token=test`, 'Eric', 'test');
}

/** Sends the next batch. Only inside the normal sending window, and never more than `max` per call. */
export async function sendInviteBatch(max: number, wave: number) {
    const s = await getSettings();
    if (!inSendWindow(s)) return { sent: 0, failed: 0, skipped: 'outside the sending window' };
    const { list } = await eligible(Math.min(max, 100));
    let sent = 0, failed = 0;
    for (const sub of list) {
        const unsub = `${BASE}/newsletter/unsubscribe?token=${await makeUnsubscribeToken(sub.id)}`;
        const claim = await pool.query(`INSERT INTO program_invite_log (subscriber_id, email, wave) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING RETURNING 1`, [sub.id, sub.email, wave]);
        if (!claim.rows[0]) continue;
        const r = await post(sub.email, sub, unsub, greeting(sub.first_name), 'invite');
        if (r.ok) { sent++; await pool.query(`UPDATE program_invite_log SET resend_id = $2 WHERE subscriber_id = $1`, [sub.id, r.id]); }
        else { failed++; await pool.query(`DELETE FROM program_invite_log WHERE subscriber_id = $1`, [sub.id]); }
        await new Promise((res) => setTimeout(res, 1500));
    }
    return { sent, failed };
}
