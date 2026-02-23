/**
 * GET /api/tqqq/status
 * Returns TQQQ strategy status: VIX, regime, can_trade, tqqq_price
 * Proxies to Python backend at /api/tqqq/status
 */

import { NextResponse } from 'next/server';

const PYTHON_API = process.env.EC2_API_URL || process.env.TASTYTRADE_API_URL || 'http://34.235.119.67:8002';

export async function GET() {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        const res = await fetch(`${PYTHON_API}/api/tqqq/status`, {
            headers: { Accept: 'application/json' },
            signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!res.ok) {
            return NextResponse.json({ error: `Backend error: ${res.status}` }, { status: res.status });
        }
        return NextResponse.json(await res.json());
    } catch {
        // Return a sensible fallback so the banner degrades gracefully
        return NextResponse.json({
            regime: 'UNKNOWN',
            can_trade: false,
            vix: 0,
            vix_direction: 'STABLE',
            tqqq_price: 0,
            position_multiplier: 1,
            early_warning: false,
            message: 'Status unavailable — backend offline',
            timestamp: null,
        }, { status: 200 });
    }
}
