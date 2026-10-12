import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE social_connections DROP CONSTRAINT social_connections_platform_check;
      ALTER TABLE social_connections ADD CONSTRAINT social_connections_platform_check CHECK (platform IN ('linkedin','twitter','facebook','instagram','tiktok','snapchat'));

      ALTER TABLE social_posts DROP CONSTRAINT social_posts_platform_check;
      ALTER TABLE social_posts ADD CONSTRAINT social_posts_platform_check CHECK (platform IN ('linkedin','twitter','facebook','instagram','tiktok','snapchat'));
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
