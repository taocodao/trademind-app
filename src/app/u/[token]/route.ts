import { NextRequest, NextResponse } from 'next/server';
import { unsubscribeContact, validToken, recordClick, getContact, BASE_URL } from '@/lib/outreach/db';
import { UNSUBSCRIBE_HTML } from '@/lib/outreach/unsubscribe-html';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function esc(v: string): string {
    return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function simplePage(title: string, body: string, status = 200): NextResponse {
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title></head><body style="font-family:Arial,sans-serif;color:#111827;max-width:520px;margin:64px auto;padding:0 20px;line-height:1.5"><h2 style="margin:0 0 12px">${title}</h2><p>${body}</p><p style="color:#6b7280;font-size:13px;margin-top:32px">TradeMind, trademind.bot</p></body></html>`;
    return new NextResponse(html, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
}

/**
 * POST /u/{token} is the mail client's one-click unsubscribe (RFC 8058, Gmail's own Unsubscribe button).
 * It unsubscribes immediately and does not need the page.
 */
export async function POST(_req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
    const { token } = await ctx.params;
    if (!validToken(token)) return simplePage('Link not recognized', 'This unsubscribe link is not valid.', 404);
    const r = await unsubscribeContact(token);
    if (r === 'unknown') return simplePage('Link not recognized', 'This unsubscribe link is not valid.', 404);
    return simplePage('You are unsubscribed', 'You will not receive any more invitation emails from us.');
}

/**
 * GET /u/{token} is the link inside the email. It only shows the confirm page, so a security scanner or
 * a stray click never changes anything. The choice is applied by POST /u/{token}/confirm.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
    const { token } = await ctx.params;
    if (!validToken(token)) return simplePage('Link not recognized', 'This unsubscribe link is not valid.', 404);
    const c = await getContact(token);
    if (!c) return simplePage('Link not recognized', 'This unsubscribe link is not valid.', 404);
    const ua = req.headers.get('user-agent') ?? '';
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
    void recordClick({ token, linkType: 'unsub', step: null, method: 'GET', ip, ua }).catch(() => undefined);
    const name = (c.first_name ?? '').trim();
    let html = UNSUBSCRIBE_HTML;
    html = name
        ? html.replace(/\{\{first_name\}\}/g, esc(name))
        : html.replace(/,\s*\{\{first_name\}\}/g, '').replace(/\{\{first_name\}\}/g, '');
    html = html
        .replace(/\{\{email\}\}/g, esc(c.email))
        .replace(/\{\{subscribe_url\}\}/g, `${BASE_URL}/r/${token}/s?s=1`)
        .replace(/\{\{token\}\}/g, token);
    return new NextResponse(html, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'private, no-store' } });
}
