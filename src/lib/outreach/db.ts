/**
 * Tokenized cold invitation campaign (coldlist_v1): data layer.
 *
 * Tables: outreach_contacts, outreach_sends, outreach_queue, outreach_click_events,
 * outreach_domains, outreach_settings, outreach_plan_days.
 * Subscribers, discount codes and suppression reuse the existing newsletter tables
 * (newsletter_subscribers, newsletter_discounts, newsletter_suppression), linked by email.
 */
import { createHash } from 'crypto';
import { query } from '@/lib/db';

export const CAMPAIGN = 'invite_v4';
export const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://trademind.bot';

let ready = false;
export async function ensureOutreachTables(): Promise<void> {
    if (ready) return;
    await query(`
        CREATE TABLE IF NOT EXISTS outreach_contacts (
            token       TEXT PRIMARY KEY,
            email       TEXT NOT NULL UNIQUE,
            first_name  TEXT,
            st          TEXT,
            zip5        TEXT,
            age         TEXT,
            segment     TEXT NOT NULL,
            template    TEXT NOT NULL,
            wave        TEXT NOT NULL,
            tz          TEXT NOT NULL DEFAULT 'America/New_York',
            status      TEXT NOT NULL DEFAULT 'pending',
            created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`);
    await query(`ALTER TABLE outreach_contacts ADD COLUMN IF NOT EXISTS subscriber_email TEXT`);
    await query(`ALTER TABLE outreach_contacts ADD COLUMN IF NOT EXISTS snooze_until TIMESTAMPTZ`);
    await query(`
        CREATE TABLE IF NOT EXISTS outreach_feedback (
            id        BIGSERIAL PRIMARY KEY,
            token     TEXT NOT NULL,
            choice    TEXT NOT NULL,
            why       TEXT[] NOT NULL DEFAULT '{}',
            comment   TEXT,
            ts        TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`);
    await query(`CREATE INDEX IF NOT EXISTS outreach_contacts_status_idx ON outreach_contacts (status, wave, segment)`);
    await query(`
        CREATE TABLE IF NOT EXISTS outreach_sends (
            id           BIGSERIAL PRIMARY KEY,
            token        TEXT NOT NULL REFERENCES outreach_contacts(token),
            step         INTEGER NOT NULL,
            template     TEXT NOT NULL,
            domain       TEXT NOT NULL,
            from_addr    TEXT NOT NULL,
            message_id   TEXT,
            sent_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            status       TEXT NOT NULL DEFAULT 'sent',
            bounce_type  TEXT,
            complaint    BOOLEAN NOT NULL DEFAULT FALSE,
            error        TEXT,
            UNIQUE (token, step)
        )`);
    await query(`CREATE INDEX IF NOT EXISTS outreach_sends_msg_idx ON outreach_sends (message_id)`);
    await query(`CREATE INDEX IF NOT EXISTS outreach_sends_domain_idx ON outreach_sends (domain, sent_at)`);
    await query(`
        CREATE TABLE IF NOT EXISTS outreach_queue (
            id           BIGSERIAL PRIMARY KEY,
            plan_date    DATE NOT NULL,
            token        TEXT NOT NULL REFERENCES outreach_contacts(token),
            step         INTEGER NOT NULL,
            domain       TEXT NOT NULL,
            scheduled_at TIMESTAMPTZ NOT NULL,
            state        TEXT NOT NULL DEFAULT 'pending',
            note         TEXT,
            created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE (token, step)
        )`);
    await query(`CREATE INDEX IF NOT EXISTS outreach_queue_due_idx ON outreach_queue (state, scheduled_at)`);
    await query(`
        CREATE TABLE IF NOT EXISTS outreach_click_events (
            id              BIGSERIAL PRIMARY KEY,
            token           TEXT NOT NULL,
            link_type       TEXT NOT NULL,
            step            INTEGER,
            ts              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            ip_hash         TEXT,
            user_agent      TEXT,
            method          TEXT,
            is_bot          BOOLEAN NOT NULL DEFAULT FALSE,
            human_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
            bot_reason      TEXT
        )`);
    await query(`CREATE INDEX IF NOT EXISTS outreach_click_token_idx ON outreach_click_events (token, ts)`);
    await query(`
        CREATE TABLE IF NOT EXISTS outreach_domains (
            domain        TEXT PRIMARY KEY,
            from_local    TEXT NOT NULL DEFAULT 'eric',
            weight        NUMERIC NOT NULL DEFAULT 1,
            status        TEXT NOT NULL DEFAULT 'active',
            paused_reason TEXT,
            paused_at     TIMESTAMPTZ
        )`);
    await query(`CREATE TABLE IF NOT EXISTS outreach_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)`);
    await query(`
        CREATE TABLE IF NOT EXISTS outreach_plan_days (
            plan_date  DATE PRIMARY KEY,
            day_index  INTEGER NOT NULL,
            budget     INTEGER NOT NULL,
            planned    INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`);
    // Seed the four sending domains (Resend subdomains verified in Resend).
    const doms: [string, string][] = [
        ['update.trademindbot.com', 'eric'],
        ['update.taocodao.com', 'eric'],
        ['updates.web3aistore.com', 'eric'],
        ['update.omnisellai.com', 'eric'],
    ];
    for (const [d, l] of doms) {
        await query(`INSERT INTO outreach_domains (domain, from_local) VALUES ($1, $2) ON CONFLICT (domain) DO NOTHING`, [d, l]);
    }
    const defaults: [string, string][] = [
        ['paused', 'true'],            // master switch: nothing sends until set to 'false'
        ['start_date', ''],            // first send day (YYYY-MM-DD, America/New_York)
        ['ramp_start', '100'],         // sends on day 1
        ['ramp_step', '50'],           // added each send day
        ['ramp_cap', '10000'],         // hard ceiling per day
        ['followup_gap_days', '6'],
        ['seq_v2', 'false'],             // 4 stage click/no-click follow-up sequence; off until approved
        ['n_mid_steps', 'true'],         // no-click branch also gets FU2 and FU3 while complaints stay low
        ['list_unsub_header', 'true'],   // List-Unsubscribe headers (mail clients show their own Unsubscribe button when present)
        ['html_enabled', 'false'],       // HTML plus plain text v5 templates; off until Eric approves the samples
        ['sender_name', 'Eric Huang'],
        ['from_display', 'Eric Huang From AI Investor Copilot'], // display name in the From line
        ['reply_to', 'eric@taocodao.com'],
        ['alert_email', 'eric@taocodao.com'],
        ['last_report_date', ''],
    ];
    for (const [k, v] of defaults) {
        await query(`INSERT INTO outreach_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING`, [k, v]);
    }
    ready = true;
}

export async function getSettings(): Promise<Record<string, string>> {
    await ensureOutreachTables();
    const r = await query(`SELECT key, value FROM outreach_settings`);
    const o: Record<string, string> = {};
    for (const row of r.rows) o[String(row.key)] = String(row.value);
    return o;
}

export async function setSetting(key: string, value: string): Promise<void> {
    await query(
        `INSERT INTO outreach_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [key, value]
    );
}

export function hashIp(ip: string | null | undefined): string | null {
    if (!ip) return null;
    const salt = process.env.OUTREACH_IP_SALT || process.env.CRON_SECRET || 'outreach';
    return createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, 24);
}

const TOKEN_RE = /^[a-z2-9]{10}$/;
export function validToken(t: string): boolean {
    return TOKEN_RE.test(t);
}

export interface ContactRow {
    token: string; email: string; first_name: string | null; segment: string;
    template: string; wave: string; status: string; tz: string;
}

export async function getContact(token: string): Promise<ContactRow | null> {
    await ensureOutreachTables();
    if (!validToken(token)) return null;
    const r = await query(
        `SELECT token, email, first_name, segment, template, wave, status, tz FROM outreach_contacts WHERE token = $1`, [token]
    );
    return (r.rows[0] as ContactRow | undefined) ?? null;
}

const SCANNER_UA = /bot|crawl|spider|scanner|python-requests|curl|wget|headless|proofpoint|mimecast|barracuda|preview|safelinks|urldefense|trendmicro|symantec|fireeye|forcepoint|zscaler/i;

/** Records a link click and classifies it. Returns the contact and whether it counted as a bot. */
export async function recordClick(input: {
    token: string; linkType: 'preview' | 'subscribe' | 'unsub' | 'inside' | 'home' | 'issue'; step: number | null;
    method: string; ip: string | null; ua: string | null;
}): Promise<{ known: boolean; isBot: boolean }> {
    await ensureOutreachTables();
    const c = await getContact(input.token);
    if (!c) return { known: false, isBot: false };
    let reason: string | null = null;
    if (input.method === 'HEAD') reason = 'head';
    if (!reason && input.ua && SCANNER_UA.test(input.ua)) reason = 'scanner_ua';
    if (!reason) {
        const s = await query(
            `SELECT 1 FROM outreach_sends WHERE token = $1 AND sent_at > NOW() - INTERVAL '60 seconds' LIMIT 1`, [input.token]
        );
        if (s.rowCount) reason = 'under_60s';
    }
    if (!reason) {
        const other = await query(
            `SELECT id FROM outreach_click_events
             WHERE token = $1 AND link_type <> $2 AND ts > NOW() - INTERVAL '2 seconds' LIMIT 1`,
            [input.token, input.linkType]
        );
        if (other.rowCount) {
            reason = 'burst';
            await query(`UPDATE outreach_click_events SET is_bot = TRUE, bot_reason = 'burst' WHERE id = $1`, [other.rows[0].id]);
        }
    }
    await query(
        `INSERT INTO outreach_click_events (token, link_type, step, ip_hash, user_agent, method, is_bot, bot_reason)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [input.token, input.linkType, input.step, hashIp(input.ip), (input.ua ?? '').slice(0, 300), input.method, !!reason, reason]
    );
    return { known: true, isBot: !!reason };
}

/** Landing page JS (3 seconds visible) confirms a real person: marks the latest click human_confirmed. */
export async function confirmHuman(token: string): Promise<boolean> {
    await ensureOutreachTables();
    if (!validToken(token)) return false;
    const r = await query(
        `UPDATE outreach_click_events SET human_confirmed = TRUE
         WHERE id = (SELECT id FROM outreach_click_events WHERE token = $1 AND is_bot = FALSE
                     AND ts > NOW() - INTERVAL '30 minutes' ORDER BY ts DESC LIMIT 1)
         RETURNING id`, [token]
    );
    let confirmed = !!r.rowCount;
    if (!confirmed && (await getContact(token))) {
        // Deep link (for example an issue page opened from the Start Here page after the 30 minute window):
        // log the human visit directly so the reader is still counted.
        await query(
            `INSERT INTO outreach_click_events (token, link_type, step, method, is_bot, human_confirmed, user_agent)
             VALUES ($1, 'preview', NULL, 'GET', FALSE, TRUE, 'engage')`, [token]
        );
        confirmed = true;
    }
    if (confirmed) {
        await query(
            `UPDATE outreach_contacts SET status = 'clicked', updated_at = NOW()
             WHERE token = $1 AND status IN ('pending', 'sent')`, [token]
        );
        // With the v2 sequence a click does not cancel follow-ups: it moves the person to the clicked branch.
        const v2 = await query(`SELECT value FROM outreach_settings WHERE key = 'seq_v2'`);
        if (v2.rows[0]?.value !== 'true') {
            await query(`UPDATE outreach_queue SET state = 'skipped', note = 'human click' WHERE token = $1 AND step = 2 AND state = 'pending'`, [token]);
        }
    }
    return confirmed;
}

/** One-click unsubscribe: suppress the address, cancel pending sends. */
export async function unsubscribeContact(token: string): Promise<'done' | 'already' | 'unknown'> {
    await ensureOutreachTables();
    const c = await getContact(token);
    if (!c) return 'unknown';
    const already = c.status === 'unsubscribed';
    await query(
        `INSERT INTO newsletter_suppression (email, reason) VALUES ($1, 'unsubscribed') ON CONFLICT (email) DO NOTHING`, [c.email]
    );
    await query(`UPDATE outreach_contacts SET status = 'unsubscribed', updated_at = NOW() WHERE token = $1`, [token]);
    await query(`UPDATE outreach_queue SET state = 'skipped', note = 'unsubscribed' WHERE token = $1 AND state = 'pending'`, [token]);
    return already ? 'already' : 'done';
}

export type UnsubChoice = 'unsub' | 'snooze_90' | 'snooze_180' | 'monthly';
export const UNSUB_CHOICES: UnsubChoice[] = ['unsub', 'snooze_90', 'snooze_180', 'monthly'];
export const WHY_VALUES = ['not_relevant', 'no_options', 'too_many', 'dont_know', 'other'];

/**
 * Unsubscribe page confirm step. unsub suppresses the address everywhere. snooze_90 and snooze_180 stop
 * all email and schedule exactly one check-in at the end of the gap. monthly stops the invitation sequence
 * and records the wish for a monthly recap (no recap is sent until one exists). The optional survey is stored.
 */
export async function applyUnsubChoice(token: string, choice: UnsubChoice, why: string[], comment: string | null): Promise<'done' | 'unknown'> {
    await ensureOutreachTables();
    const c = await getContact(token);
    if (!c) return 'unknown';
    await query(
        `INSERT INTO outreach_feedback (token, choice, why, comment) VALUES ($1, $2, $3, $4)`,
        [token, choice, why.filter((w) => WHY_VALUES.includes(w)).slice(0, 5), comment ? comment.slice(0, 1000) : null]
    );
    if (choice === 'unsub') { await unsubscribeContact(token); return 'done'; }
    const days = choice === 'snooze_90' ? 90 : choice === 'snooze_180' ? 180 : null;
    if (c.status === 'unsubscribed' || c.status === 'bounced' || c.status === 'complained') return 'done';
    await query(
        `UPDATE outreach_contacts SET status = $2, snooze_until = CASE WHEN $3::int IS NULL THEN NULL ELSE NOW() + ($3::int || ' days')::interval END, updated_at = NOW() WHERE token = $1`,
        [token, days ? 'snoozed' : 'monthly', days]
    );
    await query(`UPDATE outreach_queue SET state = 'skipped', note = $2 WHERE token = $1 AND state = 'pending'`, [token, choice]);
    return 'done';
}

/** Subscribe form submitted from a personal link: tie the signup (maybe a different address) to the contact. */
export async function markContactByToken(token: string, subscriberEmail: string, status: 'subscribed'): Promise<void> {
    try {
        await ensureOutreachTables();
        if (!validToken(token)) return;
        await query(
            `UPDATE outreach_contacts SET status = $2, subscriber_email = $3, updated_at = NOW()
             WHERE token = $1 AND status NOT IN ('unsubscribed', 'bounced', 'complained', 'confirmed')`,
            [token, status, subscriberEmail.trim().toLowerCase()]
        );
        await query(`UPDATE outreach_queue SET state = 'skipped', note = 'subscribed' WHERE token = $1 AND state = 'pending'`, [token]);
    } catch (err) {
        console.error('[outreach] markContactByToken', err);
    }
}

/** Called from the confirm flow so campaign metrics follow the person. */
export async function markContactByEmail(email: string, status: 'confirmed'): Promise<void> {
    try {
        await ensureOutreachTables();
        const e = email.trim().toLowerCase();
        await query(
            `UPDATE outreach_contacts SET status = $2, updated_at = NOW()
             WHERE (email = $1 OR subscriber_email = $1) AND status NOT IN ('unsubscribed', 'bounced', 'complained')`, [e, status]
        );
        await query(
            `UPDATE outreach_queue SET state = 'skipped', note = $2
             WHERE state = 'pending' AND token IN (SELECT token FROM outreach_contacts WHERE email = $1 OR subscriber_email = $1)`, [e, status]
        );
    } catch (err) {
        console.error('[outreach] markContactByEmail', err);
    }
}

/** Resend delivery webhook: map per-message events onto sends and contacts. Returns true if the id belongs to the campaign. */
export async function applyOutreachEvent(
    messageId: string, type: string, bounceType: string, bounceMsg: string
): Promise<boolean> {
    await ensureOutreachTables();
    const r = await query(`SELECT id, token FROM outreach_sends WHERE message_id = $1`, [messageId]);
    if (!r.rows[0]) return false;
    const { id, token } = r.rows[0];
    if (type === 'email.delivered') {
        await query(`UPDATE outreach_sends SET status = 'delivered' WHERE id = $1 AND status = 'sent'`, [id]);
    } else if (type === 'email.bounced' && bounceType !== 'Transient') {
        await query(`UPDATE outreach_sends SET status = 'bounced', bounce_type = $2, error = $3 WHERE id = $1`, [id, bounceType || 'Permanent', bounceMsg.slice(0, 300)]);
        await query(`UPDATE outreach_contacts SET status = 'bounced', updated_at = NOW() WHERE token = $1 AND status NOT IN ('confirmed','subscribed','unsubscribed')`, [token]);
        await query(`UPDATE outreach_queue SET state = 'skipped', note = 'bounced' WHERE token = $1 AND state = 'pending'`, [token]);
    } else if (type === 'email.complained') {
        await query(`UPDATE outreach_sends SET complaint = TRUE WHERE id = $1`, [id]);
        await query(`UPDATE outreach_contacts SET status = 'complained', updated_at = NOW() WHERE token = $1`, [token]);
        await query(`UPDATE outreach_queue SET state = 'skipped', note = 'complained' WHERE token = $1 AND state = 'pending'`, [token]);
    }
    return true;
}
