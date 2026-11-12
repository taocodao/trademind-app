import { NextRequest } from 'next/server';
import { ISSUES } from '@/lib/newsletter/issues';
import { libraryPage } from '@/lib/newsletter/library-page';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** One library issue in the new format at its permanent address. */
export async function GET(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
    const { slug } = await ctx.params;
    const issue = ISSUES.find((i) => `${i.publishDate}-${i.slug}` === slug);
    if (!issue) return new Response('Not found', { status: 404, headers: { 'content-type': 'text/plain' } });
    return libraryPage(req, issue);
}
