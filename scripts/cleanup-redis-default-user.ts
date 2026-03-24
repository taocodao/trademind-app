/**
 * Cleanup script: deletes the shared "tastytrade:default-user" Redis key
 * that was created when Privy token decoding failed during OAuth callbacks.
 * 
 * Run: npx ts-node --skip-project scripts/cleanup-redis-default-user.ts
 * OR:  node -r ts-node/register scripts/cleanup-redis-default-user.ts
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

async function cleanup() {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
        console.error('❌ UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not set in .env.local');
        process.exit(1);
    }

    const keysToDelete = [
        'tastytrade:default-user',
    ];

    for (const key of keysToDelete) {
        // GET first so we can show what we're deleting
        const getResp = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const getBody = await getResp.json();
        
        if (getBody.result === null) {
            console.log(`✅ Key "${key}" does not exist (already clean).`);
            continue;
        }

        // Parse stored data to show which TT account was linked
        try {
            const stored = typeof getBody.result === 'string' 
                ? JSON.parse(getBody.result) 
                : getBody.result;
            console.log(`🔑 Found key "${key}" linked to TT account: ${stored.accountNumber || 'unknown'}, username: ${stored.username || 'unknown'}`);
        } catch {
            console.log(`🔑 Found key "${key}" (could not parse value).`);
        }

        // DELETE
        const delResp = await fetch(`${url}/del/${encodeURIComponent(key)}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` }
        });
        const delBody = await delResp.json();
        
        if (delBody.result === 1) {
            console.log(`✅ Deleted key: "${key}"`);
        } else {
            console.error(`❌ Failed to delete: "${key}"`, delBody);
        }
    }

    console.log('\nDone. Users must reconnect Tastytrade in Settings to re-establish their individual connection.');
}

cleanup().catch(console.error);
