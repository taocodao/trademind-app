/**
 * Reads the Workspace mailbox that Workspace sends go out from, so those sends get the same bounce and reply handling
 * that Resend webhooks give the other route. Read only over IMAP (nothing is deleted, moved or marked).
 *
 *  - A delivery failure notice naming one of our message ids with a permanent (5.x.x) code marks that send bounced, stops the
 *    contact's queue and adds the address to the suppression list. Temporary codes (4.x.x, mailbox full) change nothing.
 *  - A reply whose In-Reply-To or References names one of our message ids marks the contact replied and stops the queue.
 *    Out of office and other automatic replies are ignored.
 *
 * Our Workspace message ids look like <cx.TOKEN.STEP@domain>, so nothing needs to be guessed from the recipient address.
 * Each handled message is recorded in cx_inbound, so running this often is safe.
 */
import { ImapFlow } from 'imapflow';
import { query } from '@/lib/db';
import { applyOutreachEvent } from './db';

const ID_RE = /<?cx\.([A-Za-z0-9_-]+)\.(\d+)@([A-Za-z0-9.-]+)>?/;

export async function ensureInboundTable(): Promise<void> {
    await query(`CREATE TABLE IF NOT EXISTS cx_inbound (msgid TEXT PRIMARY KEY, kind TEXT NOT NULL, token TEXT, step INT, note TEXT, seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
}

/** Classifies a failure notice from its text: permanent (5.x.x or 55x), temporary, or not a failure. */
export function classifyDsn(text: string): 'permanent' | 'temporary' | 'none' {
    const status = text.match(/Status:\s*([245])\.\d{1,3}\.\d{1,3}/i) || text.match(/\b([245])\.\d{1,3}\.\d{1,3}\b/);
    const code = text.match(/\b(5[0-9]{2})[ -]/);
    if (/Status:\s*5\./i.test(text)) return /Status:\s*5\.2\.2/i.test(text) ? 'temporary' : 'permanent';
    if (/Status:\s*4\./i.test(text)) return 'temporary';
    if (status?.[1] === '5' && !/\b5\.2\.2\b/.test(text)) return 'permanent';
    if (status?.[1] === '4') return 'temporary';
    if (code) return 'permanent';
    return 'none';
}

export async function runWorkspaceReader(opts: { days?: number } = {}): Promise<{ checked: number; bounced: number; replied: number; ignored: number; note?: string }> {
    const user = process.env.WORKSPACE_SMTP_DEFAULT_USER, pass = process.env.WORKSPACE_SMTP_DEFAULT_PASS;
    const out = { checked: 0, bounced: 0, replied: 0, ignored: 0 } as { checked: number; bounced: number; replied: number; ignored: number; note?: string };
    if (!user || !pass) return { ...out, note: 'no Workspace login' };
    await ensureInboundTable();
    const open = await query(`SELECT 1 FROM outreach_sends WHERE message_id LIKE '<cx.%' AND sent_at > NOW() - INTERVAL '21 days' LIMIT 1`);
    if (!open.rows[0]) return { ...out, note: 'no Workspace sends in the last 21 days' };

    const c = new ImapFlow({ host: 'imap.gmail.com', port: 993, secure: true, auth: { user, pass }, logger: false });
    await c.connect();
    try {
        const lock = await c.getMailboxLock('INBOX');
        try {
            const since = new Date(Date.now() - (opts.days ?? 3) * 86400000);
            const uids = (await c.search({ since }, { uid: true })) || [];
            for (const uid of uids.slice(-400)) {
                const m = await c.fetchOne(String(uid), { uid: true, envelope: true, headers: ['message-id', 'in-reply-to', 'references', 'auto-submitted', 'x-autoreply', 'precedence', 'content-type'] }, { uid: true });
                if (!m || !m.headers) continue;
                const h = m.headers.toString();
                const msgid = (h.match(/^message-id:\s*(<[^>]+>)/im) || [])[1] || `uid:${uid}`;
                if ((await query(`SELECT 1 FROM cx_inbound WHERE msgid = $1`, [msgid])).rows[0]) continue;
                out.checked++;
                const from = String(m.envelope?.from?.[0]?.address || '').toLowerCase();
                const subject = String(m.envelope?.subject || '');
                const isDsn = /^(mailer-daemon|postmaster)@/.test(from) || /multipart\/report/i.test(h) || /undeliverable|delivery status notification|returned mail|failure notice/i.test(subject);
                const refs = h;   // our ids never appear in a stranger's own Message-ID, so any hit here is In-Reply-To or References
                let handled = false;

                if (isDsn) {
                    const dl = await c.download(String(uid), undefined, { uid: true });
                    const chunks: Buffer[] = []; let size = 0;
                    for await (const ch of (dl.content as AsyncIterable<Buffer>)) { chunks.push(ch as Buffer); size += (ch as Buffer).length; if (size > 400000) break; }
                    const body = Buffer.concat(chunks).toString('utf8');
                    const id = body.match(/<cx\.([A-Za-z0-9_-]+)\.(\d+)@[A-Za-z0-9.-]+>/);
                    if (id) {
                        const kind = classifyDsn(body);
                        const mid = id[0];
                        if (kind === 'permanent') {
                            const reason = (body.match(/(5\d\d[ -][^\r\n]{0,160})/) || body.match(/(Status:\s*5\.\d+\.\d+[^\r\n]{0,120})/) || ['permanent failure'])[1];
                            if (await applyOutreachEvent(mid, 'email.bounced', 'Permanent', reason)) {
                                const to = (body.match(/Final-Recipient:\s*rfc822;\s*([^\s<>]+@[^\s<>]+)/i) || body.match(/Original-Recipient:\s*rfc822;\s*([^\s<>]+@[^\s<>]+)/i) || [])[1];
                                if (to) await query(`INSERT INTO newsletter_suppression (email, reason) VALUES ($1, 'hard_bounce') ON CONFLICT (email) DO NOTHING`, [to.toLowerCase()]);
                                out.bounced++; handled = true;
                                await query(`INSERT INTO cx_inbound (msgid, kind, token, step, note) VALUES ($1,'bounce',$2,$3,$4) ON CONFLICT DO NOTHING`, [msgid, id[1], Number(id[2]), reason.slice(0, 200)]);
                            }
                        } else {
                            handled = true; out.ignored++;
                            await query(`INSERT INTO cx_inbound (msgid, kind, token, step, note) VALUES ($1,$2,$3,$4,'not permanent') ON CONFLICT DO NOTHING`, [msgid, kind === 'temporary' ? 'soft' : 'dsn_other', id[1], Number(id[2])]);
                        }
                    }
                } else if (!/auto-(replied|generated)|^x-autoreply|precedence:\s*(bulk|junk|auto_reply)/im.test(h)) {
                    const id = refs.match(/<cx\.([A-Za-z0-9_-]+)\.(\d+)@[A-Za-z0-9.-]+>/);
                    if (id) {
                        const r = await query(`SELECT token FROM outreach_sends WHERE message_id = $1`, [id[0]]);
                        const token = r.rows[0]?.token as string | undefined;
                        if (token) {
                            await query(`UPDATE outreach_contacts SET status = 'replied', updated_at = NOW() WHERE token = $1 AND status NOT IN ('unsubscribed','complained','bounced')`, [token]);
                            await query(`UPDATE outreach_queue SET state = 'skipped', note = 'replied' WHERE token = $1 AND state = 'pending'`, [token]);
                            out.replied++; handled = true;
                            await query(`INSERT INTO cx_inbound (msgid, kind, token, step, note) VALUES ($1,'reply',$2,$3,$4) ON CONFLICT DO NOTHING`, [msgid, token, Number(id[2]), subject.slice(0, 120)]);
                        }
                    }
                }
                if (!handled) {
                    // Not ours. Remember it so it is not opened again.
                    await query(`INSERT INTO cx_inbound (msgid, kind) VALUES ($1,'other') ON CONFLICT DO NOTHING`, [msgid]);
                }
            }
        } finally { lock.release(); }
    } finally { await c.logout().catch(() => undefined); }
    return out;
}
