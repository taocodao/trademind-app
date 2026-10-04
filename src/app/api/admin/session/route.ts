/**
 * Admin session lifetime: 8 hours, fixed (not sliding).
 *
 * GET    -> { active, expiresAt } for the current cookie.
 * POST   -> after a verified Privy admin sign-in, issues the 8 hour cookie.
 *           If a valid cookie already exists it is kept (no extension).
 * DELETE -> clears the cookie (sign out / expiry).
 */
import { NextRequest, NextResponse } from 'next/server';
import {
    ADMIN_SESSION_COOKIE, ADMIN_SESSION_SECONDS, mintAdminSession, readAdminSession, resolveAdmin,
} from '@/lib/admin-gate';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const expiresAt = readAdminSession(req.cookies.get(ADMIN_SESSION_COOKIE)?.value);
    return NextResponse.json({ active: !!expiresAt, expiresAt });
}

export async function POST(req: NextRequest) {
    const existing = readAdminSession(req.cookies.get(ADMIN_SESSION_COOKIE)?.value);
    if (existing) return NextResponse.json({ ok: true, expiresAt: existing, reused: true });

    // Require a genuine Privy admin session (never the cookie alone) to mint.
    const admin = await resolveAdmin(req);
    if (!admin.isAdmin || !admin.did) {
        return NextResponse.json({ error: admin.error ?? 'Admin access required' }, { status: admin.status });
    }
    const minted = mintAdminSession(admin.did);
    if (!minted) return NextResponse.json({ ok: true, expiresAt: null, disabled: true });

    const res = NextResponse.json({ ok: true, expiresAt: minted.expiresAt });
    res.cookies.set(ADMIN_SESSION_COOKIE, minted.value, {
        httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: ADMIN_SESSION_SECONDS,
    });
    return res;
}

export async function DELETE() {
    const res = NextResponse.json({ ok: true });
    res.cookies.set(ADMIN_SESSION_COOKIE, '', { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 0 });
    return res;
}
