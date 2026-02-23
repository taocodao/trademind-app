/**
 * GET /api/tqqq/signals
 * Returns pending TQQQ signals from the Python backend.
 * Filters for strategy=tqqq_vix_adaptive and status=pending.
 */

import { NextResponse } from 'next/server';

const PYTHON_API = process.env.EC2_API_URL || process.env.TASTYTRADE_API_URL || 'http://34.235.119.67:8002';

export async function GET() {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        const res = await fetch(`${PYTHON_API}/api/tqqq/signals`, {
            headers: { Accept: 'application/json' },
            signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!res.ok) {
            return NextResponse.json([], { status: 200 });
        }

        const data = await res.json();
        // Normalise — backend may return array or {signals:[]}
        const signals = Array.isArray(data) ? data : (data.signals ?? []);
        return NextResponse.json(signals);
    } catch {
        return NextResponse.json([], { status: 200 });
    }
}
