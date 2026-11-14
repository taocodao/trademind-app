import { NextRequest } from 'next/server';
import { liveFacts } from '@/lib/newsletter/live-facts';
import { libraryIssueHtml } from '@/lib/newsletter/web-issue';
import { SAMPLE_FACTS } from '@/lib/outreach/copy-seq7';
import { query } from '@/lib/db';
import { readDailyLinkToken } from '@/lib/newsletter/daily-link';
import { getContact, validToken } from '@/lib/outreach/db';
import { issueUrl, type NewsletterIssue } from '@/lib/newsletter/issues';
import { publicSequence } from '@/lib/newsletter/weekly';

const BASE = 'https://trademind.bot';
const ADVISER_SEGMENTS = new Set(['consulti', 'independent', 'fidelity']);
const esc = (x: string) => x.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/**
 * One library issue as a web page in the new format. Two copies share one address: the retail copy, and the adviser
 * copy (adds the Book 20 minutes card) for adviser invitation links and ?aud=adviser. A signed subscriber link (?k=)
 * or an address in the link (?email=) is shown as a known reader.
 */
export async function libraryPage(req: NextRequest, issue: NewsletterIssue, opts: { sample?: boolean } = {}): Promise<Response> {
    const sp = req.nextUrl.searchParams;
    const raw = sp.get('t') ?? req.cookies.get('tm_t')?.value ?? '';
    let token = '';
    let contactEmail = '';
    let adviser = sp.get('aud') === 'adviser';
    if (raw && validToken(raw)) {
        try { const c = await getContact(raw); if (c) { token = raw; contactEmail = c.email; if (ADVISER_SEGMENTS.has(c.segment) || String(c.template).startsWith('CX')) adviser = true; } } catch { /* anonymous */ }
    }
    let email = '';
    const k = sp.get('k') ?? '';
    const id = k ? readDailyLinkToken(k) : null;
    if (id) { try { email = (await query('SELECT email FROM newsletter_subscribers WHERE id = $1', [id])).rows[0]?.email ?? ''; } catch { /* anonymous */ } }
    // On the sample page an address in the link is a reader who has not subscribed yet: prefill it, do not claim they are on the list.
    let prefill = '';
    if (!email && !token) { const e = (sp.get('email') ?? '').trim(); if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) { if (opts.sample) prefill = e; else email = e; } }
    const seq = await publicSequence();
    const at = seq.findIndex((i) => i.slug === issue.slug);
    const prev = at > 0 ? seq[at - 1] : undefined;
    const last = prev ? { title: prev.title, path: issueUrl(prev) } : null;
    const facts = await liveFacts(new Date()).catch(() => SAMPLE_FACTS);
    const url = BASE + issueUrl(issue);
    const ld = { '@context': 'https://schema.org', '@type': 'Article', headline: issue.title, description: issue.excerpt, datePublished: issue.publishDate, author: { '@type': 'Organization', name: 'TradeMind', url: BASE }, publisher: { '@type': 'Organization', name: 'TradeMind', url: BASE }, mainEntityOfPage: url, isPartOf: { '@type': 'Blog', name: 'The AI Systematic Investor', url: `${BASE}/newsletter` } };
    const head = `<link rel="canonical" href="${esc(url)}"><meta property="og:type" content="article"><meta property="og:title" content="${esc(issue.title)}"><meta property="og:description" content="${esc(issue.excerpt)}"><meta property="og:url" content="${esc(url)}"><meta property="og:image" content="${BASE}/share-card.png"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(issue.title)}"><meta name="twitter:description" content="${esc(issue.excerpt)}"><meta name="twitter:image" content="${BASE}/share-card.png"><script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`;
    const html = libraryIssueHtml(issue, facts, { token, audience: adviser ? 'adviser' : 'retail', path: issueUrl(issue), isCurrent: at >= 0 && at === seq.length - 1, email, last, head, sample: opts.sample, prefill, contactEmail });
    const personal = !!(token || email || prefill || k);
    return new Response(html, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': personal ? 'private, no-store' : 'public, s-maxage=300, stale-while-revalidate=600' } });
}
