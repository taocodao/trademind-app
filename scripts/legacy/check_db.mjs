import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function check() {
  try {
    const res = await pool.query(
      `SELECT user_id, subscription_tier, stripe_customer_id, stripe_subscription_id,
              subscription_status, billing_interval, current_period_end, trial_end, updated_at
       FROM user_settings ORDER BY updated_at DESC NULLS LAST LIMIT 10`
    );
    console.log('All rows:');
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
check();
