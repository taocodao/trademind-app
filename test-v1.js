async function check() {
    const url = `https://backend.composio.dev/api/v1/connectedAccounts`;
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': 'test'
        },
        body: JSON.stringify({
            authConfigId: 'ac_test',
            userId: 'user_123',
            redirectUri: 'https://test.com',
        }),
    });
    console.log("Status:", res.status);
    console.log("Body:", await res.text());
}
check();
