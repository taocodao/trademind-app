import { NextResponse } from 'next/server';
import { fanoutSignal } from '@/lib/signal-fanout';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60s for fan-out processing

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const strategy = body.strategy || 'unknown';
        const signalId = body.signal_id || body.signalId;

        // Trigger SSE notification for connected clients
        if ((global as any).signalEmitter) {
            (global as any).signalEmitter.dispatchEvent(
                new CustomEvent('new_signal', { detail: { strategy } })
            );
        }

        // If signal_id provided, fetch the signal and fan out to all users
        if (signalId) {
            try {
                const signalRes = await pool.query(
                    `SELECT id, strategy, data FROM signals WHERE id = $1`,
                    [signalId]
                );

                if (signalRes.rows.length > 0) {
                    const signal = signalRes.rows[0];
                    const signalData = typeof signal.data === 'string' ? JSON.parse(signal.data) : signal.data;

                    // Run fan-out asynchronously (don't block the response)
                    fanoutSignal(signalId.toString(), {
                        strategy: signal.strategy,
                        ...signalData,
                    }).then(result => {
                        console.log(`[Notify] Fan-out complete for signal ${signalId}:`, result);
                    }).catch(err => {
                        console.error(`[Notify] Fan-out failed for signal ${signalId}:`, err);
                    });

                    return NextResponse.json({
                        success: true,
                        message: `Notification sent and fan-out started for ${strategy}`,
                        signalId,
                    });
                } else {
                    console.warn(`[Notify] Signal ${signalId} not found in database`);
                }
            } catch (err) {
                console.error(`[Notify] Failed to fetch/process signal ${signalId}:`, err);
                // Don't fail the request — SSE notification already sent
            }
        }

        return NextResponse.json({ success: true, message: `Notification sent for ${strategy}` });
    } catch (error) {
        console.error('Failed to notify:', error);
        return NextResponse.json({ success: false, error: 'Failed to notify' }, { status: 500 });
    }
}
