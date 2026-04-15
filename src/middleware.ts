import { NextRequest, NextResponse } from 'next/server';

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
// Priority: NEXT_LOCALE cookie → Accept-Language header → default
// NOTE: URL path prefix is checked BEFORE this function is called.
function detectLocale(req: NextRequest): SupportedLocale {
    // 1. Explicit user preference cookie (set on a previous visit or language switch)
    const cookieLocale = req.cookies.get('NEXT_LOCALE')?.value?.slice(0, 2).toLowerCase();
    if (cookieLocale && (SUPPORTED_LOCALES as readonly string[]).includes(cookieLocale)) {
        return cookieLocale as SupportedLocale;
    }

    // 2. Browser's Accept-Language header — reflects the REFEREE'S own preference,
    //    not the referrer's, so this is safe and does not leak referrer language.
    const acceptLang = req.headers.get('accept-language') ?? '';
    if (acceptLang) {
        const candidates = parseAcceptLanguage(acceptLang);
        const match = candidates.find(c => (SUPPORTED_LOCALES as readonly string[]).includes(c));
        if (match) return match as SupportedLocale;
    }

    // 3. Fall back to English
    return DEFAULT_LOCALE;
}

// ── Middleware ─────────────────────────────────────────────────────────────
export function middleware(request: NextRequest) {
    const { pathname, search } = request.nextUrl;

    // Only applies to the referral landing page route: /c/[campaign]
    // All other routes (dashboard, API, _next assets) are excluded by the
    // `matcher` config below — this guard is an extra safety check.
    if (!pathname.startsWith('/c/')) {
        return NextResponse.next();
    }

    // Extract the campaign slug: /c/compounding → compounding
    const campaignSlug = pathname.slice(3); // strips leading '/c/'

    // If the path already has a locale prefix under /[locale]/c/[campaign],
    // the request won't reach this middleware (different path pattern).
    // But guard against any edge case by checking if slug starts with a locale.
    const firstSegment = campaignSlug.split('/')[0]?.toLowerCase();
    if ((SUPPORTED_LOCALES as readonly string[]).includes(firstSegment)) {
        return NextResponse.next(); // already locale-prefixed
    }

    // ── Detect locale for this referee ────────────────────────────────────
    const locale = detectLocale(request);

    // ── Redirect to locale-prefixed URL ───────────────────────────────────
    // /c/compounding?ref=ACE79 → /en/c/compounding?ref=ACE79
    // 307 Temporary Redirect: does NOT cache, preserves POST, allows future locale change
    const redirectUrl = new URL(
        `/${locale}/c/${campaignSlug}${search}`,
        request.url
    );

    const response = NextResponse.redirect(redirectUrl, { status: 307 });

    // ── Persist detected locale in cookie for returning visitors ──────────
    // 1-year expiry, lax same-site (works with cross-site referral links)
    response.cookies.set('NEXT_LOCALE', locale, {
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'lax',
        httpOnly: false, // must be readable client-side (i18next language detector also reads it)
    });

    return response;
}

// ── Matcher ────────────────────────────────────────────────────────────────
// ONLY intercept bare /c/* referral links. Do NOT touch:
//   - /[locale]/c/* (already locale-prefixed — Next.js serves directly)
//   - /api/* (backend routes)
//   - /_next/* (static assets, HMR)
//   - /dashboard, /refer, etc. (app routes — client-side i18next handles those)
export const config = {
    matcher: ['/c/:campaign*'],
};
