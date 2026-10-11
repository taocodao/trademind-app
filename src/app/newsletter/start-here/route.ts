import { NextRequest } from 'next/server';
import { START_HERE_HTML } from '@/lib/outreach/start-here-html';
import { validToken, BASE_URL } from '@/lib/outreach/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Start Here page for the invitation campaign. /r/{token}/p redirects here with ?t={token}.
 * The token is validated by shape, then inserted into the page links so every click on an
 * issue or the subscribe button stays tied to the same contact, and the inline script confirms a
 * real reader after 3 visible seconds. Visitors without a token get the same page with token-free links.
 */
export async function GET(req: NextRequest) {
    const raw = req.nextUrl.searchParams.get('t') ?? '';
    const token = validToken(raw) ? raw : '';
    let html = START_HERE_HTML;
    if (token) {
        html = html.replace(/\{\{subscribe_url\}\}/g, `${BASE_URL}/r/${token}/s?s=1`).replace(/\{\{token\}\}/g, token);
    } else {
        html = html
            .replace(/\{\{subscribe_url\}\}/g, `${BASE_URL}/newsletter`)
            .replace(/\?t=\{\{token\}\}&/g, '?')
            .replace(/\{\{token\}\}/g, '');
    }
    return new Response(html, {
        status: 200,
        headers: {
            'content-type': 'text/html; charset=utf-8',
            'cache-control': token ? 'private, no-store' : 'public, max-age=300',
            'x-robots-tag': 'noindex',
        },
    });
}
