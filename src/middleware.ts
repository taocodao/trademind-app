import { NextRequest, NextResponse } from 'next/server';
import { AUTO_APPROVE_ENABLED } from '@/lib/feature-flags';

// ── Configuration ──────────────────────────────────────────────────────────
const SUPPORTED_LOCALES = ['en', 'es', 'zh'] as const;
type SupportedLocale = typeof SUPPORTED_LOCALES[number];
const DEFAULT_LOCALE: SupportedLocale = 'en';

// ── Accept-Language parser ─────────────────────────────────────────────────
// Parses "es-MX,es;q=0.9,en;q=0.8,zh-TW;q=0.7" into ['es', 'en', 'zh']
function parseAcceptLanguage(header: string): string[] {
    return header
        .split(',')
        .map(entry => {
            const [lang, q] = entry.trim().split(';q=');
            return { lang: lang.trim().slice(0, 2).toLowerCase(), q: q ? parseFloat(q) : 1.0 };
        })
        .sort((a, b) => b.q - a.q)
        .map(entry => entry.lang);
}

// ── Locale detection ───────────────────────────────────────────────────────
function detectLocale(req: NextRequest): SupportedLocale {
    const cookieLocale = req.cookies.get('NEXT_LOCALE')?.value?.slice(0, 2).toLowerCase();
    if (cookieLocale && (SUPPORTED_LOCALES as readonly string[]).includes(cookieLocale)) {
        return cookieLocale as SupportedLocale;
    }
    const acceptLang = req.headers.get('accept-language') ?? '';
    if (acceptLang) {
        const candidates = parseAcceptLanguage(acceptLang);
        const match = candidates.find(c => (SUPPORTED_LOCALES as readonly string[]).includes(c));
        if (match) return match as SupportedLocale;
    }
    return DEFAULT_LOCALE;
}

// ── Auto-Approve kill switch ──────────────────────────────────────────────
// Signals-only product model — the Auto-Approve feature is globally disabled.
// GET requests to /api/settings/auto-approve are answered with a synthetic
// "disabled" payload so any existing client still receives a consistent shape.
// Writes (PUT/POST/DELETE) are 410 Gone.
function classifyAutoApproveRoute(pathname: string, method: string): 'read' | 'write' | null {
    if (pathname.startsWith('/api/settings/auto-approve') ||
        pathname.startsWith('/api/admin/migrate-strategy-auto-approve')) {
        return method === 'GET' ? 'read' : 'write';
    }
    return null;
}

// ── Middleware ─────────────────────────────────────────────────────────────
export function middleware(request: NextRequest) {
    const { pathname, search } = request.nextUrl;

    // Auto-Approve kill switch: block every API surface at the edge.
    if (!AUTO_APPROVE_ENABLED) {
        const aaKind = classifyAutoApproveRoute(pathname, request.method);
        if (aaKind === 'read') {
            // Synthetic disabled payload compatible with the existing GET client
            // (SignalProvider / AutoApproveSettings expect an object).
            return NextResponse.json(
                {
                    enabled: false,
                    disabled: true,
                    reason: 'auto_approve_disabled',
                    theta:    { enabled: false, riskLevel: 'MEDIUM', customOverrides: {} },
                    diagonal: { enabled: false, riskLevel: 'MEDIUM', customOverrides: {} },
                    zebra:    { enabled: false, riskLevel: 'MEDIUM', customOverrides: {} },
                    dvo:      { enabled: false, riskLevel: 'MEDIUM', customOverrides: {} },
                    globalAutoApprove: false,
                    strategyAutoApprove: {},
                },
                { status: 200 },
            );
        }
        if (aaKind === 'write') {
            return NextResponse.json(
                {
                    error: 'Auto-Approve is disabled.',
                    reason: 'auto_approve_disabled',
                    detail: 'Signals are delivered by email/dashboard and you enter each order yourself — there is no auto-execution.',
                },
                { status: 410 },
            );
        }
    }

    // Referral landing page route: /c/[campaign] → /[locale]/c/[campaign]
    if (!pathname.startsWith('/c/')) {
        return NextResponse.next();
    }
    const campaignSlug = pathname.slice(3);
    const firstSegment = campaignSlug.split('/')[0]?.toLowerCase();
    if ((SUPPORTED_LOCALES as readonly string[]).includes(firstSegment)) {
        return NextResponse.next();
    }
    const locale = detectLocale(request);
    const redirectUrl = new URL(`/${locale}/c/${campaignSlug}${search}`, request.url);
    const response = NextResponse.redirect(redirectUrl, { status: 307 });
    response.cookies.set('NEXT_LOCALE', locale, {
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'lax',
        httpOnly: false,
    });
    return response;
}

// ── Matcher ────────────────────────────────────────────────────────────────
// Intercept bare /c/* referral links and the auto-approve configuration.
export const config = {
    matcher: [
        '/c/:campaign*',
        '/api/settings/auto-approve/:path*',
        '/api/settings/auto-approve',
        '/api/admin/migrate-strategy-auto-approve',
    ],
};
