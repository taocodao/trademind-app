/**
 * Signals API Route
 * Proxies to Python backend for calendar spread signals
 */

import { NextResponse } from 'next/server';

const PYTHON_API = process.env.TASTYTRADE_API_URL || 'http://34.235.119.67:8002';

export async function GET() {
    try {
        const response = await fetch(`${PYTHON_API}/api/signals`, {
            headers: { 'Accept': 'application/json' },
        });

        if (!response.ok) {
            return NextResponse.json(
                { error: `Backend error: ${response.status}` },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error) {
        console.error('Signals API error:', error);
        return NextResponse.json(
            { error: 'Python backend not running. Start: python tasty_api_server.py' },
            { status: 503 }
        );
    }
}
