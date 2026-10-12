import { query } from './src/lib/db';
query(`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(5) DEFAULT 'en'`)
    .then(() => {
        console.log('✅ Migration OK: preferred_language column added');
        process.exit(0);
    })
    .catch(e => {
        console.error('❌ Migration failed:', e.message);
        process.exit(1);
    });
