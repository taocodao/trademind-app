import fs from 'fs';
let key = process.env.COMPOSIO_API_KEY;
if (!key && fs.existsSync('.env.production')) {
    const env = fs.readFileSync('.env.production', 'utf8');
    key = env.split('\n').find(l => l.startsWith('COMPOSIO_API_KEY='))?.split('=')[1]?.trim();
}
if (!key && fs.existsSync('.env.local')) {
    const env = fs.readFileSync('.env.local', 'utf8');
    key = env.split('\n').find(l => l.startsWith('COMPOSIO_API_KEY='))?.split('=')[1]?.trim();
}
if (!key) throw new Error('No key found!');

const url = 'https://backend.composio.dev/api/v3.1/tools/execute/LINKEDIN_CREATE_LINKED_IN_POST';
fetch(url, {
    method: 'POST',
    headers: { 'x-api-key': key.replace(/"/g, ''), 'Content-Type': 'application/json' },
    body: JSON.stringify({
        connected_account_id: 'ca_eQb2G0INmj1a',
        arguments: { text: 'Hello world' }
    })
}).then(async res => {
    const text = await res.text();
    fs.writeFileSync('exec_result.txt', `STATUS: ${res.status}\nBODY: ${text}`);
}).catch(e => {
    fs.writeFileSync('exec_result.txt', `EXCEPTION: ${e.message}`);
});
