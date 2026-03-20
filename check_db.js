require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        console.log("=== SHADOW POSITIONS ===");
        const res1 = await pool.query("SELECT id, strategy, symbol, quantity, avg_price FROM shadow_positions ORDER BY executed_at DESC LIMIT 10");
        console.table(res1.rows);

        console.log("\n=== RECENT SIGNALS ===");
        const res2 = await pool.query("SELECT id, symbol, strategy, status, direction FROM signals ORDER BY id DESC LIMIT 10");
        console.table(res2.rows);
        
        console.log("\n=== RECENT EXECUTIONS ===");
        const res3 = await pool.query("SELECT id, signal_id, status FROM user_signal_executions ORDER BY executed_at DESC LIMIT 10");
        console.table(res3.rows);

    } catch(e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

run();
