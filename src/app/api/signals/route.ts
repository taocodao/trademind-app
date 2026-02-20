/**
 * Signals API Route
 * Proxies to Python backend for calendar spread signals
 */

import { NextResponse } from 'next/server';

const PYTHON_API = process.env.EC2_API_URL || process.env.TASTYTRADE_API_URL || 'http://34.235.119.67:8002';

export async function GET() {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

        const response = await fetch(`${PYTHON_API}/api/signals`, {
            headers: { 'Accept': 'application/json' },
            signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
            return NextResponse.json(
                { error: `Backend error: ${response.status}` },
                { status: response.status }
            );
        }

        const data = await response.json();

        // Pass through signals directly - client-side handles freshness filtering
        if (Array.isArray(data)) {
            return NextResponse.json({ signals: data });
        }

        if (data.signals && Array.isArray(data.signals)) {
            return NextResponse.json({ signals: data.signals, total: data.total, source: data.source });
        }

        return NextResponse.json(data);

    } catch (error: any) {
        console.error('Signals API error:', error?.message || error);

        // Return empty signals instead of error so UI doesn't crash
        return NextResponse.json(
            { signals: [], error: 'Backend timeout or unavailable', source: 'fallback' },
            { status: 200 }
        );
    }
}
