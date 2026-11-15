import { NextRequest } from 'next/server';
import { getSettings } from '@/lib/outreach/db';
import { getContact, validToken } from '@/lib/outreach/db';
import { checklistHtml } from '@/lib/advisers/checklist';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** The adviser checklist. Not available (404) until the setting adviser_checklist is "on". */
export async function GET(req: NextRequest) {
    const s = await getSettings().catch(() => ({} as Record<string, string>));
    if (s.adviser_checklist !== 'on') return new Response('Not found', { status: 404 });
    const raw = req.nextUrl.searchParams.get('t') ?? req.cookies.get('tm_t')?.value ?? '';
    let token = '';
    if (raw && validToken(raw)) { try { if (await getContact(raw)) token = raw; } catch { /* no token */ } }
    return new Response(checklistHtml({ token }), { status: 200, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'private, no-store' } });
}
