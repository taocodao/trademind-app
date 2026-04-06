import { Composio } from '@composio/core';
import fs from 'fs';

async function check() {
    try {
        const composio = new Composio({ apiKey: 'x' });
        // Try calling initiate with a fake config
        await composio.connectedAccounts.initiate({
            userId: 'user_123',
            authConfigId: 'ac_test',
            redirectUri: 'https://test.com',
        });
    } catch(e) {
        fs.writeFileSync('out-composio-init2.txt', JSON.stringify({
            message: e.message,
            stack: e.stack,
            cause: e.cause || e
        }, null, 2));
    }
}
check();
