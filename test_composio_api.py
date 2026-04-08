import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

urls = [
    'https://backend.composio.dev/api/v3/connectedAccounts/test',
    'https://backend.composio.dev/api/v3/connected_accounts/test',
    'https://backend.composio.dev/api/v1/connectedAccounts/test',
    'https://backend.composio.dev/api/v1/connected_accounts/test',
    'https://backend.composio.dev/api/v2/connectedAccounts/test',
]

results = {}
for url in urls:
    req = urllib.request.Request(url, headers={'x-api-key': 'x'})
    try:
        urllib.request.urlopen(req, context=ctx)
        results[url] = "200"
    except urllib.error.HTTPError as e:
        results[url] = str(e.code)
    except Exception as e:
        results[url] = str(e)

with open('test_composio_api.json', 'w') as f:
    json.dump(results, f, indent=2)
