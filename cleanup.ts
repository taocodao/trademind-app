import { query } from './src/lib/db';

async function cleanupDuplicates() {
    console.log("Starting DB duplicate cleanup...");
    
    try {
        // Find duplicate pending signals
        const res = await query(`
            WITH duplicates AS (
                SELECT id,
                       ROW_NUMBER() OVER (
                           PARTITION BY symbol, type, strategy, CAST(created_at AS DATE)
                           ORDER BY created_at DESC
                       ) as rn
                FROM signals
                WHERE status = 'pending'
            )
            DELETE FROM signals
            WHERE id IN (
                SELECT id FROM duplicates WHERE rn > 1
            )
            RETURNING id, strategy;
        `);
        
        console.log(`Deleted ${res.rowCount} duplicate pending signals.`);
        console.log(res.rows);
    } catch (e) {
        console.error("Error during DB cleanup:", e);
    } finally {
        process.exit();
    }
}

cleanupDuplicates();
