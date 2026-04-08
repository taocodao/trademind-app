const fs = require('fs');

async function testEndpoints() {
    const key = 'test'; 
    const endpoints = [
        'https://backend.composio.dev/api/v3/connectedAccounts/test',
        'https://backend.composio.dev/api/v3/connected_accounts/test',
        'https://backend.composio.dev/api/v1/connectedAccounts/test',
        'https://backend.composio.dev/api/v2/connectedAccounts/test'
    ];
    
    let results = {};
    for (const url of endpoints) {
        try {
            const res = await fetch(url, { headers: { 'x-api-key': key }});
            results[url] = res.status;
        } catch (err) {
            results[url] = err.message;
        }
    }
    
    fs.writeFileSync('d:/Projects/trademind-app/composio_endpoint_test.json', JSON.stringify(results, null, 2));
}

testEndpoints();
