#!/bin/bash
# Run on EC2 via: bash /tmp/run_migration.sh
set -e
DB_URL=$(grep DATABASE_URL ~/tastywork-trading/.env | head -1 | sed 's/DATABASE_URL=//' | tr -d '"')
echo "Running migration..."
psql "$DB_URL" -f /tmp/whop_trial_tables.sql
echo "Migration complete."
psql "$DB_URL" -c "\dt" | grep -E "whop|migration" || echo "No whop tables found yet"
