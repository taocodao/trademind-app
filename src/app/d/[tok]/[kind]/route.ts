import { NextRequest, NextResponse } from 'next/server';
import { recordNewsletterEvent } from '@/lib/newsletter/db';
import { DAILY_KINDS, DailyKind, dailyDestination, readDailyLinkToken } from '@/lib/newsletter/daily-link';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://trademind.bot';
const SCANNER_UA = /bot|crawl|spider|scanner|python-requests|curl|wget|headless|proofpoint|mimecast|barracuda|preview|safelinks|urldefense|trendmicro|symantec|fireeye|forcepoint|zscaler/i;

/**
 * GET /d/<token>/<kind>?e=<YYYY-MM-DD>&a=<accountId>
 * Records which daily brief button was clicked (never by link scanners) and redirects to a fixed page.
 * Nothing is changed by a click: the account page asks the reader to sign in, and the weekly link only opens a form.
 */
async function handle(req: NextRequest, params: Promise<{ tok: string; kind: string }>, method: string) {
    const { tok, kind } = await params;
    if (!(DAILY_KINDS as readonly string[]).includes(kind)) return NextResponse.redirect(new URL('/', BASE_URL), 302);
    const edition = /^\d{4}-\d{2}-\d{2}$/.test(req.nextUrl.searchParams.get('e') ?? '') ? req.nextUrl.searchParams.get('e')! : null;
    const a = Number(req.nextUrl.searchParams.get('a') ?? '');
    const accountId = Number.isInteger(a) && a > 0 && a < 1e12 ? a : null;
    const ua = req.headers.get('user-agent') ?? '';
    const scanner = method === 'HEAD' || SCANNER_UA.test(ua);
    const subscriberId = readDailyLinkToken(tok);
    if (subscriberId && !scanner) {
        void recordNewsletterEvent('daily_click', { kind, edition, account_id: accountId }, subscriberId).catch(() => undefined);
    }
    if (method === 'HEAD') return new NextResponse(null, { status: 200 });
    const utm = `utm_source=daily&utm_medium=email&utm_campaign=daily_brief${edition ? `&utm_content=${edition}` : ''}`;
    return NextResponse.redirect(new URL(dailyDestination(kind as DailyKind, accountId, utm, tok, req.nextUrl.searchParams.get('d') === '1'), BASE_URL), 302);
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ tok: string; kind: string }> }) { return handle(req, ctx.params, 'GET'); }
export async function HEAD(req: NextRequest, ctx: { params: Promise<{ tok: string; kind: string }> }) { return handle(req, ctx.params, 'HEAD'); }
