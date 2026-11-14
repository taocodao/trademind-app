import { NextRequest } from 'next/server';
import { ISSUES, PUBLISHED_ISSUES } from '@/lib/newsletter/issues';
import { libraryPage } from '@/lib/newsletter/library-page';
import { weeklyEditions } from '@/lib/newsletter/weekly';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** One library issue in the new format at its permanent address. */
export async function GET(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
    const { slug } = await ctx.params;
    const issue = ISSUES.find((i) => `${i.publishDate}-${i.slug}` === slug) ?? (await weeklyEditions()).find((e) => `${e.issue.publishDate}-${e.issue.slug}` === slug)?.issue;
    if (!issue) return new Response('Not found', { status: 404, headers: { 'content-type': 'text/plain' } });
    const res = await libraryPage(req, issue);
    // Templates that are not published stay reachable from emails already sent, but are unlisted and kept out of search.
    if (!PUBLISHED_ISSUES.includes(issue) && issue.number < 16) res.headers.set('x-robots-tag', 'noindex');
    return res;
}
