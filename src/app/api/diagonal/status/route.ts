/**
 * Proxy route for diagonal/circuit breaker status
 * Avoids mixed content (HTTPS→HTTP) by proxying through the Next.js server
 */

import { NextResponse } from 'next/server';

const PYTHON_API = process.env.TASTYTRADE_API_URL || 'http://34.235.119.67:8002';

// Force dynamic rendering (no static generation)
export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(`${PYTHON_API}/diagonal/status`, {
            signal: controller.signal,
            cache: 'no-store',
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            return NextResponse.json(
                { error: `Backend returned ${response.status}` },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Circuit breaker proxy error:', error);
        return NextResponse.json(
            {
                regime: 'unknown',
                can_trade: true,
                vix: 0,
                vxv: 0,
                diff: 0,
                ratio: 0,
                early_warning: false,
                position_multiplier: 1.0,
                message: 'Circuit breaker data unavailable',
                timestamp: null
            },
            { status: 200 } // Return fallback instead of error
        );
    }
}
