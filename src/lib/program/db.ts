import pool from '@/lib/db';

let ensured = false;

export async function ensureProgramTables(): Promise<void> {
    if (ensured) return;
    const q = (sql: string) => pool.query(sql);
    await q(`CREATE TABLE IF NOT EXISTS program_application (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL,
        email_norm TEXT NOT NULL,
        name TEXT,
        role TEXT,
        track TEXT,
        answers JSONB NOT NULL DEFAULT '{}',
        source TEXT,
        status TEXT NOT NULL DEFAULT 'new',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        decided_at TIMESTAMPTZ
    )`);
    await q(`CREATE UNIQUE INDEX IF NOT EXISTS program_application_email_uq ON program_application (email_norm)`);
    await q(`CREATE TABLE IF NOT EXISTS program_participant (
        id SERIAL PRIMARY KEY,
        email_norm TEXT NOT NULL UNIQUE,
        cohort INT NOT NULL DEFAULT 1,
        track TEXT,
        path TEXT NOT NULL DEFAULT 'undecided',
        started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        founding_selected_at TIMESTAMPTZ,
        founding_level TEXT,
        founding_interval TEXT,
        paid_started_at TIMESTAMPTZ,
        stripe_customer_id TEXT,
        left_at TIMESTAMPTZ
    )`);
    await q(`CREATE TABLE IF NOT EXISTS program_activity (
        id SERIAL PRIMARY KEY,
        participant_id INT NOT NULL,
        month INT NOT NULL,
        answers JSONB NOT NULL DEFAULT '{}',
        completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (participant_id, month)
    )`);
    await q(`CREATE TABLE IF NOT EXISTS program_email_log (
        participant_id INT NOT NULL,
        key TEXT NOT NULL,
        sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (participant_id, key)
    )`);
    await q(`CREATE TABLE IF NOT EXISTS offer_grant (
        id SERIAL PRIMARY KEY,
        email_norm TEXT NOT NULL,
        offer TEXT NOT NULL,
        expires_at TIMESTAMPTZ,
        redeemed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (email_norm, offer)
    )`);
    await q(`CREATE TABLE IF NOT EXISTS entitlement (
        id SERIAL PRIMARY KEY,
        email_norm TEXT NOT NULL,
        plan TEXT NOT NULL,
        source TEXT NOT NULL,
        starts_at TIMESTAMPTZ NOT NULL,
        ends_at TIMESTAMPTZ,
        version INT NOT NULL DEFAULT 1,
        UNIQUE (email_norm, source)
    )`);
    await q(`CREATE TABLE IF NOT EXISTS delivery_pref (
        email_norm TEXT PRIMARY KEY,
        mode TEXT NOT NULL DEFAULT 'daily',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
    await q(`CREATE TABLE IF NOT EXISTS consent (
        id SERIAL PRIMARY KEY,
        email_norm TEXT NOT NULL,
        type TEXT NOT NULL,
        version TEXT NOT NULL,
        granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
    ensured = true;
}

export const normEmail = (e: string) => e.trim().toLowerCase();
export const EMAIL_OK = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 254;
