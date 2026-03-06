import { NextResponse } from 'next/server';
import { getPendingSignals } from '@/lib/db';

export const maxDuration = 35;

export async function GET() {
    try {
        console.log('[Signals API] Fetching directly from RDS...');
        const start = Date.now();

        // Fetch directly from RDS (shared with EC2)
        const signals = await getPendingSignals();

        const duration = Date.now() - start;
        console.log(`[Signals API] RDS fetch took ${duration}ms. Found ${signals?.length || 0} signals.`);

        // Standardize signal format for frontend
        const formattedSignals = (signals || []).map(s => {
            // If data is stored as JSON string, parse it
            const signalData = typeof s.data === 'string' ? JSON.parse(s.data) : s.data;

            return {
                ...signalData,
                id: s.id,
                symbol: s.symbol,
                strategy: s.strategy,
                status: s.status,
                createdAt: s.created_at,
                expiresAt: s.expires_at,
                source: 'rds'
            };
        });

        return NextResponse.json({
            signals: formattedSignals,
            total: formattedSignals.length,
            source: 'database_direct'
        });

    } catch (error: any) {
        console.error('[Signals API] RDS Fetch Error:', error?.message || error);

        // Fallback to EC2 IF direct DB fails (shouldn't happen if credentials are correct)
        try {
            const PYTHON_API = process.env.EC2_API_URL || process.env.TASTYTRADE_API_URL || 'http://34.235.119.67:8002';
            console.log('[Signals API] Falling back to EC2:', PYTHON_API);

            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000); // Shorter timeout for fallback

            const response = await fetch(`${PYTHON_API}/api/signals`, {
                headers: { 'Accept': 'application/json' },
                signal: controller.signal,
            });
            clearTimeout(timeout);

            if (response.ok) {
                const data = await response.json();
                return NextResponse.json(data);
            }
        } catch (fallbackError) {
            console.error('[Signals API] Fallback also failed');
        }

        return NextResponse.json(
            { signals: [], error: 'Database and Backend unavailable', source: 'error' },
            { status: 200 } // Return 200 to prevent UI crash
        );
    }
}
