/**
 * Newsletter subscriber system, Phase 2.
 *
 * Subscription states: pending | confirmed | email_change_pending |
 *   unsubscribed | bounced | complained | expired_pending
 * Discount states (separate table): not_started | eligible | redeemed |
 *   expired | revoked
 *
 * Confirmed business rules (Eric, 2026-09-25):
 * - 90-day discount window anchored to FIRST confirmation; email changes
 *   never restart it.
 * - Unsubscribed subscribers keep eligibility until the window ends.
 * - Existing paid customers qualify when buying an additional plan.
 * - Refunds do NOT restore eligibility. Chargebacks revoke.
 * - Pending signups expire after 60 days, with a reminder email first.
 * - At most 2 email changes per subscriber per 90 days.
 */
import { query } from '@/lib/db';
import { normalizeEmail, newToken, hashToken, newDiscountCode } from './normalize';

export const OFFER_WINDOW_DAYS = 90;
export const PENDING_EXPIRY_DAYS = 60;
export const TOKEN_TTL_DAYS = 7;
export const MAX_EMAIL_CHANGES_PER_90D = 2;
export const CONSENT_VERSION = 'v1: Send me The AI Systematic Investor and TradeMind offers';

let tablesReady = false;
export async function ensureNewsletterTables(): Promise<void> {
    if (tablesReady) return;

    await query(`
        CREATE TABLE IF NOT EXISTS newsletter_subscribers (
            id              BIGSERIAL PRIMARY KEY,
            email           TEXT        NOT NULL UNIQUE,
            canonical_email TEXT        UNIQUE,
            experience      TEXT,
            consent         BOOLEAN     NOT NULL DEFAULT FALSE,
            status          TEXT        NOT NULL DEFAULT 'pending',
            first_confirmed_at TIMESTAMPTZ,
            confirmed_at    TIMESTAMPTZ,
            source          TEXT,
            medium          TEXT,
            campaign        TEXT,
            referring_issue TEXT,
            referral_id     TEXT,
            partner_id      TEXT,
            consent_version TEXT,
            signup_ip       TEXT,
            signup_ua       TEXT,
            unsubscribed_at TIMESTAMPTZ,
            change_count_90d INTEGER    NOT NULL DEFAULT 0,
            change_count_reset_at TIMESTAMPTZ,
            lifecycle_marks JSONB       NOT NULL DEFAULT '{}'::jsonb,
            pending_email   TEXT,
            created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    // Phase 1 created this table with fewer columns; add anything missing.
    const adds: [string, string][] = [
        ['canonical_email', 'TEXT'], ['source', 'TEXT'], ['medium', 'TEXT'],
        ['campaign', 'TEXT'], ['referring_issue', 'TEXT'], ['referral_id', 'TEXT'],
        ['partner_id', 'TEXT'], ['consent_version', 'TEXT'], ['signup_ip', 'TEXT'],
        ['signup_ua', 'TEXT'], ['first_confirmed_at', 'TIMESTAMPTZ'],
        ['unsubscribed_at', 'TIMESTAMPTZ'], ['change_count_90d', 'INTEGER NOT NULL DEFAULT 0'],
        ['change_count_reset_at', 'TIMESTAMPTZ'],
        ['lifecycle_marks', `JSONB NOT NULL DEFAULT '{}'::jsonb`], ['pending_email', 'TEXT'],
    ];
    for (const [col, type] of adds) {
        await query(`ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS ${col} ${type}`);
    }
    await query(`CREATE UNIQUE INDEX IF NOT EXISTS newsletter_subscribers_canonical_idx
        ON newsletter_subscribers (canonical_email) WHERE canonical_email IS NOT NULL`);

    await query(`
        CREATE TABLE IF NOT EXISTS newsletter_emails (
            id            BIGSERIAL PRIMARY KEY,
            subscriber_id BIGINT NOT NULL REFERENCES newsletter_subscribers(id) ON DELETE CASCADE,
            email         TEXT   NOT NULL,
            role          TEXT   NOT NULL,        -- primary | previous | pending
            added_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            confirmed_at  TIMESTAMPTZ,
            retired_at    TIMESTAMPTZ
        )
    `);
    await query(`CREATE INDEX IF NOT EXISTS newsletter_emails_email_idx ON newsletter_emails (email)`);

    await query(`
        CREATE TABLE IF NOT EXISTS newsletter_discounts (
            subscriber_id BIGINT PRIMARY KEY REFERENCES newsletter_subscribers(id) ON DELETE CASCADE,
            state         TEXT NOT NULL DEFAULT 'not_started',
            window_start  TIMESTAMPTZ,
            window_end    TIMESTAMPTZ,
            personal_code TEXT UNIQUE,
            redeemed_at   TIMESTAMPTZ,
            order_id      TEXT,
            account_id    BIGINT,
            revoked_reason TEXT,
            updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);

    await query(`
        CREATE TABLE IF NOT EXISTS newsletter_tokens (
            id            BIGSERIAL PRIMARY KEY,
            token_hash    TEXT NOT NULL UNIQUE,
            subscriber_id BIGINT NOT NULL REFERENCES newsletter_subscribers(id) ON DELETE CASCADE,
            purpose       TEXT NOT NULL,          -- confirm | change_email | unsubscribe
            target_email  TEXT,
            expires_at    TIMESTAMPTZ NOT NULL,
            used_at       TIMESTAMPTZ,
            created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await query(`CREATE INDEX IF NOT EXISTS newsletter_tokens_sub_idx ON newsletter_tokens (subscriber_id, purpose)`);

    await query(`
        CREATE TABLE IF NOT EXISTS newsletter_suppression (
            email      TEXT PRIMARY KEY,
            reason     TEXT NOT NULL,             -- unsubscribed | hard_bounce | complaint | manual
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);

    await query(`
        CREATE TABLE IF NOT EXISTS newsletter_events (
            id            BIGSERIAL PRIMARY KEY,
            event         TEXT NOT NULL,
            subscriber_id BIGINT,
            meta          JSONB,
            created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await query(`ALTER TABLE newsletter_events ADD COLUMN IF NOT EXISTS subscriber_id BIGINT`);
    await query(`CREATE INDEX IF NOT EXISTS newsletter_events_event_idx ON newsletter_events (event, created_at)`);

    tablesReady = true;
}

// ---------- types ----------

export interface SubscriberRow {
    id: number;
    email: string;
    canonical_email: string | null;
    status: string;
    first_confirmed_at: string | null;
    confirmed_at: string | null;
    pending_email: string | null;
    source: string | null;
    partner_id: string | null;
    referral_id: string | null;
    change_count_90d: number;
    change_count_reset_at: string | null;
    lifecycle_marks: Record<string, string>;
}

export interface SignupContext {
    experience?: string | null;
    consent: boolean;
    source?: string | null;
    medium?: string | null;
    campaign?: string | null;
    referringIssue?: string | null;
    referralId?: string | null;
    partnerId?: string | null;
    ip?: string | null;
    ua?: string | null;
}

export type SignupOutcome =
    | { kind: 'pending-created'; subscriberId: number; email: string; confirmToken: string; changeToken: string }
    | { kind: 'resent'; subscriberId: number; email: string; confirmToken: string; changeToken: string }
    | { kind: 'already-confirmed'; message?: string }
    | { kind: 'moved-confirmed' }
    | { kind: 'error'; message: string };

// ---------- tokens ----------

async function issueToken(subscriberId: number, purpose: string, targetEmail?: string): Promise<string> {
    const { raw, hash } = newToken();
    const expires = new Date(Date.now() + TOKEN_TTL_DAYS * 864e5);
    await query(
        `INSERT INTO newsletter_tokens (token_hash, subscriber_id, purpose, target_email, expires_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [hash, subscriberId, purpose, targetEmail ?? null, expires.toISOString()]
    );
    return raw;
}

interface TokenRow {
    id: number;
    subscriber_id: number;
    purpose: string;
    target_email: string | null;
    expires_at: string;
    used_at: string | null;
}

export async function findToken(raw: string, purpose: string): Promise<TokenRow | null> {
    await ensureNewsletterTables();
    const res = await query(
        `SELECT id, subscriber_id, purpose, target_email, expires_at, used_at
         FROM newsletter_tokens WHERE token_hash = $1 AND purpose = $2`,
        [hashToken(raw), purpose]
    );
    return res.rows[0] ?? null;
}

async function consumeToken(id: number): Promise<void> {
    await query(`UPDATE newsletter_tokens SET used_at = NOW() WHERE id = $1 AND used_at IS NULL`, [id]);
}

// ---------- signup ----------

export async function isSuppressed(email: string): Promise<boolean> {
    await ensureNewsletterTables();
    const res = await query(`SELECT 1 FROM newsletter_suppression WHERE email = $1`, [email]);
    return res.rowCount! > 0;
}

/** Per-IP signup rate limit: max 5 per hour, counted from the event log. */
export async function signupRateLimited(ip: string | null | undefined): Promise<boolean> {
    if (!ip) return false;
    await ensureNewsletterTables();
    const res = await query(
        `SELECT COUNT(*)::int AS n FROM newsletter_events
         WHERE event = 'signup_submitted' AND meta->>'ip' = $1
           AND created_at > NOW() - INTERVAL '1 hour'`,
        [ip]
    );
    return (res.rows[0]?.n ?? 0) >= 5;
}

export async function signup(ctx: SignupContext & { rawEmail: string }): Promise<SignupOutcome> {
    await ensureNewsletterTables();
    const n = normalizeEmail(ctx.rawEmail);
    if (!n.valid) return { kind: 'error', message: 'Enter a valid email address' };
    if (!ctx.consent) return { kind: 'error', message: 'Consent is required to subscribe' };
    if (n.disposable) return { kind: 'error', message: 'This email provider is not supported. Please use a permanent address.' };
    if (await isSuppressed(n.email)) {
        return { kind: 'error', message: 'This address is not available for subscription' };
    }

    // Duplicate check on the canonical identity (plus tags and Gmail dots removed).
    const existing = await query(
        `SELECT id, email, status FROM newsletter_subscribers WHERE canonical_email = $1 OR email = $2`,
        [n.canonical, n.email]
    );
    let row = existing.rows[0];
    if (!row) {
        // A confirmed subscriber who changed email: the old address resolves to
        // the moved record instead of minting a second identity.
        const prev = await query(
            `SELECT s.id, s.email, s.status FROM newsletter_emails e
             JOIN newsletter_subscribers s ON s.id = e.subscriber_id
             WHERE e.email = $1 AND e.role = 'previous'
               AND s.status IN ('confirmed', 'unsubscribed', 'email_change_pending')`,
            [n.email]
        );
        if (prev.rows[0]) return { kind: 'moved-confirmed' };
    }
    if (row && row.status !== 'expired_pending') {
        if (row.status === 'confirmed' || row.status === 'unsubscribed'
            || row.status === 'email_change_pending') {
            return { kind: 'already-confirmed' };
        }
        // pending / bounced-refresh: issue fresh tokens and resend.
        await query(`UPDATE newsletter_subscribers SET updated_at = NOW() WHERE id = $1`, [row.id]);
        const confirmToken = await issueToken(row.id, 'confirm', row.email);
        const changeToken = await issueToken(row.id, 'change_email', row.email);
        return { kind: 'resent', subscriberId: row.id, email: row.email, confirmToken, changeToken };
    }

    const insert = await query(
        `INSERT INTO newsletter_subscribers
            (email, canonical_email, experience, consent, status, source, medium, campaign,
             referring_issue, referral_id, partner_id, consent_version, signup_ip, signup_ua)
         VALUES ($1,$2,$3,$4,'pending',$5,$6,$7,$8,$9,$10,$11,$12,$13)
         RETURNING id`,
        [
            n.email, n.canonical, ctx.experience ?? null, true,
            ctx.source ?? 'website', ctx.medium ?? null, ctx.campaign ?? null,
            ctx.referringIssue ?? null, ctx.referralId ?? null, ctx.partnerId ?? null,
            CONSENT_VERSION, ctx.ip ?? null, ctx.ua ?? null,
        ]
    );
    const subscriberId = insert.rows[0].id as number;
    await query(
        `INSERT INTO newsletter_emails (subscriber_id, email, role) VALUES ($1, $2, 'primary')`,
        [subscriberId, n.email]
    );
    await query(
        `INSERT INTO newsletter_discounts (subscriber_id, state, personal_code)
         VALUES ($1, 'not_started', $2) ON CONFLICT (subscriber_id) DO NOTHING`,
        [subscriberId, newDiscountCode()]
    );

    const confirmToken = await issueToken(subscriberId, 'confirm', n.email);
    const changeToken = await issueToken(subscriberId, 'change_email', n.email);
    await recordNewsletterEvent('signup_submitted', {
        source: ctx.source ?? 'website', experience: ctx.experience ?? null, ip: ctx.ip ?? null,
    }, subscriberId);
    return { kind: 'pending-created', subscriberId, email: n.email, confirmToken, changeToken };
}

// ---------- confirmation ----------

export type ConfirmOutcome =
    | { outcome: 'confirmed'; email: string; offerExpires: string; code: string; subscriberId: number; source: string | null; partnerId: string | null }
    | { outcome: 'already-confirmed'; email: string; offerExpires: string | null; code: string | null }
    | { outcome: 'expired'; email: string; subscriberId: number }
    | { outcome: 'not-found' };

/** Preview a confirm token WITHOUT consuming it (the confirmation page load). */
export async function previewConfirm(raw: string): Promise<{ valid: boolean; expired?: boolean; email?: string }> {
    const tok = await findToken(raw, 'confirm');
    if (!tok || tok.used_at) return { valid: false };
    const expired = new Date(tok.expires_at) < new Date();
    const res = await query(`SELECT email FROM newsletter_subscribers WHERE id = $1`, [tok.subscriber_id]);
    return { valid: !expired, expired, email: res.rows[0]?.email };
}

/** Actual confirmation. Only callable via the button press on the confirm page. */
export async function confirmByToken(raw: string): Promise<ConfirmOutcome> {
    await ensureNewsletterTables();
    const tok = await findToken(raw, 'confirm');
    if (!tok) return { outcome: 'not-found' };

    const subRes = await query(
        `SELECT s.id, s.email, s.status, s.source, s.partner_id, s.first_confirmed_at,
                d.window_end, d.personal_code, d.state AS discount_state
         FROM newsletter_subscribers s
         LEFT JOIN newsletter_discounts d ON d.subscriber_id = s.id
         WHERE s.id = $1`,
        [tok.subscriber_id]
    );
    const sub = subRes.rows[0];
    if (!sub) return { outcome: 'not-found' };

    if (sub.status === 'confirmed' || sub.status === 'unsubscribed') {
        return {
            outcome: 'already-confirmed', email: sub.email,
            offerExpires: sub.window_end, code: sub.personal_code,
        };
    }
    if (tok.used_at) return { outcome: 'not-found' };
    if (new Date(tok.expires_at) < new Date()) {
        return { outcome: 'expired', email: sub.email, subscriberId: sub.id };
    }

    await consumeToken(tok.id);
    const windowEnd = new Date(Date.now() + OFFER_WINDOW_DAYS * 864e5);
    await query(
        `UPDATE newsletter_subscribers
         SET status = 'confirmed',
             first_confirmed_at = COALESCE(first_confirmed_at, NOW()),
             confirmed_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [sub.id]
    );
    await query(
        `UPDATE newsletter_emails SET confirmed_at = NOW()
         WHERE subscriber_id = $1 AND email = $2 AND confirmed_at IS NULL`,
        [sub.id, sub.email]
    );
    await query(
        `UPDATE newsletter_discounts
         SET state = 'eligible', window_start = NOW(), window_end = $2, updated_at = NOW()
         WHERE subscriber_id = $1 AND state IN ('not_started')`,
        [sub.id, windowEnd.toISOString()]
    );
    const codeRes = await query(
        `SELECT personal_code, window_end FROM newsletter_discounts WHERE subscriber_id = $1`,
        [sub.id]
    );
    await recordNewsletterEvent('subscription_confirmed', { source: sub.source }, sub.id);
    return {
        outcome: 'confirmed', email: sub.email,
        offerExpires: codeRes.rows[0]?.window_end ?? windowEnd.toISOString(),
        code: codeRes.rows[0]?.personal_code ?? '',
        subscriberId: sub.id, source: sub.source, partnerId: sub.partner_id,
    };
}

/** Reissue a confirmation token (expired link page "send a new link"). */
export async function resendConfirmation(rawOldToken: string): Promise<{ email: string; confirmToken: string; changeToken: string } | null> {
    await ensureNewsletterTables();
    const tok = await findToken(rawOldToken, 'confirm');
    if (!tok) return null;
    const res = await query(
        `SELECT id, email, status FROM newsletter_subscribers WHERE id = $1`,
        [tok.subscriber_id]
    );
    const sub = res.rows[0];
    if (!sub || sub.status !== 'pending') return null;
    const confirmToken = await issueToken(sub.id, 'confirm', sub.email);
    const changeToken = await issueToken(sub.id, 'change_email', sub.email);
    await recordNewsletterEvent('confirmation_sent', { resend: true }, sub.id);
    return { email: sub.email, confirmToken, changeToken };
}

// ---------- change email ----------

export type ChangeFlow = 'from-pending' | 'from-confirmed';

/** Look up which change flow a token belongs to (drives the change-email page). */
export async function previewChangeEmail(raw: string): Promise<
    { valid: true; flow: ChangeFlow; currentEmail: string } | { valid: false }
> {
    const tok = await findToken(raw, 'change_email');
    if (!tok || tok.used_at) return { valid: false };
    if (new Date(tok.expires_at) < new Date()) return { valid: false };
    const res = await query(
        `SELECT email, status FROM newsletter_subscribers WHERE id = $1`,
        [tok.subscriber_id]
    );
    const sub = res.rows[0];
    if (!sub) return { valid: false };
    return {
        valid: true,
        flow: sub.status === 'pending' ? 'from-pending' : 'from-confirmed',
        currentEmail: sub.email,
    };
}

export interface ChangeEmailResult {
    ok: boolean;
    error?: string;
    flow?: ChangeFlow;
    oldEmail?: string;
    newEmail?: string;
    confirmToken?: string;
    changeToken?: string;
    subscriberId?: number;
}

/**
 * Change email. From pending: close the old pending record, create a fresh
 * pending one carrying source/referral data. From confirmed: move to
 * email_change_pending; the original first-confirmation time and discount
 * window never change.
 */
export async function requestEmailChange(rawToken: string, rawNewEmail: string): Promise<ChangeEmailResult> {
    await ensureNewsletterTables();
    const tok = await findToken(rawToken, 'change_email');
    if (!tok || tok.used_at) return { ok: false, error: 'This link is not valid anymore' };
    if (new Date(tok.expires_at) < new Date()) return { ok: false, error: 'This link has expired. Request a fresh one from your latest email.' };

    const n = normalizeEmail(rawNewEmail);
    if (!n.valid) return { ok: false, error: 'Enter a valid email address' };
    if (n.disposable) return { ok: false, error: 'This email provider is not supported' };
    if (await isSuppressed(n.email)) return { ok: false, error: 'This address is not available for subscription' };

    const subRes = await query(
        `SELECT id, email, canonical_email, status, change_count_90d, change_count_reset_at
         FROM newsletter_subscribers WHERE id = $1`,
        [tok.subscriber_id]
    );
    const sub = subRes.rows[0] as SubscriberRow | undefined;
    if (!sub) return { ok: false, error: 'This link is not valid anymore' };
    if (n.canonical === (sub.canonical_email ?? sub.email)) {
        return { ok: false, error: 'That is the same address you already use' };
    }

    // Block moving to an address that belongs to another subscriber, current or previous.
    const clash = await query(
        `SELECT 1 FROM newsletter_subscribers WHERE canonical_email = $1 AND id <> $2
         UNION SELECT 1 FROM newsletter_emails WHERE email = $3 AND subscriber_id <> $2`,
        [n.canonical, sub.id, n.email]
    );
    if (clash.rowCount! > 0) {
        return { ok: false, error: 'That address already belongs to a subscriber. Contact support@trademind.bot for help.' };
    }

    if (sub.status === 'pending') {
        // From-pending flow: close old record, carry attribution to the new one.
        await consumeToken(tok.id);
        const old = await query(
            `SELECT experience, source, medium, campaign, referring_issue, referral_id,
                    partner_id, signup_ip, signup_ua
             FROM newsletter_subscribers WHERE id = $1`,
            [sub.id]
        );
        const o = old.rows[0];
        await query(`UPDATE newsletter_subscribers SET status = 'superseded', updated_at = NOW() WHERE id = $1`, [sub.id]);
        await query(
            `UPDATE newsletter_emails SET role = 'previous', retired_at = NOW()
             WHERE subscriber_id = $1 AND role = 'primary'`, [sub.id]
        );
        await query(
            `UPDATE newsletter_discounts SET state = 'revoked', revoked_reason = 'superseded by email change', updated_at = NOW()
             WHERE subscriber_id = $1 AND state = 'not_started'`, [sub.id]
        );

        const insert = await query(
            `INSERT INTO newsletter_subscribers
                (email, canonical_email, experience, consent, status, source, medium, campaign,
                 referring_issue, referral_id, partner_id, consent_version, signup_ip, signup_ua)
             VALUES ($1,$2,$3,TRUE,'pending',$4,$5,$6,$7,$8,$9,$10,$11,$12)
             RETURNING id`,
            [n.email, n.canonical, o.experience, o.source, o.medium, o.campaign,
             o.referring_issue, o.referral_id, o.partner_id, CONSENT_VERSION, o.signup_ip, o.signup_ua]
        );
        const newId = insert.rows[0].id as number;
        await query(
            `INSERT INTO newsletter_emails (subscriber_id, email, role) VALUES ($1, $2, 'primary')`,
            [newId, n.email]
        );
        await query(
            `INSERT INTO newsletter_discounts (subscriber_id, state, personal_code)
             VALUES ($1, 'not_started', $2)`, [newId, newDiscountCode()]
        );
        const confirmToken = await issueToken(newId, 'confirm', n.email);
        const changeToken = await issueToken(newId, 'change_email', n.email);
        await recordNewsletterEvent('email_change_requested', { from: 'pending', to: n.email }, newId);
        return {
            ok: true, flow: 'from-pending', oldEmail: sub.email, newEmail: n.email,
            confirmToken, changeToken, subscriberId: newId,
        };
    }

    if (sub.status === 'confirmed' || sub.status === 'unsubscribed') {
        // From-confirmed flow. Limit: 2 changes per 90 days.
        const resetAt = sub.change_count_reset_at ? new Date(sub.change_count_reset_at) : null;
        const stale = !resetAt || (Date.now() - resetAt.getTime()) > 90 * 864e5;
        const count = stale ? 0 : (sub.change_count_90d ?? 0);
        if (count >= MAX_EMAIL_CHANGES_PER_90D) {
            return { ok: false, error: 'Email can be changed at most 2 times in 90 days. Contact support@trademind.bot.' };
        }
        await consumeToken(tok.id);
        await query(
            `UPDATE newsletter_subscribers
             SET status = 'email_change_pending', pending_email = $2,
                 change_count_90d = $3,
                 change_count_reset_at = COALESCE(change_count_reset_at, NOW()),
                 updated_at = NOW()
             WHERE id = $1`,
            [sub.id, n.email, count + 1]
        );
        await query(
            `INSERT INTO newsletter_emails (subscriber_id, email, role) VALUES ($1, $2, 'pending')`,
            [sub.id, n.email]
        );
        const confirmToken = await issueToken(sub.id, 'change_confirm', n.email);
        await recordNewsletterEvent('email_change_requested', { from: 'confirmed', to: n.email }, sub.id);
        return {
            ok: true, flow: 'from-confirmed', oldEmail: sub.email, newEmail: n.email,
            confirmToken, subscriberId: sub.id,
        };
    }

    return { ok: false, error: 'This subscription is not in a state that allows an email change' };
}

export type ChangeConfirmOutcome = 'done' | 'expired' | 'not-found';

/** Second half of the from-confirmed flow: the new address proves itself. */
export async function confirmEmailChange(rawToken: string): Promise<{ outcome: ChangeConfirmOutcome; email?: string; oldEmail?: string }> {
    await ensureNewsletterTables();
    const tok = await findToken(rawToken, 'change_confirm');
    if (!tok) return { outcome: 'not-found' };
    const res = await query(
        `SELECT id, email, status, pending_email FROM newsletter_subscribers WHERE id = $1`,
        [tok.subscriber_id]
    );
    const sub = res.rows[0];
    if (!sub || sub.status !== 'email_change_pending' || !sub.pending_email) return { outcome: 'not-found' };
    if (tok.used_at) return { outcome: 'not-found' };
    if (new Date(tok.expires_at) < new Date()) return { outcome: 'expired', email: sub.pending_email };

    await consumeToken(tok.id);
    const n = normalizeEmail(sub.pending_email);
    await query(
        `UPDATE newsletter_subscribers
         SET email = $2, canonical_email = $3, status = 'confirmed', pending_email = NULL, updated_at = NOW()
         WHERE id = $1`,
        [sub.id, n.email, n.canonical]
    );
    await query(
        `UPDATE newsletter_emails SET role = 'previous', retired_at = NOW()
         WHERE subscriber_id = $1 AND email = $2 AND role = 'primary'`,
        [sub.id, sub.email]
    );
    await query(
        `UPDATE newsletter_emails SET role = 'primary', confirmed_at = NOW()
         WHERE subscriber_id = $1 AND email = $2 AND role = 'pending'`,
        [sub.id, n.email]
    );
    // The old address can never qualify for another discount.
    await query(
        `INSERT INTO newsletter_suppression (email, reason) VALUES ($1, 'retired_previous_email')
         ON CONFLICT (email) DO NOTHING`,
        [sub.email]
    );
    await recordNewsletterEvent('email_change_confirmed', { from: sub.email, to: n.email }, sub.id);
    return { outcome: 'done', email: n.email, oldEmail: sub.email };
}

/** "This wasn't me": cancel an email change request from the old address notice. */
export async function cancelEmailChange(rawToken: string): Promise<boolean> {
    await ensureNewsletterTables();
    const tok = await findToken(rawToken, 'change_cancel');
    if (!tok || tok.used_at) return false;
    const res = await query(
        `SELECT id, status FROM newsletter_subscribers WHERE id = $1`,
        [tok.subscriber_id]
    );
    if (!res.rows[0] || res.rows[0].status !== 'email_change_pending') return false;
    await consumeToken(tok.id);
    await query(
        `UPDATE newsletter_subscribers SET status = 'confirmed', pending_email = NULL, updated_at = NOW()
         WHERE id = $1`,
        [tok.subscriber_id]
    );
    await query(
        `DELETE FROM newsletter_emails WHERE subscriber_id = $1 AND role = 'pending'`,
        [tok.subscriber_id]
    );
    await recordNewsletterEvent('email_change_cancelled', {}, tok.subscriber_id);
    return true;
}

/** Fresh cancel token for the old-address notice email. */
export async function makeCancelToken(subscriberId: number): Promise<string> {
    return issueToken(subscriberId, 'change_cancel');
}

// ---------- unsubscribe ----------

export async function makeUnsubscribeToken(subscriberId: number): Promise<string> {
    return issueToken(subscriberId, 'unsubscribe');
}

export async function unsubscribeByToken(raw: string): Promise<'done' | 'already' | 'not-found'> {
    await ensureNewsletterTables();
    const tok = await findToken(raw, 'unsubscribe');
    if (!tok) return 'not-found';
    const res = await query(
        `SELECT id, email, status FROM newsletter_subscribers WHERE id = $1`,
        [tok.subscriber_id]
    );
    const sub = res.rows[0];
    if (!sub) return 'not-found';
    if (sub.status === 'unsubscribed') return 'already';
    if (sub.status !== 'confirmed' && sub.status !== 'email_change_pending') return 'not-found';
    await query(
        `UPDATE newsletter_subscribers SET status = 'unsubscribed', unsubscribed_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [sub.id]
    );
    await query(
        `INSERT INTO newsletter_suppression (email, reason) VALUES ($1, 'unsubscribed')
         ON CONFLICT (email) DO NOTHING`,
        [sub.email]
    );
    await recordNewsletterEvent('unsubscribed', {}, sub.id);
    return 'done';
}

// ---------- discount eligibility ----------

export type EligibilityStatus =
    | { state: 'eligible'; until: string; code: string }
    | { state: 'pending' }
    | { state: 'redeemed' }
    | { state: 'expired' }
    | { state: 'revoked' }
    | { state: 'not-found' };

export async function discountForEmail(rawEmail: string): Promise<EligibilityStatus & { subscriberId?: number }> {
    await ensureNewsletterTables();
    const n = normalizeEmail(rawEmail);
    const res = await query(
        `SELECT s.id, s.status, d.state AS dstate, d.window_end, d.personal_code
         FROM newsletter_subscribers s
         LEFT JOIN newsletter_discounts d ON d.subscriber_id = s.id
         WHERE s.email = $1 OR s.canonical_email = $2`,
        [n.email, n.canonical]
    );
    const row = res.rows[0];
    if (!row) return { state: 'not-found' };
    if (row.status === 'pending' || row.status === 'expired_pending') return { state: 'pending', subscriberId: row.id };
    if (!row.dstate) return { state: 'not-found' };
    if (row.dstate === 'redeemed') return { state: 'redeemed', subscriberId: row.id };
    if (row.dstate === 'revoked') return { state: 'revoked', subscriberId: row.id };
    if (row.dstate === 'eligible') {
        const until = new Date(row.window_end);
        if (until < new Date()) {
            await query(
                `UPDATE newsletter_discounts SET state = 'expired', updated_at = NOW()
                 WHERE subscriber_id = $1 AND state = 'eligible'`, [row.id]
            );
            await recordNewsletterEvent('discount_expired', {}, row.id);
            return { state: 'expired', subscriberId: row.id };
        }
        return { state: 'eligible', until: until.toISOString(), code: row.personal_code, subscriberId: row.id };
    }
    return { state: row.dstate === 'expired' ? 'expired' : 'pending', subscriberId: row.id };
}

/** Redeem after a successful annual payment. */
export async function markRedeemed(subscriberId: number, orderId: string, accountId: number): Promise<boolean> {
    await ensureNewsletterTables();
    const res = await query(
        `UPDATE newsletter_discounts
         SET state = 'redeemed', redeemed_at = NOW(), order_id = $2, account_id = $3, updated_at = NOW()
         WHERE subscriber_id = $1 AND state = 'eligible'`,
        [subscriberId, orderId, accountId]
    );
    if (res.rowCount! > 0) {
        await recordNewsletterEvent('discount_redeemed', { orderId, accountId }, subscriberId);
        return true;
    }
    return false;
}

// ---------- events ----------

const ALLOWED_EVENTS = new Set([
    'page_view', 'signup_started', 'signup_submitted', 'share_clicked',
    'offer_cta_clicked', 'deep_link_clicked', 'eligibility_checked',
    'confirmation_sent', 'confirmation_page_viewed', 'subscription_confirmed',
    'confirmation_reminder_sent', 'email_change_requested', 'email_change_confirmed',
    'email_change_cancelled', 'issue_sent', 'issue_opened', 'issue_link_clicked',
    'offer_block_clicked', 'checkout_started_with_eligibility', 'discount_applied',
    'discount_redeemed', 'discount_expired', 'discount_revoked', 'forwarded_subscribe_clicked',
    'unsubscribed', 'bounced', 'complained', 'sparkloop_conversion_reported',
    'pending_expired', 'lifecycle_email_sent',
]);

export async function recordNewsletterEvent(
    event: string,
    meta: Record<string, unknown>,
    subscriberId?: number
): Promise<boolean> {
    if (!ALLOWED_EVENTS.has(event)) return false;
    try {
        await ensureNewsletterTables();
        await query(
            `INSERT INTO newsletter_events (event, subscriber_id, meta) VALUES ($1, $2, $3)`,
            [event, subscriberId ?? null, JSON.stringify(meta ?? {})]
        );
        return true;
    } catch (err) {
        console.error('[newsletter event]', err);
        return false;
    }
}

/** Mark a lifecycle email as sent so daily cron never double-sends. */
export async function markLifecycle(subscriberId: number, key: string): Promise<boolean> {
    const res = await query(
        `UPDATE newsletter_subscribers
         SET lifecycle_marks = lifecycle_marks || $2::jsonb, updated_at = NOW()
         WHERE id = $1 AND NOT (lifecycle_marks ? $3)`,
        [subscriberId, JSON.stringify({ [key]: new Date().toISOString() }), key]
    );
    return res.rowCount! > 0;
}
