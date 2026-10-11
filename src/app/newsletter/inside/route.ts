import { INSIDE_HTML } from '@/lib/outreach/inside-html';

export const dynamic = 'force-static';

/** What is in each issue: the page the four section links in the invitation emails open. */
export async function GET() {
    return new Response(INSIDE_HTML, {
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=300' },
    });
}
