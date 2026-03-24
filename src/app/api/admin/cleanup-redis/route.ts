import { NextResponse } from 'next/server';

export async function GET() {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
        return NextResponse.json({ error: 'UPSTASH_REDIS credentials missing' }, { status: 500 });
    }

    const key = 'tastytrade:default-user';
    const logs: string[] = [];

    try {
        // 1. Check if it exists and read it
        const getResp = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const getBody = await getResp.json();

        if (getBody.result === null) {
            logs.push(`✅ Key "${key}" does not exist (already clean).`);
            return NextResponse.json({ status: 'clean', logs });
        }

        try {
            const stored = typeof getBody.result === 'string' 
                ? JSON.parse(getBody.result) 
                : getBody.result;
            logs.push(`🔑 Found key "${key}" linked to TT account: ${stored.accountNumber || 'unknown'}, username: ${stored.username || 'unknown'}`);
        } catch {
            logs.push(`🔑 Found key "${key}" (could not parse value).`);
        }

        // 2. Delete it
        const delResp = await fetch(`${url}/del/${encodeURIComponent(key)}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` }
        });
        const delBody = await delResp.json();

        if (delBody.result === 1) {
            logs.push(`✅ Deleted key: "${key}"`);
        } else {
            logs.push(`❌ Failed to delete: "${key}" - ${JSON.stringify(delBody)}`);
        }

        return NextResponse.json({ 
            status: 'success', 
            message: 'Cleanup complete. Users must reconnect Tastytrade in Settings.',
            logs 
        });

    } catch (error) {
        return NextResponse.json({ 
            error: 'Cleanup failed', 
            details: error instanceof Error ? error.message : String(error) 
        }, { status: 500 });
    }
}
