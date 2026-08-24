import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET /api/referrals/lookup?code=TM-... — public, privacy-limited lookup used
// by the referred-visitor banner. Returns only the referrer's first name so
// the landing page can say who sent the invitation. No email, no id, no
// account data. Unknown codes return a generic fallback rather than an error.
export async function GET(req: NextRequest) {
    const code = (req.nextUrl.searchParams.get('code') ?? '').trim().toUpperCase();
    if (!code || code.length > 30) {
        return NextResponse.json({ firstName: null });
    }
    try {
        const res = await query(
            `SELECT first_name FROM user_settings WHERE referral_code = $1`,
            [code]
        );
        const firstName = (res.rows[0]?.first_name ?? '').trim() || null;
        return NextResponse.json({ firstName });
    } catch (err) {
        console.error('[referrals/lookup] failed', err);
        return NextResponse.json({ firstName: null });
    }
}
