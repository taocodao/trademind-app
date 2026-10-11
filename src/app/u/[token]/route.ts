import { NextRequest, NextResponse } from 'next/server';
import { unsubscribeContact, validToken, recordClick } from '@/lib/outreach/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SCANNER = /bot|crawl|spider|scanner|python-requests|curl|wget|headless|proofpoint|mimecast|barracuda|safelinks|urldefense/i;

function page(title: string, body: string, status = 200): NextResponse {
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title></head><body style="font-family:Arial,sans-serif;color:#111827;max-width:520px;margin:64px auto;padding:0 20px;line-height:1.5"><h2 style="margin:0 0 12px">${title}</h2><p>${body}</p><p style="color:#6b7280;font-size:13px;margin-top:32px">TradeMind, trademind.bot</p></body></html>`;
    return new NextResponse(html, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
}

/**
 * One-click unsubscribe. POST is the RFC 8058 mail client call; GET is the footer link.
 * Both unsubscribe immediately. Security scanners that open the link are shown a button instead,
 * so a scan never removes someone who did not ask.
 */
export async function POST(_req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
    const { token } = await ctx.params;
    if (!validToken(token)) return page('Link not recognized', 'This unsubscribe link is not valid.', 404);
    const r = await unsubscribeContact(token);
    if (r === 'unknown') return page('Link not recognized', 'This unsubscribe link is not valid.', 404);
    return page('You are unsubscribed', 'You will not receive any more invitation emails from us.');
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
    const { token } = await ctx.params;
    if (!validToken(token)) return page('Link not recognized', 'This unsubscribe link is not valid.', 404);
    const ua = req.headers.get('user-agent') ?? '';
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
    void recordClick({ token, linkType: 'unsub', step: null, method: 'GET', ip, ua }).catch(() => undefined);
    if (SCANNER.test(ua)) {
        return page('Unsubscribe', `<form method="post"><button type="submit" style="padding:10px 18px;font-size:16px">Unsubscribe me</button></form>`);
    }
    const r = await unsubscribeContact(token);
    if (r === 'unknown') return page('Link not recognized', 'This unsubscribe link is not valid.', 404);
    return page('You are unsubscribed', 'You will not receive any more invitation emails from us.');
}
