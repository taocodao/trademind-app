import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    let responseStream = new TransformStream();
    const writer = responseStream.writable.getWriter();
    const encoder = new TextEncoder();

    const writeMessage = (data: any) => {
        writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
    };

    // Keep-alive interval to prevent Vercel timeout closures
    const keepAlive = setInterval(() => {
        writer.write(encoder.encode(`:\n\n`));
    }, 15000);

    // Initialize global EventTarget if it doesn't exist
    if (!(global as any).signalEmitter) {
        (global as any).signalEmitter = new EventTarget();
    }

    const emitter = (global as any).signalEmitter as EventTarget;

    const onNewSignal = (e: any) => {
        writeMessage({ type: 'new_signal', strategy: e.detail?.strategy });
    };

    emitter.addEventListener('new_signal', onNewSignal);

    // Clean up when request is aborted by client
    req.signal.addEventListener('abort', () => {
        clearInterval(keepAlive);
        emitter.removeEventListener('new_signal', onNewSignal);
        writer.close();
    });

    writeMessage({ type: 'connected' });

    return new Response(responseStream.readable, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no', // For proxy buffering
        },
    });
}
