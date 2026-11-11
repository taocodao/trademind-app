import { NextRequest } from 'next/server';
import pool from '@/lib/db';
import { ensureEditionTables } from '@/lib/newsletter/pipeline/db';
import { toInput, type PublicPayload } from '@/lib/newsletter/pipeline/build';
import { renderNewsletter } from '@/lib/newsletter/edition-render';
import { editionPageHtml, dailyEmptyHtml } from '@/lib/newsletter/web-issue';
import { getContact, validToken } from '@/lib/outreach/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** The latest approved daily brief, on the website. Drafts and held editions are never shown. */
export async function GET(req: NextRequest) {
    const raw = req.nextUrl.searchParams.get('t') ?? req.cookies.get('tm_t')?.value ?? '';
    let token = '';
    if (raw && validToken(raw)) { try { if (await getContact(raw)) token = raw; } catch { /* no token */ } }
    let html = dailyEmptyHtml(token);
    try {
        await ensureEditionTables();
        const r = await pool.query(
            `SELECT edition_date::text AS d, payload FROM newsletter_edition
             WHERE kind = 'daily' AND status IN ('approved','sent') AND edition_date >= (CURRENT_DATE - INTERVAL '4 days')
             ORDER BY edition_date DESC LIMIT 1`);
        const e = r.rows[0];
        if (e) {
            const m = renderNewsletter(toInput(e.payload as PublicPayload, e.d, {}));
            html = editionPageHtml(m.html, m.subject, token, 'daily');
        }
    } catch (err) { console.error('[newsletter/daily]', err); }
    return new Response(html, {
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, s-maxage=300, stale-while-revalidate=600' },
    });
}
