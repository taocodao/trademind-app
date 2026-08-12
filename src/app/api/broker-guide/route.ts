import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const execFileP = promisify(execFile);

/**
 * GET /api/broker-guide?broker=fidelity&symbol=QQQ&action=buy&quantity=25
 *
 * Renders the annotated broker-ticket guide (numbered pointers over the broker's
 * trade ticket showing the exact value to type) as a PNG. Pure-Pillow, no native
 * deps, so it runs on Vercel. Public so signal emails can embed it via <img>.
 */
export async function GET(req: NextRequest) {
    const sp = req.nextUrl.searchParams;
    const broker = (sp.get('broker') || 'fidelity').toLowerCase();
    const symbol = (sp.get('symbol') || '').toUpperCase();
    const action = (sp.get('action') || 'buy').toLowerCase() === 'sell' ? 'sell' : 'buy';
    const quantity = Math.max(1, Math.floor(Number(sp.get('quantity')) || 1));

    if (!symbol) {
        return NextResponse.json({ error: 'symbol is required' }, { status: 400 });
    }
    if (broker !== 'fidelity') {
        return NextResponse.json({ error: `Unsupported broker: ${broker}` }, { status: 400 });
    }

    try {
        const script = path.join(process.cwd(), 'scripts', 'broker_guide_annotate.py');
        const payload = JSON.stringify({ order: { symbol, action, quantity } });
        const { stdout } = await execFileP('python3', [script], {
            input: payload,
            maxBuffer: 16 * 1024 * 1024,
        } as any);
        const out = JSON.parse(String(stdout));
        const png = Buffer.from(out.png_base64, 'base64');
        return new NextResponse(png, {
            status: 200,
            headers: {
                'Content-Type': 'image/png',
                // Short cache — values are order-specific, but identical params can cache.
                'Cache-Control': 'public, max-age=300, s-maxage=300',
            },
        });
    } catch (err) {
        console.error('[broker-guide] render failed:', err);
        return NextResponse.json({ error: 'Failed to render guide' }, { status: 500 });
    }
}
