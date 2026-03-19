import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const strategy = body.strategy || 'unknown';

        // We use a global variable or external pub/sub for SSE.
        // In this Vercel serverless environment, memory is not easily shared across 
        // isolated instances. However, for a single user/development instance,
        // a global EventTarget can work as a lightweight pub/sub.
        // For production, Redis or Pusher is recommended, but we'll use a global emitter here.
        if ((global as any).signalEmitter) {
            (global as any).signalEmitter.dispatchEvent(
                new CustomEvent('new_signal', { detail: { strategy } })
            );
        }

        return NextResponse.json({ success: true, message: `Notification sent for ${strategy}` });
    } catch (error) {
        console.error('Failed to notify:', error);
        return NextResponse.json({ success: false, error: 'Failed to notify' }, { status: 500 });
    }
}
