import fs from 'fs';

async function fetchConfigs() {
    try {
        const r = await fetch('https://backend.composio.dev/api/v3/auth_configs', {
            headers: { 'x-api-key': 'ak_pri_m24om_nnqUyBcLss' }
        });
        const d = await r.json();
        
        let output = "";
        for (const item of (d.items || [])) {
            const platform = (item.toolkit?.slug || item.name || 'unknown').toUpperCase();
            output += `COMPOSIO_AUTH_CONFIG_${platform}=${item.id}\n`;
        }
        
        fs.writeFileSync('all_configs.txt', output);
    } catch (e) {
        fs.writeFileSync('all_configs.txt', 'Error: ' + e.message);
    }
}
fetchConfigs();
