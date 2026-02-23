/**
 * POST /api/tqqq/signals/execute
 * Approve & execute a TQQQ signal on Tastytrade.
 * Body: { signalId: string }
 *
 * POST /api/tqqq/signals/track
 * Mark a signal as Track-Only (no broker execution).
 * Body: { signalId: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const PYTHON_API = process.env.EC2_API_URL || 'http://34.235.119.67:8002';

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

// ─── POST /api/tqqq/signals/execute ──────────────────────────────────────────
export async function POST(request: NextRequest) {
    const { pathname } = new URL(request.url);
    const action = pathname.endsWith('/track') ? 'track' : 'execute';

    try {
        const body = await request.json().catch(() => ({}));
        const { signalId } = body as { signalId?: string };

        if (!signalId) {
            return NextResponse.json({ error: 'signalId required' }, { status: 400 });
        }

        const userId = await getPrivyUserId();

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        const backendPath = action === 'execute'
            ? `/api/tqqq/signals/execute`
            : `/api/tqqq/signals/track`;

        const res = await fetch(`${PYTHON_API}${backendPath}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ signalId, userId }),
            signal: controller.signal,
        });
        clearTimeout(timeout);

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            return NextResponse.json(
                { error: data.error || `Backend error: ${res.status}` },
                { status: res.status }
            );
        }
        return NextResponse.json(data);
    } catch (err: any) {
        return NextResponse.json(
            { error: err?.message || 'Failed to process signal' },
            { status: 500 }
        );
    }
}
