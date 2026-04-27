import psycopg2, os
db_url = ''
with open(os.path.expanduser('d:/Projects/tastywork-trading-1/.env')) as f:
    for line in f:
        if line.startswith('DATABASE_URL='):
            db_url = line.split('=', 1)[1].strip().strip('\"\'')
conn = psycopg2.connect(db_url, sslmode='require')
cur = conn.cursor()
cur.execute('SELECT * FROM whop_posts ORDER BY created_at DESC LIMIT 1')
row = cur.fetchone()
print(row)
cur.close()
conn.close()
