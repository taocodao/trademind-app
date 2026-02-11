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

        // Filter signals: expire at market close (4:00 PM ET) on creation day
        const MARKET_CLOSE_HOUR_ET = 16;

        const getMarketCloseTime = (date: Date): number => {
            const year = date.getFullYear();
            const month = date.getMonth();
            const day = date.getDate();
            const marketClose = new Date(year, month, day, MARKET_CLOSE_HOUR_ET, 0, 0, 0);
            const etOffset = 5 * 60 * 60 * 1000;
            const localOffset = marketClose.getTimezoneOffset() * 60 * 1000;
            return marketClose.getTime() - localOffset - etOffset;
        };

        const isExpired = (createdStr: string | undefined): boolean => {
            if (!createdStr) return true; // No timestamp = expired
            const createdTime = new Date(createdStr).getTime();
            const marketClose = getMarketCloseTime(new Date(createdTime));
            return Date.now() > marketClose;
        };

        const filterFresh = (signals: Array<{ created_at?: string; createdAt?: string; status?: string }>) => {
            return signals.filter(s => {
                if (s.status && s.status !== 'pending') return true; // Keep executed/rejected
                const createdStr = s.created_at || s.createdAt;
                return !isExpired(createdStr);
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
