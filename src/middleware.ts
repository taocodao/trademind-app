import { NextRequest, NextResponse } from 'next/server';
import { AUTO_APPROVE_ENABLED } from '@/lib/feature-flags';
import { verifyPrivyToken, privyVerificationConfigured } from '@/lib/privy-verify';

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
// ── Identity hardening ─────────────────────────────────────────
// Routes read the user id from the privy-token and privy-user-id cookies. Neither can be trusted as sent:
// anyone can set a cookie by hand. Here the token is verified once, and the request that reaches the
// routes carries only verified identity: a bad privy-token is dropped, and privy-user-id is always
// replaced by the verified DID (or removed when there is no valid token).
async function sanitizeIdentity(request: NextRequest): Promise<Headers | null> {
    const raw = request.headers.get('cookie');
    if (!raw || !/privy-(token|user-id)/.test(raw) || !privyVerificationConfigured()) return null;
    const jar = raw.split(';').map((c) => c.trim()).filter(Boolean);
    const get = (n: string) => jar.find((c) => c.startsWith(`${n}=`))?.slice(n.length + 1);
    const token = get('privy-token');
    const did = token ? await verifyPrivyToken(decodeURIComponent(token)) : null;
    const kept = jar.filter((c) => !c.startsWith('privy-user-id=') && (did || !c.startsWith('privy-token=')));
    if (did) kept.push(`privy-user-id=${encodeURIComponent(did)}`);
    const headers = new Headers(request.headers);
    kept.length ? headers.set('cookie', kept.join('; ')) : headers.delete('cookie');
    return headers;
}

export async function middleware(request: NextRequest) {
    const { pathname, search } = request.nextUrl;
    const cleaned = await sanitizeIdentity(request);
    const pass = () => NextResponse.next(cleaned ? { request: { headers: cleaned } } : undefined);

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
        return pass();
    }
    const campaignSlug = pathname.slice(3);
    const firstSegment = campaignSlug.split('/')[0]?.toLowerCase();
    if ((SUPPORTED_LOCALES as readonly string[]).includes(firstSegment)) {
        return pass();
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
        // Everything except static assets, so the cookie cleanup also covers server-rendered pages and all API routes.
        '/((?!_next/static|_next/image|favicon\\.ico|.*\\.[a-zA-Z0-9]+$).*)',
    ],
};
