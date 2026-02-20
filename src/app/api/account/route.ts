/**
 * Account API Route
 * Proxies to Python backend for account balance/buying power data
 */

import { NextResponse } from 'next/server';

const PYTHON_API = process.env.EC2_API_URL || process.env.TASTYTRADE_API_URL || 'http://34.235.119.67:8002';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);

        const response = await fetch(`${PYTHON_API}/api/account`, {
            signal: controller.signal,
            cache: 'no-store',
            headers: { 'Accept': 'application/json' },
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
        console.error('Account proxy error:', error);
        return NextResponse.json(
            {
                buyingPower: 0,
                netLiquidatingValue: 0,
                balance: 0,
                positionCount: 0,
                positions: [],
                error: 'Account data unavailable'
            },
            { status: 200 } // Return fallback instead of error
        );
    }
}
