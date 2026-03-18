import { query } from './src/lib/db';

async function run() {
    console.log("--- PENDING SIGNALS ---");
    const signals = await query("SELECT id, strategy, symbol, type, created_at, status FROM signals WHERE status = 'pending' ORDER BY created_at DESC LIMIT 10");
    console.log(signals.rows);

    console.log("--- RECENT EXECUTIONS ---");
    const execs = await query("SELECT use.id, use.signal_id, use.source, s.strategy, use.created_at FROM user_signal_executions use LEFT JOIN signals s ON use.signal_id = s.id ORDER BY use.created_at DESC LIMIT 20");
    console.log(execs.rows);
}
run().then(() => process.exit());
