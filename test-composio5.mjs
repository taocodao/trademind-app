import { Composio } from '@composio/core';
import fs from 'fs';

async function check() {
    try {
        const composio = new Composio({ apiKey: 'x' });
        // Try calling initiate with integrationId
        await composio.connectedAccounts.initiate({
            entityId: 'user_123',
            integrationId: 'ac_test',
            redirectUri: 'https://test.com',
        });
    } catch(e) {
        fs.writeFileSync('out-composio-init3.txt', JSON.stringify({
            message: e.message,
            stack: e.stack,
            cause: e.cause || e
        }, null, 2));
    }
}
check();
