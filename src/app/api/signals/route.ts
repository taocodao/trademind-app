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

        // Filter out signals older than 30 minutes
        const SIGNAL_TTL_MS = 30 * 60 * 1000;
        const now = Date.now();
        if (Array.isArray(data)) {
            const fresh = data.filter((s: { created_at?: string; createdAt?: string; status?: string }) => {
                if (s.status && s.status !== 'pending') return true; // Keep executed/rejected
                const createdStr = s.created_at || s.createdAt;
                if (!createdStr) return true; // Keep if no timestamp
                const age = now - new Date(createdStr).getTime();
                return age < SIGNAL_TTL_MS;
            });
            return NextResponse.json({ signals: fresh });
        }

        // If data has a signals array wrapper
        if (data.signals && Array.isArray(data.signals)) {
            const fresh = data.signals.filter((s: { created_at?: string; createdAt?: string; status?: string }) => {
                if (s.status && s.status !== 'pending') return true;
                const createdStr = s.created_at || s.createdAt;
                if (!createdStr) return true;
                const age = now - new Date(createdStr).getTime();
                return age < SIGNAL_TTL_MS;
            });
            return NextResponse.json({ signals: fresh });
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
