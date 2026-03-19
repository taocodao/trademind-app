import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getPendingSignals, getUserExecutionForSignal } from '@/lib/db';

export const maxDuration = 35;

export async function GET() {
    try {
        console.log('[Signals API] Fetching directly from RDS...');
        const start = Date.now();

        const signals = await getPendingSignals();

        // Decode Privy token to get user ID
        const cookieStore = await cookies();
        const privyToken = cookieStore.get('privy-token')?.value;
        let userId: string | null = null;
        if (privyToken) {
            try {
                const payload = privyToken.split('.')[1];
                const decoded = JSON.parse(atob(payload));
                userId = decoded.sub || decoded.privy_did || null;
            } catch (e) {
                console.warn('[Signals API] Failed to decode privy token', e);
            }
        }

        const duration = Date.now() - start;
        console.log(`[Signals API] RDS fetch took ${duration}ms. Found ${signals?.length || 0} signals.`);

        // Standardize signal format for frontend and attach userExecution
        const formattedSignals = await Promise.all((signals || []).map(async (s) => {
            const signalData = typeof s.data === 'string' ? JSON.parse(s.data) : s.data;
            let userExecution = null;
            
            if (userId) {
                const execution = await getUserExecutionForSignal(userId, s.id.toString());
                if (execution) {
                    userExecution = {
                        status: execution.status,
                        orderId: execution.order_id,
                        executedAt: execution.executed_at,
                    };
                }
            }

            return {
                ...signalData,
                id: s.id,
                symbol: s.symbol,
                strategy: s.strategy,
                status: s.status,
                createdAt: s.created_at,
                expiresAt: s.expires_at,
                source: 'rds',
                userExecution // newly added execution tracking per user
            };
        }));

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
