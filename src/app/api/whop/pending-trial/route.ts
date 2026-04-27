/**
 * GET /api/whop/pending-trial
 * ==========================
 * Polled by /whop/welcome to check if the Whop webhook has landed
 * and a trial record exists for the user.
 *
 * Query params:
 *   ?email=user@example.com   — look up by email (preferred)
 *   ?payment_id=pay_xxx       — look up by Whop payment/receipt ID (fallback)
 *
 * Returns: { status: 'pending' | 'ready', email?, trialEndsAt?, whopUserId? }
 *
 * The welcome page polls this every 3 seconds until status = 'ready',
 * then surfaces the email for the Privy useLoginWithEmail flow.
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
    const email     = req.nextUrl.searchParams.get('email')?.toLowerCase().trim();
    const paymentId = req.nextUrl.searchParams.get('payment_id');

    if (!email && !paymentId) {
        return NextResponse.json(
            { error: 'Provide email or payment_id' },
            { status: 400 }
        );
    }

    let rows: any[] = [];

    if (email) {
        // Primary lookup: match by normalized email
        const result = await query(
            `SELECT whop_user_id, email, trial_ends_at, migrated
             FROM whop_trials
             WHERE LOWER(email) = $1
             ORDER BY trial_started_at DESC LIMIT 1`,
            [email]
        );
        rows = result.rows;
    }

    // Fallback: if no email match yet (webhook may not have landed),
    // the payment_id cannot be resolved server-side without the Whop API
    // so we just return pending status.
    if (!rows.length) {
        return NextResponse.json({
            status:     'pending',
            message:    'Trial record not found yet — webhook may still be processing.',
            retryAfter: 3,
        });
    }

    const trial = rows[0];

    if (trial.migrated) {
        return NextResponse.json({
            status:      'migrated',
            email:       trial.email,
            trialEndsAt: trial.trial_ends_at,
            whopUserId:  trial.whop_user_id,
        });
    }

    return NextResponse.json({
        status:      'ready',
        email:       trial.email,
        trialEndsAt: trial.trial_ends_at,
        whopUserId:  trial.whop_user_id,
    });
}
