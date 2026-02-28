/**
 * GET /api/turbobounce/signals
 * Returns pending TurboBounce Multi-Ticker signals from the Python backend.
 * Contains advanced structural data (DTE, Delta) for the options builder.
 */

import { NextResponse } from 'next/server';

const PYTHON_API = process.env.EC2_API_URL || process.env.TASTYTRADE_API_URL || 'http://34.235.119.67:8002';

export async function GET() {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        // Fetch from the Python FastAPI backend
        const res = await fetch(`${PYTHON_API}/api/turbobounce/signals`, {
            headers: { Accept: 'application/json' },
            signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!res.ok) {
            return NextResponse.json([], { status: 200 });
        }

        const data = await res.json();
        const signals = Array.isArray(data) ? data : (data.signals ?? []);
        return NextResponse.json(signals);
    } catch {
        return NextResponse.json([], { status: 200 });
    }
}
