import { query } from './src/lib/db';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
    try {
        const res = await query(`SELECT strategy, symbol, instrument_type, quantity, leg_action, avg_price FROM shadow_positions`);
        console.log("SHADOW POSITIONS:");
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

run();
