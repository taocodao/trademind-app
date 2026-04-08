import urllib.request
import json
import os
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

# Read API key from env
key = None
with open('.env.production', 'r') as f:
    for line in f:
        if line.startswith('COMPOSIO_API_KEY='):
            key = line.strip().split('=', 1)[1]
            break

urls = [
    'https://backend.composio.dev/api/v3/connectedAccounts',
    'https://backend.composio.dev/api/v3/connected_accounts',
    'https://backend.composio.dev/api/v1/connectedAccounts',
    'https://backend.composio.dev/api/v1/connected_accounts'
]

results = {}
for url in urls:
    req = urllib.request.Request(url, headers={'x-api-key': key})
    try:
        urllib.request.urlopen(req, context=ctx)
        results[url] = "200"
    except urllib.error.HTTPError as e:
        results[url] = str(e.code)
    except Exception as e:
        results[url] = str(e)

with open('composio_real_test.json', 'w') as f:
    json.dump(results, f, indent=2)
