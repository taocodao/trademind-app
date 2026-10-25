import pool from '@/lib/db';

let ready: Promise<void> | null = null;
export function ensureStartTables(): Promise<void> {
    if (!ready) {
        ready = (async () => {
            await pool.query(`CREATE TABLE IF NOT EXISTS start_response (
                id BIGSERIAL PRIMARY KEY, token TEXT NOT NULL, kind TEXT NOT NULL, value TEXT NOT NULL, note TEXT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
            await pool.query(`CREATE INDEX IF NOT EXISTS start_response_token_idx ON start_response (token, kind)`);
            await pool.query(`CREATE TABLE IF NOT EXISTS start_submission (
                id BIGSERIAL PRIMARY KEY, kind TEXT NOT NULL, name TEXT, email TEXT NOT NULL, body TEXT NOT NULL,
                public_credit BOOLEAN NOT NULL DEFAULT FALSE, token TEXT, status TEXT NOT NULL DEFAULT 'new',
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
        })().catch((e) => { ready = null; throw e; });
    }
    return ready;
}
