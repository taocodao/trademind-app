import { NextRequest } from 'next/server';
import { liveFacts } from '@/lib/newsletter/live-facts';
import { currentIssueHtml } from '@/lib/newsletter/web-issue';
import { getContact, validToken } from '@/lib/outreach/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** The current weekly issue, on the website. Same layout as the first invitation email. */
export async function GET(req: NextRequest) {
    const raw = req.nextUrl.searchParams.get('t') ?? req.cookies.get('tm_t')?.value ?? '';
    // A personal link turns the subscribe buttons into one-click links for that invited contact.
    let token = '';
    if (raw && validToken(raw)) { try { if (await getContact(raw)) token = raw; } catch { /* no token */ } }
    const html = currentIssueHtml(await liveFacts(new Date()), token);
    return new Response(html, {
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': token ? 'private, no-store' : 'public, s-maxage=300, stale-while-revalidate=600' },
    });
}
