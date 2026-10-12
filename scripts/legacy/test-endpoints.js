const testEndpoints = [
    'api/v1/connectedAccounts/initiate',
    'api/v1/connectedAccounts',
    'api/v2/connectedAccounts',
    'api/v3/connectedAccounts',
    'api/v1/toolkits/auth/initiate',
];

async function check() {
    for (const ep of testEndpoints) {
        console.log("Testing:", ep);
        const url = `https://backend.composio.dev/${ep}`;
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({}),
        });
        console.log(`Status for ${ep}:`, res.status);
    }
}
check();
