import { NextRequest, NextResponse } from 'next/server';
import { BROKERAGE_INTEGRATION_ENABLED } from '@/lib/feature-flags';

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

// ── Brokerage integration kill switch ──────────────────────────────────────
// The signals-only product model forbids TradeMind from connecting to or
// executing at a user's brokerage. The underlying Tastytrade route sources
// (src/app/api/tastytrade/*, and the auto-execute endpoint) are kept for
// possible future reuse, but every one of their surfaces is short-circuited
// here — status probes return { linked: false }, everything else 410 Gone —
// so no client can reach the third-party API. Toggle in @/lib/feature-flags.
function classifyBrokerageRoute(pathname: string): 'status' | 'action' | null {
    if (pathname.startsWith('/api/tastytrade/status') ||
        pathname.startsWith('/api/tastytrade/account') ||
        pathname.startsWith('/api/tastytrade/balance') ||
        pathname.startsWith('/api/tastytrade/positions') ||
        pathname.startsWith('/api/tastytrade/live-positions') ||
        pathname.startsWith('/api/tastytrade/transactions')) {
        return 'status';
    }
    if (pathname.startsWith('/api/tastytrade')) return 'action';
    if (pathname.startsWith('/api/internal/signals/') && pathname.includes('/auto-execute')) {
        return 'action';
    }
    return null;
}

// ── Middleware ─────────────────────────────────────────────────────────────
export function middleware(request: NextRequest) {
    const { pathname, search } = request.nextUrl;

    // Brokerage integration kill switch: block every API surface at the edge.
    if (!BROKERAGE_INTEGRATION_ENABLED) {
        const kind = classifyBrokerageRoute(pathname);
        if (kind === 'status') {
            return NextResponse.json(
                { linked: false, disabled: true, reason: 'brokerage_integration_disabled' },
                { status: 200 },
            );
        }
        if (kind === 'action') {
            return NextResponse.json(
                {
                    error: 'Brokerage integration is disabled.',
                    reason: 'brokerage_integration_disabled',
                    detail: 'TradeMind never connects to or submits orders to your brokerage. Signals are delivered for you to enter yourself.',
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
// Intercept bare /c/* referral links AND the brokerage-integration surfaces.
// Everything else passes through untouched.
export const config = {
    matcher: [
        '/c/:campaign*',
        '/api/tastytrade/:path*',
        '/api/internal/signals/:path*',
    ],
};
