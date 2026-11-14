import { NextRequest } from 'next/server';
import { ISSUES, PUBLISHED_ISSUES } from '@/lib/newsletter/issues';
import { libraryPage } from '@/lib/newsletter/library-page';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** One library issue in the new format at its permanent address. */
export async function GET(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
    const { slug } = await ctx.params;
    const issue = PUBLISHED_ISSUES.find((i) => `${i.publishDate}-${i.slug}` === slug);
    // Templates that are not published yet send the reader to the current issue.
    if (!issue && ISSUES.some((i) => `${i.publishDate}-${i.slug}` === slug)) return new Response(null, { status: 308, headers: { location: '/newsletter/current' } });
    if (!issue) return new Response('Not found', { status: 404, headers: { 'content-type': 'text/plain' } });
    return libraryPage(req, issue);
}
