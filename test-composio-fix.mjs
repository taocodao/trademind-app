import { Composio } from '@composio/core';
import fs from 'fs';

async function test() {
    const composio = new Composio({ apiKey: 'ak_pri_m24om_nnqUyBcLss' });
    try {
        const req = await composio.createConnectedAccount(
            'test_user_123',
            'ac_zLliAJlO9V0G',
            { redirectUrl: 'https://trademind.bot/settings/social-connections' }
        );
        fs.writeFileSync('out3.txt', "Success! Redirect URL: " + req.redirectUrl);
    } catch (e) {
        fs.writeFileSync('out3.txt', "Error! " + e.message);
    }
}
test();
