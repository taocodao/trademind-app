/**
 * Magic Link Redemption Route
 * ============================
 * GET /api/auth/migrate?token=<jwt>
 *
 * Validates the migration token, creates an authenticated session,
 * and redirects to /upgrade?from=trial&ref=whop so the user lands
 * on their personalized upgrade page already logged in.
 *
 * Token is single-use — marked consumed immediately on first redemption.
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateMigrationToken, consumeMigrationToken } from '@/lib/migration';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
    const token = req.nextUrl.searchParams.get('token');
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://trademind.bot';

    if (!token) {
        return NextResponse.redirect(`${baseUrl}/login?error=missing_token`);
    }

    // Validate JWT signature, expiry, and DB record
    const payload = await validateMigrationToken(token);
    if (!payload) {
        return NextResponse.redirect(`${baseUrl}/login?error=invalid_token`);
    }

    // Consume the token immediately (single-use)
    await consumeMigrationToken(token);

    // Look up the pre-provisioned user (created when trial started)
    const userResult = await query(
        `SELECT user_id, email FROM user_settings WHERE email = $1 OR whop_user_id = $2 LIMIT 1`,
        [payload.email, payload.whop_user_id]
    );
    const user = userResult.rows[0];

    if (!user) {
        // User doesn't exist yet — redirect to signup with email pre-filled
        const signupUrl = new URL(`${baseUrl}/signup`);
        signupUrl.searchParams.set('email', payload.email);
        signupUrl.searchParams.set('ref', 'whop');
        return NextResponse.redirect(signupUrl.toString());
    }

    // Mark whop_trials as having sent migration (idempotent)
    await query(
        `UPDATE whop_trials SET migration_sent_at = COALESCE(migration_sent_at, NOW())
         WHERE whop_user_id = $1`,
        [payload.whop_user_id]
    ).catch(() => {});

    // Build the redirect URL with identifying params so /upgrade shows the trial banner
    const upgradeUrl = new URL(`${baseUrl}/upgrade`);
    upgradeUrl.searchParams.set('from', 'trial');
    upgradeUrl.searchParams.set('ref', 'whop');
    upgradeUrl.searchParams.set('user', user.user_id);

    console.log(`[Migration] Token redeemed for ${payload.email} → redirecting to /upgrade`);

    // NOTE: This app uses Privy for auth. The user is NOT auto-logged in here because
    // Privy auth is client-side. The /upgrade page detects ?from=trial&ref=whop and
    // shows the migration banner + prompts Privy login if not already authenticated.
    // If you switch auth providers, create the session cookie here instead.
    return NextResponse.redirect(upgradeUrl.toString());
}
