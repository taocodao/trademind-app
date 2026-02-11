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

        const SIGNAL_TTL_MS = 30 * 60 * 1000;
        const now = Date.now();

        const filterFresh = (signals: Array<{ created_at?: string; createdAt?: string; status?: string }>) => {
            return signals.filter(s => {
                if (s.status && s.status !== 'pending') return true; // Keep executed/rejected
                const createdStr = s.created_at || s.createdAt;
                if (!createdStr) return false; // No timestamp = treat as expired
                const age = now - new Date(createdStr).getTime();
                return age < SIGNAL_TTL_MS;
            });
        };

        if (Array.isArray(data)) {
            return NextResponse.json({ signals: filterFresh(data) });
        }

        if (data.signals && Array.isArray(data.signals)) {
            return NextResponse.json({ signals: filterFresh(data.signals) });
        }

        return NextResponse.json(data);

    } catch (error) {
        console.error('Signals API error:', error);
        return NextResponse.json(
            { error: 'Python backend not running. Start: python tasty_api_server.py' },
            { status: 503 }
        );
    }
}
