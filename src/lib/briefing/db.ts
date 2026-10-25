import pool from '@/lib/db';

let ensured = false;

export async function ensureBriefingTables(): Promise<void> {
    if (ensured) return;
    await pool.query(`
        CREATE TABLE IF NOT EXISTS facts_run (
            run_id TEXT PRIMARY KEY,
            run_date DATE NOT NULL UNIQUE,
            payload JSONB NOT NULL,
            hash TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`);
    await pool.query(`
        CREATE TABLE IF NOT EXISTS briefing_issue (
            id SERIAL PRIMARY KEY,
            run_date DATE NOT NULL,
            kind TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'draft',
            subject TEXT NOT NULL,
            text_body TEXT NOT NULL,
            html_body TEXT NOT NULL,
            commentary TEXT,
            status_only BOOLEAN NOT NULL DEFAULT FALSE,
            checks JSONB NOT NULL DEFAULT '[]',
            facts_hash TEXT NOT NULL,
            internal_only BOOLEAN NOT NULL DEFAULT TRUE,
            reviewed_by TEXT,
            reviewed_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE (run_date, kind)
        )`);
    await pool.query(`
        CREATE TABLE IF NOT EXISTS briefing_edit (
            id SERIAL PRIMARY KEY,
            issue_id INT NOT NULL,
            at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            who TEXT NOT NULL,
            action TEXT NOT NULL,
            before_text TEXT,
            after_text TEXT
        )`);
    await pool.query(`
        CREATE TABLE IF NOT EXISTS engine_heartbeat (
            strategy TEXT NOT NULL,
            run_date DATE NOT NULL,
            ok BOOLEAN NOT NULL,
            reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            note TEXT,
            PRIMARY KEY (strategy, run_date)
        )`);
    ensured = true;
}
