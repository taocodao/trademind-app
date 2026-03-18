import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: 'postgresql://erichuang2005:Ya2039349@travelwise-marketplace-db.curmg864eafo.us-east-1.rds.amazonaws.com:5432/ib_trading',
  ssl: { rejectUnauthorized: false },
});

async function fix() {
  try {
    // User subscribed to Both Bundle - Monthly at 2:40 PM
    const res = await pool.query(
      `UPDATE user_settings 
       SET subscription_tier = 'both_bundle',
           subscription_status = 'trialing',
           billing_interval = 'month',
           updated_at = NOW()
       WHERE stripe_customer_id = 'cus_U9cobUlCCyHnIx'
       RETURNING user_id, subscription_tier, subscription_status, billing_interval, stripe_customer_id`
    );
    console.log('Updated:', res.rows);

    const check = await pool.query(
      `SELECT user_id, subscription_tier, stripe_customer_id, subscription_status, billing_interval, updated_at FROM user_settings ORDER BY updated_at DESC NULLS LAST`
    );
    console.table(check.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
fix();
