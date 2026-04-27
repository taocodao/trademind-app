#!/usr/bin/env python3
"""Run the Whop trial tables migration as a single SQL block."""
import os, sys

env_path = os.path.expanduser('~/tastywork-trading/.env')
db_url = None
with open(env_path) as f:
    for line in f:
        line = line.strip()
        if line.startswith('DATABASE_URL='):
            db_url = line[len('DATABASE_URL='):].strip('"').strip("'")
            break

if not db_url:
    print('ERROR: DATABASE_URL not found in .env'); sys.exit(1)

print(f'Connecting to DB...')
import psycopg2

sql = open('/tmp/whop_trial_tables.sql').read()

conn = psycopg2.connect(db_url, sslmode='require')
conn.autocommit = True
cur = conn.cursor()

try:
    cur.execute(sql)
    print('SQL block executed successfully.')
except Exception as e:
    print(f'ERROR executing SQL block: {e}')
    sys.exit(1)

# Verify
cur.execute("""
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN ('whop_trials','migration_tokens','scheduled_messages','whop_events','whop_posts')
    ORDER BY table_name
""")
tables = [r[0] for r in cur.fetchall()]
print(f'Tables present: {tables}')

if len(tables) == 5:
    print('✅ All 5 tables created successfully!')
else:
    missing = set(['whop_trials','migration_tokens','scheduled_messages','whop_events','whop_posts']) - set(tables)
    print(f'⚠️  Missing tables: {missing}')

cur.close()
conn.close()
