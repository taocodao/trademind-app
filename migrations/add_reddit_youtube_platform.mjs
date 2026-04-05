import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: 'postgresql://erichuang2005:Ya2039349@travelwise-marketplace-db.curmg864eafo.us-east-1.rds.amazonaws.com:5432/ib_trading',
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE social_connections DROP CONSTRAINT social_connections_platform_check;
      ALTER TABLE social_connections ADD CONSTRAINT social_connections_platform_check CHECK (platform IN ('linkedin','twitter','facebook','instagram','tiktok','snapchat','reddit','youtube'));

      ALTER TABLE social_posts DROP CONSTRAINT social_posts_platform_check;
      ALTER TABLE social_posts ADD CONSTRAINT social_posts_platform_check CHECK (platform IN ('linkedin','twitter','facebook','instagram','tiktok','snapchat','reddit','youtube'));
    `);
    console.log("Constraints updated.");
  } catch(e) {
    console.error(e);
  } finally {
    client.release();
    pool.end();
  }
}
run();
