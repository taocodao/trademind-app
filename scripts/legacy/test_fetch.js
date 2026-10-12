const fs = require('fs');
try {
    let key;
    try {
        const envStr = fs.readFileSync('.env.production', 'utf8');
        key = envStr.split('\n').find(l => l.startsWith('COMPOSIO_API_KEY=')).split('=')[1].trim().replace(/"/g, '');
    } catch(e) {
        const envStr = fs.readFileSync('.env.local', 'utf8');
        key = envStr.split('\n').find(l => l.startsWith('COMPOSIO_API_KEY=')).split('=')[1].trim().replace(/"/g, '');
    }

    const url = 'https://backend.composio.dev/api/v3.1/tools/execute/LINKEDIN_CREATE_LINKED_IN_POST';

    fetch(url, {
        method: 'POST',
        headers: { 'x-api-key': key, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            connected_account_id: 'ca_eQb2G0INmj1a',
            arguments: { text: 'Hello world' }
        })
    }).then(async res => {
        const text = await res.text();
        fs.writeFileSync('composio_debug.txt', `STATUS: ${res.status}\nBODY: ${text}`);
    }).catch(e => {
        fs.writeFileSync('composio_debug.txt', `EXCEPTION: ${e.message}`);
    });
} catch (globalErr) {
    fs.writeFileSync('composio_debug.txt', `GLOBAL EXCEPTION: ${globalErr.message}\n${globalErr.stack}`);
}
