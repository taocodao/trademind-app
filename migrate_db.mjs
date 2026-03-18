import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: 'postgresql://erichuang2005:Ya2039349@travelwise-marketplace-db.curmg864eafo.us-east-1.rds.amazonaws.com:5432/ib_trading',
  ssl: { rejectUnauthorized: false },
});

async function migrate() {
  try {
    const res = await pool.query(`
      ALTER TABLE user_settings 
      ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS cancel_at TIMESTAMPTZ;
    `);
    console.log('Migration successful:', res.command);
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await pool.end();
  }
}
migrate();
