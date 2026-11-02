import pool from '@/lib/db';

let ensured = false;
export async function ensureEditionTables(): Promise<void> {
    if (ensured) return;
    await pool.query(`CREATE TABLE IF NOT EXISTS newsletter_edition (
        id SERIAL PRIMARY KEY,
        kind TEXT NOT NULL,                 -- weekly | daily
        edition_date DATE NOT NULL,
        status TEXT NOT NULL DEFAULT 'draft', -- draft | held | approved | sent
        subject TEXT NOT NULL,
        payload JSONB NOT NULL,              -- public blocks only; no strategy or account fields
        sources JSONB NOT NULL DEFAULT '[]',
        checks JSONB NOT NULL DEFAULT '[]',
        facts_hash TEXT,
        approved_hash TEXT,
        approved_by TEXT,
        approved_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (kind, edition_date)
    )`);
    await pool.query(`CREATE TABLE IF NOT EXISTS newsletter_edition_sends (
        edition_id INT NOT NULL,
        subscriber_id BIGINT NOT NULL,
        account_id BIGINT NOT NULL DEFAULT 0,
        status TEXT NOT NULL,                -- sending | sent | failed
        resend_id TEXT,
        error TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (edition_id, subscriber_id, account_id)
    )`);
    ensured = true;
}
