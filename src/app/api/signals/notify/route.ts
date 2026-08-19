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

        // If signal_id provided, fetch the signal and fan out to all users.
        // The fan-out mutates virtual accounts and emails users, so it requires
        // the internal secret. Plain SSE pings (no signal_id) stay open.
        if (signalId) {
            const secret = process.env.INTERNAL_API_SECRET;
            const auth = req.headers.get('authorization') || '';
            if (secret && auth !== `Bearer ${secret}`) {
                return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
            }
            try {
                const signalRes = await pool.query(
                    `SELECT id, strategy, data FROM signals WHERE id = $1`,
                    [signalId]
                );

                if (signalRes.rows.length > 0) {
                    const signal = signalRes.rows[0];
                    const signalData = typeof signal.data === 'string' ? JSON.parse(signal.data) : signal.data;

                    // Await the fan-out so it completes before the response returns.
                    // On Vercel serverless, an un-awaited promise is killed when the
                    // function freezes after the response — which silently dropped
                    // every account execution. maxDuration=60 gives it room to finish.
                    try {
                        const fanoutResult = await fanoutSignal(signalId.toString(), {
                            strategy: signal.strategy,
                            ...signalData,
                        });
                        console.log(`[Notify] Fan-out complete for signal ${signalId}:`, fanoutResult);
                        return NextResponse.json({
                            success: true,
                            message: `Notification sent and fan-out completed for ${strategy}`,
                            signalId,
                            fanout: fanoutResult,
                        });
                    } catch (err) {
                        console.error(`[Notify] Fan-out failed for signal ${signalId}:`, err);
                        return NextResponse.json({
                            success: false,
                            message: `Fan-out failed for ${strategy}`,
                            signalId,
                            error: err instanceof Error ? err.message : String(err),
                        }, { status: 500 });
                    }
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
