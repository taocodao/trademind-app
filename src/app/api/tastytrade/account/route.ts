/**
 * Tastytrade Account API Route
 * Proxies to Python backend server that uses the SDK
 */

import { NextResponse } from 'next/server';

// Python backend server (uses working SDK)
const PYTHON_API = process.env.TASTYTRADE_API_URL || 'http://localhost:8002';

export async function GET() {
    try {
        // Proxy to Python backend
        const response = await fetch(`${PYTHON_API}/api/account`, {
            headers: {
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Python API error:', response.status, errorText);
            return NextResponse.json(
                { error: `Backend error: ${response.status}` },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error) {
        console.error('Tastytrade API error:', error);

        // Check if it's a connection error
        if (error instanceof Error && error.message.includes('fetch')) {
            return NextResponse.json(
                { error: 'Python backend not running. Start: python tasty_api_server.py' },
                { status: 503 }
            );
        }

        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

