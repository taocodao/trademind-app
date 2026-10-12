import { createRequire } from 'module';
import { readFileSync } from 'fs';

const require = createRequire(import.meta.url);
const { Pool } = require('pg');

// Read .env.local manually
const envFile = readFileSync('.env.local', 'utf8');
for (const line of envFile.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    process.env[key] = val;
}

console.log('POSTGRES_URL present:', !!process.env.POSTGRES_URL);
console.log('Using:', process.env.POSTGRES_URL?.slice(0, 30) + '...');

const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

try {
    const res = await pool.query(`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(5) DEFAULT 'en'`);
    console.log('✅ Migration OK');
} catch (e) {
    console.error('❌ Migration failed:', e.message, e.code);
    process.exit(1);
} finally {
    await pool.end();
}
