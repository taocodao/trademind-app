import { NextRequest, NextResponse } from 'next/server';
import { recordClick, validToken, BASE_URL, CAMPAIGN } from '@/lib/outreach/db';
import { getContact } from '@/lib/outreach/db';
import { VARIANT_PATH } from '@/lib/outreach/followup';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Tokenized campaign links. GET /r/{token}/p -> preview, /r/{token}/s -> subscribe.
 * Every request is logged and classified (HEAD, scanner user agents, clicks within 60 seconds of a
 * send, preview+subscribe bursts are bots). A real person is confirmed later by the landing page
 * script after 3 visible seconds (POST /api/engage). No click ever subscribes anyone: the
 * subscribe link only opens a form the person submits themselves.
 */
async function handle(req: NextRequest, params: Promise<{ token: string; kind: string }>, method: string) {
    const { token, kind } = await params;
    const fallback = NextResponse.redirect(new URL('/newsletter', BASE_URL), 302);
    if (!validToken(token) || !['p', 's', 'i', 'h', 'n'].includes(kind)) return fallback;
    const sParam = Number(req.nextUrl.searchParams.get('s') ?? '1');
    const step = sParam >= 1 && sParam <= 9 ? sParam : 1;
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
    const ua = req.headers.get('user-agent');
    const { known, isBot } = await recordClick({
        token, linkType: kind === 'p' ? 'preview' : kind === 's' ? 'subscribe' : kind === 'i' ? 'inside' : kind === 'h' ? 'home' : 'issue', step, method, ip, ua,
    });
    if (!known) return fallback;
    if (method === 'HEAD') return new NextResponse(null, { status: 200 });
    const c = await getContact(token);
    const utm = `utm_source=coldlist&utm_medium=email&utm_campaign=${CAMPAIGN}&utm_content=${encodeURIComponent(c?.template ?? 'T')}_s${step}`;
    let dest: string;
    if (kind === 'p') {
        const v = req.nextUrl.searchParams.get('v') ?? '';
        dest = VARIANT_PATH[v] ? `${VARIANT_PATH[v]}?t=${token}&${utm}` : `/newsletter/start-here?t=${token}&${utm}`;
    }
    else if (kind === 's') dest = `/newsletter/join?t=${token}&${utm}`;
    else if (kind === 'i') {
        const a = req.nextUrl.searchParams.get('a') ?? '';
        dest = `/newsletter/inside?t=${token}&${utm}${['weather', 'readout', 'flight', 'turbulence'].includes(a) ? `#${a}` : ''}`;
    } else if (kind === 'h') dest = `/?t=${token}&${utm}`;
    else {
        const u = req.nextUrl.searchParams.get('u') ?? '';
        if (!/^\/newsletter\/(issues|guides|research)\/[a-z0-9-]+$/.test(u)) return fallback;
        dest = `${u}?t=${token}&${utm}`;
    }
    void isBot;
    return NextResponse.redirect(new URL(dest, BASE_URL), 302);
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ token: string; kind: string }> }) {
    return handle(req, ctx.params, 'GET');
}
export async function HEAD(req: NextRequest, ctx: { params: Promise<{ token: string; kind: string }> }) {
    return handle(req, ctx.params, 'HEAD');
}
