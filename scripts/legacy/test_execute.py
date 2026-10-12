import urllib.request
import json
import os
import ssl
import sys

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

key = None
with open('.env.production', 'r') as f:
    for line in f:
        if line.startswith('COMPOSIO_API_KEY='):
            key = line.strip().split('=', 1)[1]
            break

url = 'https://backend.composio.dev/api/v3.1/tools/execute/LINKEDIN_CREATE_LINKED_IN_POST'
payload = json.dumps({
    "connected_account_id": "ca_eQb2G0INmj1a",
    "arguments": {
        "text": "Hello world from TradeMind!"
    }
}).encode('utf-8')

req = urllib.request.Request(url, data=payload, headers={'x-api-key': key, 'Content-Type': 'application/json'}, method='POST')

try:
    with urllib.request.urlopen(req, context=ctx) as res:
        with open('exec_result.txt', 'w', encoding='utf-8') as f:
            f.write(f"Success: {res.read().decode('utf-8')}")
except urllib.error.HTTPError as e:
    with open('exec_result.txt', 'w', encoding='utf-8') as f:
        f.write(f"Error {e.code}: {e.read().decode('utf-8')}")
except Exception as e:
    with open('exec_result.txt', 'w', encoding='utf-8') as f:
        f.write(f"Exception: {e}")
