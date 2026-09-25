import { ISSUES_DESC, issueUrl } from '@/lib/newsletter/issues';

const BASE = 'https://trademind.bot';

function esc(s: string): string {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

export const dynamic = 'force-static';

export function GET() {
    const items = ISSUES_DESC.map(
        (i) => `
    <item>
      <title>${esc(`Issue ${i.number}: ${i.title}`)}</title>
      <link>${BASE}${issueUrl(i)}</link>
      <guid isPermaLink="true">${BASE}${issueUrl(i)}</guid>
      <pubDate>${new Date(i.publishDate + 'T12:00:00Z').toUTCString()}</pubDate>
      <description>${esc(i.excerpt)}</description>
      ${i.tags.map((t) => `<category>${esc(t)}</category>`).join('\n      ')}
    </item>`
    ).join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>The AI Systematic Investor - TradeMind</title>
    <link>${BASE}/newsletter</link>
    <description>Weekly research on QQQ, LEAPS, PMCC, semiconductor options, and risk control using machine learning and transparent rules.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date(ISSUES_DESC[0].publishDate + 'T12:00:00Z').toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;

    return new Response(xml, {
        headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
    });
}
