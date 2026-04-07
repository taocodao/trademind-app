import fs from 'fs';

async function fetchConfigs() {
    try {
        const r = await fetch('https://backend.composio.dev/api/v3/auth_configs', {
            headers: { 'x-api-key': 'ak_pri_m24om_nnqUyBcLss' }
        });
        const d = await r.json();
        const twitterConfigs = d.items?.filter(x => x.toolkit?.slug?.toLowerCase().includes('twitter') || x.platform?.toLowerCase().includes('twitter'));
        fs.writeFileSync('twitter_configs.json', JSON.stringify(twitterConfigs, null, 2));
    } catch (e) {
        fs.writeFileSync('twitter_configs.json', JSON.stringify({ error: e.message }));
    }
}
fetchConfigs();
