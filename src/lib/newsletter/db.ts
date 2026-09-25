/**
 * Newsletter subscriber storage and lifecycle.
 *
 * Table: newsletter_subscribers (one row per email, canonical lowercase).
 * Status flow: pending -> confirmed (or superseded via change-email).
 * The 30% annual offer window is confirmed_at + 3 months.
 */
import crypto from 'crypto';
import { query } from '@/lib/db';

export const OFFER_WINDOW_MONTHS = 3;
const TOKEN_TTL_DAYS = 7;

let tablesReady = false;
export async function ensureNewsletterTables(): Promise<void> {
    if (tablesReady) return;
    await query(`
        CREATE TABLE IF NOT EXISTS newsletter_subscribers (
            id              BIGSERIAL PRIMARY KEY,
            email           TEXT        NOT NULL UNIQUE,
            experience      TEXT,
            consent         BOOLEAN     NOT NULL DEFAULT FALSE,
            status          TEXT        NOT NULL DEFAULT 'pending',
            confirm_token   TEXT        UNIQUE,
            confirm_expires TIMESTAMPTZ,
            change_token    TEXT        UNIQUE,
            confirmed_at    TIMESTAMPTZ,
            offer_expires   TIMESTAMPTZ,
            created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await query(`
        CREATE TABLE IF NOT EXISTS newsletter_events (
            id         BIGSERIAL PRIMARY KEY,
            event      TEXT NOT NULL,
            meta       JSONB,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await query(`CREATE INDEX IF NOT EXISTS newsletter_events_event_idx ON newsletter_events (event, created_at)`);
    tablesReady = true;
}

function token(): string {
    return crypto.randomBytes(24).toString('base64url');
}

function validEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export type SubscribeResult =
    | { ok: true; status: 'pending'; email: string }
    | { ok: false; error: string; status?: string };

/** Create or refresh a pending subscriber and return its tokens for the confirm email. */
export async function createPendingSubscriber(
    rawEmail: string,
    experience: string | null,
    consent: boolean
): Promise<{ subscriber?: { email: string; confirmToken: string; changeToken: string }; error?: string }> {
    await ensureNewsletterTables();
    const email = rawEmail.trim().toLowerCase();
    if (!validEmail(email)) return { error: 'Enter a valid email address' };
    if (!consent) return { error: 'Consent is required to subscribe' };

    const confirmToken = token();
    const changeToken = token();
    const expires = new Date(Date.now() + TOKEN_TTL_DAYS * 864e5);

    // A new signup (or a re-signup while pending) gets fresh tokens.
    // An already-confirmed address is left confirmed; we resend nothing new.
    const res = await query(
        `INSERT INTO newsletter_subscribers
            (email, experience, consent, status, confirm_token, confirm_expires, change_token)
         VALUES ($1, $2, $3, 'pending', $4, $5, $6)
         ON CONFLICT (email) DO UPDATE SET
            experience      = EXCLUDED.experience,
            consent         = EXCLUDED.consent,
            status          = CASE WHEN newsletter_subscribers.status = 'confirmed'
                                   THEN 'confirmed' ELSE 'pending' END,
            confirm_token   = CASE WHEN newsletter_subscribers.status = 'confirmed'
                                   THEN newsletter_subscribers.confirm_token ELSE EXCLUDED.confirm_token END,
            confirm_expires = CASE WHEN newsletter_subscribers.status = 'confirmed'
                                   THEN newsletter_subscribers.confirm_expires ELSE EXCLUDED.confirm_expires END,
            change_token    = CASE WHEN newsletter_subscribers.status = 'confirmed'
                                   THEN newsletter_subscribers.change_token ELSE EXCLUDED.change_token END,
            updated_at      = NOW()
         RETURNING status, confirm_token, change_token`,
        [email, experience, consent, confirmToken, expires.toISOString(), changeToken]
    );
    const row = res.rows[0];
    return {
        subscriber: { email, confirmToken: row.confirm_token, changeToken: row.change_token },
    };
}

export type ConfirmOutcome =
    | 'confirmed'
    | 'already-confirmed'
    | 'expired'
    | 'not-found';

export async function confirmByToken(t: string): Promise<{ outcome: ConfirmOutcome; email?: string; offerExpires?: string }> {
    await ensureNewsletterTables();
    const res = await query(
        `SELECT email, status, confirm_expires, offer_expires FROM newsletter_subscribers WHERE confirm_token = $1`,
        [t]
    );
    const row = res.rows[0];
    if (!row) return { outcome: 'not-found' };
    if (row.status === 'confirmed') {
        return { outcome: 'already-confirmed', email: row.email, offerExpires: row.offer_expires };
    }
    if (row.confirm_expires && new Date(row.confirm_expires) < new Date()) {
        return { outcome: 'expired', email: row.email };
    }
    const upd = await query(
        `UPDATE newsletter_subscribers
         SET status = 'confirmed', confirmed_at = NOW(),
             offer_expires = NOW() + ($2 || ' months')::interval,
             updated_at = NOW()
         WHERE confirm_token = $1 AND status = 'pending'
         RETURNING email, offer_expires`,
        [t, String(OFFER_WINDOW_MONTHS)]
    );
    if (!upd.rows[0]) return { outcome: 'not-found' };
    return { outcome: 'confirmed', email: upd.rows[0].email, offerExpires: upd.rows[0].offer_expires };
}

/** Look up a pending subscriber by its change token (for the change-email page). */
export async function getByChangeToken(t: string): Promise<{ email: string; status: string } | null> {
    await ensureNewsletterTables();
    const res = await query(
        `SELECT email, status FROM newsletter_subscribers WHERE change_token = $1`,
        [t]
    );
    return res.rows[0] ?? null;
}

/**
 * Change-email flow: invalidate the original pending address and create a new
 * pending row for the replacement. The 3-month offer window starts when the
 * new email confirms.
 */
export async function changeEmail(
    t: string,
    rawNewEmail: string
): Promise<{ ok: boolean; email?: string; confirmToken?: string; changeToken?: string; error?: string }> {
    await ensureNewsletterTables();
    const newEmail = rawNewEmail.trim().toLowerCase();
    if (!validEmail(newEmail)) return { ok: false, error: 'Enter a valid email address' };

    const res = await query(
        `SELECT email, status FROM newsletter_subscribers WHERE change_token = $1`,
        [t]
    );
    const row = res.rows[0];
    if (!row) return { ok: false, error: 'This link is not valid anymore' };
    if (row.status === 'confirmed') return { ok: false, error: 'This address is already confirmed' };

    const taken = await query(
        `SELECT status FROM newsletter_subscribers WHERE email = $1`,
        [newEmail]
    );
    if (taken.rows[0]?.status === 'confirmed') {
        return { ok: false, error: 'That address is already subscribed and confirmed' };
    }

    await query(
        `UPDATE newsletter_subscribers SET status = 'superseded', updated_at = NOW() WHERE change_token = $1`,
        [t]
    );

    const confirmToken = token();
    const changeToken = token();
    const expires = new Date(Date.now() + TOKEN_TTL_DAYS * 864e5);
    await query(
        `INSERT INTO newsletter_subscribers
            (email, consent, status, confirm_token, confirm_expires, change_token)
         VALUES ($1, TRUE, 'pending', $2, $3, $4)
         ON CONFLICT (email) DO UPDATE SET
            status = 'pending', confirm_token = EXCLUDED.confirm_token,
            confirm_expires = EXCLUDED.confirm_expires, change_token = EXCLUDED.change_token,
            updated_at = NOW()`,
        [newEmail, confirmToken, expires.toISOString(), changeToken]
    );
    return { ok: true, email: newEmail, confirmToken, changeToken };
}

export type EligibilityStatus =
    | { state: 'eligible'; until: string }
    | { state: 'pending' }
    | { state: 'expired' }
    | { state: 'not-found' };

export async function checkEligibility(rawEmail: string): Promise<EligibilityStatus> {
    await ensureNewsletterTables();
    const email = rawEmail.trim().toLowerCase();
    const res = await query(
        `SELECT status, offer_expires FROM newsletter_subscribers WHERE email = $1`,
        [email]
    );
    const row = res.rows[0];
    if (!row) return { state: 'not-found' };
    if (row.status === 'pending') return { state: 'pending' };
    if (row.status !== 'confirmed' || !row.offer_expires) return { state: 'not-found' };
    const until = new Date(row.offer_expires);
    if (until < new Date()) return { state: 'expired' };
    return { state: 'eligible', until: until.toISOString() };
}

/** Analytics events for the newsletter surface. */
const ALLOWED_EVENTS = new Set([
    'page_view',
    'signup_started',
    'signup_submitted',
    'share_clicked',
    'offer_cta_clicked',
    'deep_link_clicked',
    'eligibility_checked',
]);

export async function recordNewsletterEvent(event: string, meta: Record<string, unknown>): Promise<boolean> {
    if (!ALLOWED_EVENTS.has(event)) return false;
    try {
        await ensureNewsletterTables();
        await query(`INSERT INTO newsletter_events (event, meta) VALUES ($1, $2)`, [
            event,
            JSON.stringify(meta ?? {}),
        ]);
        return true;
    } catch (err) {
        console.error('[newsletter event]', err);
        return false;
    }
}
