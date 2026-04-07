import { query } from './src/lib/db';

async function upgrade() {
    try {
        const res = await query("UPDATE user_settings SET subscription_tier = 'both_bundle' WHERE email LIKE '%erichuang2005%' OR user_id = 'erichuang2005@gmail.com' RETURNING *");
        console.log("Upgraded rows:", res.rows);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
upgrade();
