/**
 * POST /api/tqqq/signals/execute
 * Approve & execute a TQQQ signal on Tastytrade.
 * Body: { signalId: string }
 *
 * POST /api/tqqq/signals/track
 * Mark a signal as Track-Only (no broker execution).
 * Body: { signalId: string }
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getTastytradeTokens } from '@/lib/redis';
import { cookies } from 'next/headers';

const PYTHON_API = process.env.EC2_API_URL || process.env.TASTYTRADE_API_URL || 'http://34.235.119.67:8002';

// ─── Helper: extract Privy userId ────────────────────────────────────────────
async function getPrivyUserId(): Promise<string> {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('privy-token')?.value;
        if (token) {
            const payload = token.split('.')[1];
            const decoded = JSON.parse(Buffer.from(payload, 'base64').toString());
            return decoded.sub || decoded.userId || 'default-user';
        }
    } catch { /* ignore */ }
    return 'default-user';
}

// ─── POST /api/tqqq/signals/[action] ─────────────────────────────────────────
export async function POST(request: NextRequest) {
    const { pathname } = new URL(request.url);
    const action = pathname.endsWith('/track') ? 'track' : 'execute';

    try {
        const body = await request.json().catch(() => ({}));
        const { signalId, quantity = 1 } = body;

        if (!signalId) {
            return NextResponse.json({ error: 'signalId required' }, { status: 400 });
        }

        const userId = await getPrivyUserId();
        console.log(`[${action}] userId resolved to: ${userId}`);

        // Prepare the payload for Python
        const backendPayload: any = { signalId, userId };

        // For execution, we need OAuth tokens
        if (action === 'execute') {
            let tokens = null;
            try {
                tokens = await getTastytradeTokens(userId);
            } catch (redisErr: any) {
                console.error('[execute] Redis error fetching tokens:', redisErr?.message);
                return NextResponse.json({ error: `Redis error: ${redisErr?.message}` }, { status: 500 });
            }

            if (!tokens || !tokens.refreshToken) {
                console.log(`[execute] No tokens for userId=${userId}`);
                return NextResponse.json({ error: 'Tastytrade not linked or missing refresh token' }, { status: 401 });
            }

            console.log(`[execute] Tokens found. accountNumber=${tokens.accountNumber}`);
            backendPayload.quantity = quantity;
            backendPayload.refreshToken = tokens.refreshToken;
            backendPayload.accountNumber = tokens.accountNumber;
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);

        const backendPath = `/api/tqqq/signals/${action}`;
        console.log(`[${action}] Calling EC2: POST ${PYTHON_API}${backendPath}`);

        let res: Response;
        try {
            res = await fetch(`${PYTHON_API}${backendPath}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(backendPayload),
                signal: controller.signal,
            });
        } catch (fetchErr: any) {
            clearTimeout(timeout);
            const isTimeout = fetchErr?.name === 'AbortError';
            console.error(`[${action}] EC2 fetch failed (timeout=${isTimeout}):`, fetchErr?.message);
            return NextResponse.json(
                { error: isTimeout ? 'Trade execution timed out — Tastytrade session creation is slow. Try again.' : `EC2 unreachable: ${fetchErr?.message}` },
                { status: 504 }
            );
        }
        clearTimeout(timeout);

        console.log(`[${action}] EC2 responded: ${res.status}`);
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            return NextResponse.json(
                { error: data.error || `Backend error: ${res.status}` },
                { status: res.status }
            );
        }
        return NextResponse.json(data);
    } catch (err: any) {
        console.error(`[${action}] Unexpected error:`, err?.message, err?.stack?.slice(0, 300));
        return NextResponse.json(
            { error: err?.message || 'Failed to process signal' },
            { status: 500 }
        );
    }
}
