import urllib.request
import json
import ssl
import sys

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

key = None
with open('.env.production', 'r') as f:
    for line in f:
        if line.startswith('COMPOSIO_API_KEY='):
            key = line.strip().split('=', 1)[1].strip('"\'')
            break

if not key:
    print('Failed to find COMPOSIO_API_KEY')
    sys.exit(1)

req = urllib.request.Request('https://backend.composio.dev/api/v3.1/actions/executions?limit=5', headers={'x-api-key': key})
try:
    with urllib.request.urlopen(req, context=ctx) as resp:
        data = resp.read()
        with open('composio_executions.json', 'w') as f:
            json.dump(json.loads(data), f, indent=2)
        print('Logs saved to composio_executions.json')
except Exception as e:
    print('Script Error:', e)
