import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: 'postgresql://erichuang2005:Ya2039349@travelwise-marketplace-db.curmg864eafo.us-east-1.rds.amazonaws.com:5432/ib_trading',
  ssl: { rejectUnauthorized: false },
});

const checks = [
  { label: 'social_connections table',     sql: `SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'social_connections'` },
  { label: 'social_posts table',           sql: `SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'social_posts'` },
  { label: 'creator_applications table',   sql: `SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'creator_applications'` },
  { label: 'user_settings.referral_code',  sql: `SELECT COUNT(*) FROM information_schema.columns WHERE table_name='user_settings' AND column_name='referral_code'` },
  { label: 'user_settings.referral_tier',  sql: `SELECT COUNT(*) FROM information_schema.columns WHERE table_name='user_settings' AND column_name='referral_tier'` },
  { label: 'user_settings.is_creator',     sql: `SELECT COUNT(*) FROM information_schema.columns WHERE table_name='user_settings' AND column_name='is_creator'` },
  { label: 'user_settings.hdyhau',         sql: `SELECT COUNT(*) FROM information_schema.columns WHERE table_name='user_settings' AND column_name='hdyhau'` },
  { label: 'user_settings.utm_source',     sql: `SELECT COUNT(*) FROM information_schema.columns WHERE table_name='user_settings' AND column_name='utm_source'` },
];

const client = await pool.connect();
console.log('\nVerifying migration results:\n');
let allOk = true;
for (const c of checks) {
  const res = await client.query(c.sql);
  const exists = parseInt(res.rows[0].count) > 0;
  if (!exists) allOk = false;
  console.log(`  ${exists ? '✅' : '❌'} ${c.label}`);
}
client.release();
await pool.end();
console.log(allOk ? '\n  🎉 All tables and columns present!\n' : '\n  ⚠️  Some items missing — re-run the migration.\n');
process.exit(allOk ? 0 : 1);
