/**
 * Seed monitor: real inbox placement for mail that Resend reports as delivered.
 *
 * Seeds are mailboxes we own (Gmail, Yahoo, iCloud, or any IMAP host). Each one
 * is a normal subscriber, so it receives each issue through the same pipeline
 * as everyone else. After a send, this module signs in over IMAP, read only, and
 * finds the message to record which folder it landed in:
 *   inbox | promotions | spam | other (not in inbox or spam, for example archived)
 *   | missing (not found anywhere after 6 hours)
 * It also records the SPF, DKIM and DMARC results the receiving server wrote
 * into the message headers.
 *
 * Credentials are app passwords for throwaway test mailboxes, stored encrypted
 * (AES-256-GCM, key derived from a server secret). They are never returned by
 * any API.
 */
import crypto from 'crypto';
import { ImapFlow } from 'imapflow';
import { query } from '@/lib/db';

export type SeedProvider = 'gmail' | 'yahoo' | 'icloud' | 'other';
export type Placement = 'inbox' | 'promotions' | 'spam' | 'other' | 'missing';

const HOSTS: Record<Exclude<SeedProvider, 'other'>, string> = {
    gmail: 'imap.gmail.com',
    yahoo: 'imap.mail.yahoo.com',
    icloud: 'imap.mail.me.com',
};

// ---------- tables ----------

let ready = false;
export async function ensureSeedTables(): Promise<void> {
    if (ready) return;
    await query(`
        CREATE TABLE IF NOT EXISTS newsletter_seeds (
            id              SERIAL PRIMARY KEY,
            email           TEXT NOT NULL UNIQUE,
            provider        TEXT NOT NULL,
            imap_host       TEXT NOT NULL,
            imap_port       INT  NOT NULL DEFAULT 993,
            secret_enc      TEXT NOT NULL,
            active          BOOLEAN NOT NULL DEFAULT TRUE,
            created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            last_checked_at TIMESTAMPTZ,
            last_error      TEXT
        )
    `);
    await query(`
        CREATE TABLE IF NOT EXISTS newsletter_seed_checks (
            id            BIGSERIAL PRIMARY KEY,
            seed_email    TEXT NOT NULL,
            send_log_id   BIGINT NOT NULL UNIQUE,
            issue_number  INT,
            sent_at       TIMESTAMPTZ NOT NULL,
            placement     TEXT NOT NULL,
            folder        TEXT,
            labels        TEXT,
            spf           TEXT,
            dkim          TEXT,
            dmarc         TEXT,
            received_at   TIMESTAMPTZ,
            checked_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await query(`CREATE INDEX IF NOT EXISTS newsletter_seed_checks_seed_idx ON newsletter_seed_checks (seed_email, sent_at)`);
    ready = true;
}

// ---------- secret handling ----------

function secretKey(): Buffer | null {
    const s = process.env.SEED_SECRET || process.env.ADMIN_SESSION_SECRET || process.env.CRON_SECRET;
    if (!s) return null;
    return crypto.createHash('sha256').update(`seed-monitor-v1:${s}`).digest();
}

function encrypt(plain: string): string {
    const key = secretKey();
    if (!key) throw new Error('No server secret configured');
    const iv = crypto.randomBytes(12);
    const c = crypto.createCipheriv('aes-256-gcm', key, iv);
    const ct = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
    return [iv, c.getAuthTag(), ct].map((b) => b.toString('base64')).join('.');
}

function decrypt(blob: string): string {
    const key = secretKey();
    if (!key) throw new Error('No server secret configured');
    const [iv, tag, ct] = blob.split('.').map((x) => Buffer.from(x, 'base64'));
    const d = crypto.createDecipheriv('aes-256-gcm', key, iv);
    d.setAuthTag(tag);
    return Buffer.concat([d.update(ct), d.final()]).toString('utf8');
}

// ---------- IMAP ----------

function client(host: string, port: number, user: string, pass: string): ImapFlow {
    const c = new ImapFlow({
        host, port, secure: true, auth: { user, pass }, logger: false,
        socketTimeout: 30_000, greetingTimeout: 15_000, connectionTimeout: 15_000,
    });
    c.on('error', () => { /* surfaced through the awaited call */ });
    return c;
}

/** Sign in only, to prove the credentials work. Returns an error message or null. */
export async function verifyLogin(host: string, port: number, user: string, pass: string): Promise<string | null> {
    const c = client(host, port, user, pass);
    try {
        await c.connect();
        await c.logout();
        return null;
    } catch (err) {
        try { c.close(); } catch { /* ignore */ }
        const msg = String((err as Error)?.message ?? err);
        const authFailed = (err as { authenticationFailed?: boolean })?.authenticationFailed === true;
        return authFailed || /auth|credential|login|password/i.test(msg)
            ? 'Sign in failed. Check the address and use an app password, not the normal password.'
            : `Could not connect: ${msg.slice(0, 160)}`;
    }
}

export async function addSeed(
    email: string, appPassword: string, provider: SeedProvider, host?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
    await ensureSeedTables();
    const addr = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(addr)) return { ok: false, error: 'Enter a valid email address' };
    if (!secretKey()) return { ok: false, error: 'Server secret missing; cannot store credentials' };
    const imapHost = provider === 'other' ? (host ?? '').trim() : HOSTS[provider];
    if (!imapHost) return { ok: false, error: 'IMAP host required' };
    // Google shows app passwords with spaces; remove them.
    const pass = appPassword.replace(/\s+/g, '');
    if (!pass) return { ok: false, error: 'App password required' };
    const err = await verifyLogin(imapHost, 993, addr, pass);
    if (err) return { ok: false, error: err };
    await query(
        `INSERT INTO newsletter_seeds (email, provider, imap_host, secret_enc, active, last_error)
         VALUES ($1, $2, $3, $4, TRUE, NULL)
         ON CONFLICT (email) DO UPDATE SET provider = $2, imap_host = $3, secret_enc = $4, active = TRUE, last_error = NULL`,
        [addr, provider, imapHost, encrypt(pass)]
    );
    return { ok: true };
}

export async function removeSeed(email: string): Promise<void> {
    await ensureSeedTables();
    await query(`DELETE FROM newsletter_seeds WHERE email = $1`, [email.trim().toLowerCase()]);
}

// ---------- checking ----------

interface SeedRow { email: string; provider: string; imap_host: string; imap_port: number; secret_enc: string }
interface PendingSend { id: number; issue_number: number | null; sent_at: Date }

const FINAL_MISSING_AFTER_MIN = 360; // 6 hours
const MIN_AGE_MIN = 3;               // give the receiver a moment

function authResult(headers: string, key: string): string | null {
    const m = headers.match(new RegExp(`\\b${key}=([a-z]+)`, 'i'));
    return m ? m[1].toLowerCase() : null;
}

interface Found { folder: string; labels: string; receivedAt: Date; headers: string }

async function findInFolder(
    c: ImapFlow, folder: string, sentAt: Date
): Promise<Found | null> {
    let lock;
    try { lock = await c.getMailboxLock(folder, { readOnly: true }); } catch { return null; }
    try {
        const since = new Date(sentAt.getTime() - 24 * 3600 * 1000);
        const uids = await c.search({ since, or: [{ from: 'news.trademind.bot' }, { from: 'taocodao.com' }] }, { uid: true });
        if (!uids || uids.length === 0) return null;
        let best: Found | null = null;
        let bestDiff = Infinity;
        for await (const msg of c.fetch(uids.slice(-60), { uid: true, internalDate: true, labels: true, headers: ['authentication-results', 'received-spf'] }, { uid: true })) {
            const when = msg.internalDate ? new Date(msg.internalDate) : null;
            if (!when) continue;
            const diff = when.getTime() - sentAt.getTime();
            // The message arrives after we sent it, within 12 hours (small clock slack before).
            if (diff < -5 * 60_000 || diff > 12 * 3600_000) continue;
            if (Math.abs(diff) < bestDiff) {
                bestDiff = Math.abs(diff);
                best = {
                    folder, receivedAt: when,
                    labels: msg.labels ? Array.from(msg.labels).join(' ') : '',
                    headers: msg.headers ? msg.headers.toString('utf8') : '',
                };
            }
        }
        return best;
    } finally {
        lock.release();
    }
}

async function checkOneSeed(seed: SeedRow, pending: PendingSend[]): Promise<number> {
    const c = client(seed.imap_host, seed.imap_port, seed.email, decrypt(seed.secret_enc));
    let saved = 0;
    try {
        await c.connect();
        const boxes = await c.list();
        const junk = boxes.find((b) => b.specialUse === '\\Junk')
            ?? boxes.find((b) => /^(spam|junk|bulk)/i.test(b.name) || /(\[gmail\]\/spam)/i.test(b.path));
        const all = boxes.find((b) => b.specialUse === '\\All');

        for (const p of pending) {
            const ageMin = (Date.now() - p.sent_at.getTime()) / 60_000;
            let placement: Placement | null = null;
            let found: Found | null = await findInFolder(c, 'INBOX', p.sent_at);
            if (found) {
                placement = /promotions/i.test(found.labels) ? 'promotions' : 'inbox';
            } else if (junk && (found = await findInFolder(c, junk.path, p.sent_at))) {
                placement = 'spam';
            } else if (all && (found = await findInFolder(c, all.path, p.sent_at))) {
                placement = /promotions/i.test(found.labels) ? 'promotions' : 'other';
            }
            if (!placement) {
                if (ageMin < FINAL_MISSING_AFTER_MIN) continue; // may still arrive; retry later
                placement = 'missing';
            }
            await query(
                `INSERT INTO newsletter_seed_checks
                   (seed_email, send_log_id, issue_number, sent_at, placement, folder, labels, spf, dkim, dmarc, received_at)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
                 ON CONFLICT (send_log_id) DO NOTHING`,
                [
                    seed.email, p.id, p.issue_number, p.sent_at, placement,
                    found?.folder ?? null, found?.labels?.slice(0, 300) ?? null,
                    found ? authResult(found.headers, 'spf') : null,
                    found ? authResult(found.headers, 'dkim') : null,
                    found ? authResult(found.headers, 'dmarc') : null,
                    found?.receivedAt ?? null,
                ]
            );
            saved++;
        }
        await c.logout();
    } catch (err) {
        try { c.close(); } catch { /* ignore */ }
        throw err;
    }
    return saved;
}

export async function runSeedChecks(only?: string): Promise<{ seeds: number; saved: number; errors: string[] }> {
    await ensureSeedTables();
    const seeds = (await query(
        `SELECT email, provider, imap_host, imap_port, secret_enc FROM newsletter_seeds
         WHERE active = TRUE AND ($1::text IS NULL OR email = $1)`, [only ?? null]
    )).rows as SeedRow[];
    let saved = 0;
    const errors: string[] = [];
    for (const seed of seeds) {
        const pend = await query(
            `SELECT l.id, l.issue_number, l.created_at AS sent_at FROM newsletter_send_log l
             WHERE l.email = $1 AND l.kind IN ('issue','preview')
               AND l.status IN ('accepted','delivered','opened','clicked')
               AND l.created_at > NOW() - INTERVAL '7 days'
               AND l.created_at < NOW() - INTERVAL '${MIN_AGE_MIN} minutes'
               AND NOT EXISTS (SELECT 1 FROM newsletter_seed_checks k WHERE k.send_log_id = l.id)
             ORDER BY l.created_at DESC LIMIT 20`, [seed.email]
        );
        const pending = pend.rows as PendingSend[];
        if (pending.length === 0) {
            await query(`UPDATE newsletter_seeds SET last_checked_at = NOW(), last_error = NULL WHERE email = $1`, [seed.email]);
            continue;
        }
        try {
            saved += await Promise.race([
                checkOneSeed(seed, pending),
                new Promise<number>((_, rej) => setTimeout(() => rej(new Error('Seed check timed out')), 80_000)),
            ]);
            await query(`UPDATE newsletter_seeds SET last_checked_at = NOW(), last_error = NULL WHERE email = $1`, [seed.email]);
        } catch (err) {
            const msg = String((err as Error)?.message ?? err).slice(0, 200);
            errors.push(`${seed.email}: ${msg}`);
            await query(`UPDATE newsletter_seeds SET last_checked_at = NOW(), last_error = $2 WHERE email = $1`, [seed.email, msg]);
        }
    }
    return { seeds: seeds.length, saved, errors };
}

// ---------- report ----------

export async function seedReport() {
    await ensureSeedTables();
    const seeds = (await query(
        `SELECT email, provider, active, created_at, last_checked_at, last_error FROM newsletter_seeds ORDER BY email`
    )).rows;
    const checks = (await query(
        `SELECT seed_email, issue_number, sent_at, placement, folder, labels, spf, dkim, dmarc, received_at
         FROM newsletter_seed_checks ORDER BY sent_at DESC LIMIT 60`
    )).rows;
    const pending = (await query(
        `SELECT l.email AS seed_email, l.issue_number, l.created_at AS sent_at
         FROM newsletter_send_log l JOIN newsletter_seeds s ON s.email = l.email
         WHERE l.kind IN ('issue','preview') AND l.status IN ('accepted','delivered','opened','clicked')
           AND l.created_at > NOW() - INTERVAL '7 days'
           AND NOT EXISTS (SELECT 1 FROM newsletter_seed_checks k WHERE k.send_log_id = l.id)
         ORDER BY l.created_at DESC LIMIT 40`
    )).rows;
    const tally: Record<string, number> = {};
    for (const c of checks as { placement: string }[]) tally[c.placement] = (tally[c.placement] ?? 0) + 1;
    return { seeds, checks, pending, tally, secretConfigured: !!secretKey() };
}
