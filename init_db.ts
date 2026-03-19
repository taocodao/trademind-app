import { initializeUserTables } from './src/lib/db';

async function run() {
  console.log('Running database initialization...');
  await initializeUserTables();
  console.log('Database initialized successfully.');
  process.exit(0);
}

run().catch((err) => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
