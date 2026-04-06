import { Composio } from '@composio/core';
import fs from 'fs';

async function check() {
    try {
        const composio = new Composio({ apiKey: 'x' }); // dummy key
        // Try calling initiate with a fake config
        await composio.connectedAccounts.initiate({
            entityId: 'user_123',
            authConfigId: 'ac_test',
            redirectUri: 'https://test.com',
        });
    } catch(e) {
        fs.writeFileSync('out-composio-init.txt', e.stack || e.toString());
    }
}
check();
