/**
 * POST /api/tqqq/signals/execute
 * Approve & execute a TQQQ signal on Tastytrade — calls Tastytrade REST API
 * directly from Vercel, no EC2 backend needed.
 * Body: { signalId: string, quantity?: number }
 *
 * POST /api/tqqq/signals/track
 * Mark a signal as Track-Only (no broker execution).
 * Body: { signalId: string }
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getTastytradeTokens } from '@/lib/redis';
import { executeTQQQSpread } from '@/lib/tastytrade-api';
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

// ─── Fetch signal from EC2 by ID ─────────────────────────────────────────────
async function getSignalById(signalId: string): Promise<Record<string, any> | null> {
    try {
        const res = await fetch(`${PYTHON_API}/api/tqqq/signals`, {
            headers: { Accept: 'application/json' },
            signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) return null;
        const data = await res.json();
        const signals = Array.isArray(data) ? data : (data.signals ?? []);
        return signals.find((s: any) => s.id === signalId) ?? null;
    } catch {
        return null;
    }
}

// ─── Update signal status on EC2 ─────────────────────────────────────────────
async function updateSignalStatus(signalId: string, status: string, extraData: any = {}): Promise<void> {
    try {
        await fetch(`${PYTHON_API}/api/tqqq/signals/update_status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ signalId, status, ...extraData }),
            signal: AbortSignal.timeout(5000),
        });
    } catch { /* non-critical — signal display update */ }
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
        console.log(`[${action}] userId: ${userId}`);

        // ─── TRACK ONLY — just update status on EC2 ──────────────────────
        if (action === 'track') {
            await updateSignalStatus(signalId, 'track');
            return NextResponse.json({ status: 'tracked', signalId });
        }

        // ─── EXECUTE — call Tastytrade REST API directly ─────────────────
        const tokens = await getTastytradeTokens(userId);
        if (!tokens || !tokens.accessToken || !tokens.accountNumber) {
            console.log(`[execute] No tokens for userId=${userId}`);
            return NextResponse.json(
                { error: 'Tastytrade not linked. Go to Settings → Link Tastytrade.' },
                { status: 401 }
            );
        }

        console.log(`[execute] Tokens found. account=${tokens.accountNumber}`);

        // Fetch the signal data from EC2
        const signal = await getSignalById(signalId);
        if (!signal) {
            return NextResponse.json({ error: 'Signal not found' }, { status: 404 });
        }

        console.log(`[execute] Signal: ${signal.type} ${signal.short_strike}/${signal.long_strike} exp ${signal.expiration}`);

        // Execute directly via Tastytrade REST API
        const result = await executeTQQQSpread(
            tokens.accessToken,
            tokens.accountNumber,
            {
                short_strike: Number(signal.short_strike),
                long_strike: Number(signal.long_strike),
                expiration: String(signal.expiration),
                credit: Number(signal.credit),
                type: String(signal.type || 'PUT_CREDIT'),
                quantity: Number(quantity),
            }
        );

        console.log(`[execute] ✅ Order result:`, result);

        // Update signal status on EC2 (fire-and-forget)
        updateSignalStatus(signalId, 'execute', {
            quantity: Number(quantity),
            fillPrice: Number(signal.credit) // fallback to signal credit since exact execution price is in the order response
        });

        return NextResponse.json({
            status: 'executed',
            order: result,
            signalId,
            message: `Trade executed: ${quantity}x ${signal.type} on TQQQ`,
        });

    } catch (err: any) {
        console.error(`[${action}] Error:`, err?.message);
        return NextResponse.json(
            { error: err?.message || 'Failed to process signal' },
            { status: 500 }
        );
    }
}
