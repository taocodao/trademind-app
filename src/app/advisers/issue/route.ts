import { NextRequest } from 'next/server';
import { liveFacts } from '@/lib/newsletter/live-facts';
import { libraryIssueHtml } from '@/lib/newsletter/web-issue';
import { SAMPLE_FACTS } from '@/lib/outreach/copy-seq7';
import { getContact, validToken } from '@/lib/outreach/db';
import { ISSUES, issueUrl, publishedAdjacent } from '@/lib/newsletter/issues';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * The latest issue as the research sample for advisers, in the new format. Opens with a subscribe button and the
 * problem and approach, and every link on the page opens the subscribe popup. Reached from the tokenized sample link.
 */
export async function GET(req: NextRequest) {
    const raw = req.nextUrl.searchParams.get('t') ?? req.cookies.get('tm_t')?.value ?? '';
    let token = '';
    let contactEmail = '';
    if (raw && validToken(raw)) { try { const c = await getContact(raw); if (c) { token = raw; contactEmail = c.email; } } catch { /* no token */ } }
    const issue = ISSUES[ISSUES.length - 1];
    const prev = publishedAdjacent(issue).prev;
    const last = prev ? { title: prev.title, path: issueUrl(prev) } : null;
    const facts = await liveFacts(new Date()).catch(() => SAMPLE_FACTS);
    const html = libraryIssueHtml(issue, facts, { token, audience: 'adviser', path: issueUrl(issue), isCurrent: true, last, sample: true, contactEmail, prefill: !token ? (req.nextUrl.searchParams.get('email') ?? '').trim() : '' })
        .replace('<head>', '<head><meta name="robots" content="noindex">');
    return new Response(html, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'private, no-store' } });
}
