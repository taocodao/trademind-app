import urllib.request
import urllib.error
import json
import psycopg2
import os

db_url = ''
with open('.env.local') as f:
    for line in f:
        if line.startswith('DATABASE_URL='):
            db_url = line.split('=', 1)[1].strip().strip('\"\'')
            break

def q(sql, args=None):
    conn = psycopg2.connect(db_url, sslmode='require')
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute(sql, args)
    try:
        res = cur.fetchall()
    except psycopg2.ProgrammingError:
        res = None
    cur.close()
    conn.close()
    return res

def post(url, payload=None, headers=None):
    if headers is None: headers = {}
    data = json.dumps(payload).encode('utf-8') if payload else None
    req = urllib.request.Request(url, data=data, headers=headers, method='POST')
    if data: req.add_header('Content-Type', 'application/json')
    try:
        res = urllib.request.urlopen(req)
        raw = res.read().decode('utf-8')
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return raw
    except urllib.error.HTTPError as e:
        return {'error': e.code, 'msg': e.read().decode('utf-8')}

def get(url, headers=None):
    if headers is None: headers = {}
    req = urllib.request.Request(url, headers=headers)
    try:
        res = urllib.request.urlopen(req)
        raw = res.read().decode('utf-8')
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return raw
    except urllib.error.HTTPError as e:
        if e.code == 307 or e.code == 302:
            return {'redirect': e.headers.get('Location')}
        return {'error': e.code, 'msg': e.read().decode('utf-8')}

print('--- Test 1: Publish to Whop ---')
res = post('http://localhost:3000/api/internal/publish-to-whop', {
    "regime": "BULL",
    "confidence": 87,
    "allocation": {"QQQ": 0, "QLD": 40, "TQQQ": 60, "SGOV": 0},
    "reasoning": "Test signal from automated runner",
    "date": "2026-04-28"
}, {"Authorization": "Bearer turbocore-ivs-ec2-2026"})
print('Publish response:', res)

print('--- Test 2A: Webhook member_activated ---')
res = post('http://localhost:3000/api/whop/webhook', {
  "type": "membership_activated",
  "data": {
    "id": "mem_test123",
    "plan_id": "plan_trial_id_here",
    "user": {
      "id": "user_whop_test456",
      "email": "yourtest@gmail.com",
      "name": "Test Trader",
      "username": "testtrader"
    },
    "renewal_period_end": "2026-05-27T00:00:00Z"
  }
})
print('Webhook response:', res)
# Check DB
user = q("SELECT user_id, email, subscription_tier FROM user_settings WHERE whop_user_id = 'user_whop_test456'")
print('User created:', user)

print('--- Test 4: Chat Bot ---')
res = post('http://localhost:3000/api/whop/chat-bot', {
    "content": "!signal",
    "channel_id": "channel_123"
})
print('Chat bot !signal response:', res)

print('--- Test 5: Trial Warning Cron ---')
# Inject trial
q("""
INSERT INTO whop_trials (whop_user_id, whop_member_id, whop_membership_id, email, name, trial_started_at, trial_ends_at)
VALUES (
  'user_warning_test',
  'mem_warning_test',
  'mem_warning_test_ship',
  'yourtest@gmail.com',
  'Warning Test',
  NOW() - INTERVAL '25 days',
  NOW() + INTERVAL '5 days'
) ON CONFLICT DO NOTHING
""")
res = get('http://localhost:3000/api/cron/trial-warning', {"Authorization": "Bearer test"})
print('Trial Warning Cron response:', res)

print('--- Test 2C: Webhook member_deactivated ---')
res = post('http://localhost:3000/api/whop/webhook', {
  "type": "membership_deactivated",
  "data": {
    "id": "mem_test123",
    "user": {
      "id": "user_whop_test456",
      "email": "yourtest@gmail.com",
      "name": "Test Trader"
    }
  }
})
print('Webhook deactivate response:', res)
# Check token
token = q("SELECT token FROM migration_tokens WHERE whop_user_id = 'user_whop_test456' ORDER BY created_at DESC LIMIT 1")
print('Migration token created:', token)

if token:
    print('--- Test 3: Magic Link Migration ---')
    t = token[0][0]
    res = get(f'http://localhost:3000/api/auth/migrate?token={t}')
    print('Migrate response:', res)

print('--- Test 6: Winback Cron ---')
q("INSERT INTO scheduled_messages (user_id, message_type, send_at) VALUES ('user_whop_test456', 'winback', NOW() - INTERVAL '1 minute')")
res = get('http://localhost:3000/api/cron/winback', {"Authorization": "Bearer test"})
print('Winback Cron response:', res)

