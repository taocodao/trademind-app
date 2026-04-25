/**
 * GET /api/cron/reconcile-credits
 *
 * Monthly reconciliation job — catches any user whose loyalty credits were NOT
 * issued via the Stripe invoice.paid webhook (e.g., Stripe retry window expired).
 *
 * Scheduled via vercel.json cron: "0 9 1 * *" (9 AM UTC, 1st of each month).
 * Protected by CRON_SECRET header set by Vercel automatically.
 *
 * Safety: uses ON CONFLICT DO NOTHING — idempotent, safe to re-run any time.
 * Unlike the webhook path, source key here is 'loyalty_month_N_reconcile_YYYY-MM'
 * so it never collides with invoice-based rows.
 */

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { PRICING } from '@/lib/pricing-config';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
    // Vercel sets Authorization: Bearer <CRON_SECRET> automatically
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const maxMonths   = PRICING.loyalty.totalMonths;       // default 5
    const creditCents = PRICING.loyalty.creditCentsPerMonth; // default 2000
    const runTag      = new Date().toISOString().slice(0, 7); // e.g. "2026-05"

    let issued = 0;
    let skipped = 0;

    try {
        // Find all active monthly subscribers
        const users = await pool.query(`
            SELECT user_id, stripe_customer_id, subscription_start_date
            FROM user_settings
            WHERE subscription_status = 'active'
              AND billing_interval = 'month'
              AND subscription_start_date IS NOT NULL
        `);

        for (const user of users.rows) {
            const { user_id, subscription_start_date } = user;

            // Calculate how many complete months have elapsed since subscription start
            const startMs  = new Date(subscription_start_date).getTime();
            const nowMs    = Date.now();
            const monthsElapsed = Math.floor((nowMs - startMs) / (30 * 24 * 3600 * 1000));

            if (monthsElapsed < 1 || monthsElapsed > maxMonths) {
                skipped++;
                continue;
            }

            // Issue credits for all months 1..monthsElapsed that don't already exist
            for (let month = 1; month <= monthsElapsed; month++) {
                const source = `loyalty_month_${month}_reconcile_${runTag}`;

                // Check if webhook already issued credit for this month
                // (webhook uses 'loyalty_month_N_<invoice_id>' — different prefix)
                const existing = await pool.query(
                    `SELECT 1 FROM user_credits
                     WHERE user_id = $1 AND source LIKE $2`,
                    [user_id, `loyalty_month_${month}_%`]
                );

                if (existing.rowCount && existing.rowCount > 0) {
                    // Webhook already handled this month — skip
                    continue;
                }

                // Issue the missing credit
                await pool.query(
                    `INSERT INTO user_credits (user_id, amount, source, expires_at)
                     VALUES ($1, $2, $3, NOW() + INTERVAL '90 days')
                     ON CONFLICT (user_id, source) DO NOTHING`,
                    [user_id, creditCents, source]
                );
                issued++;
                console.log(`[Cron] Reconciled month ${month} credit for ${user_id}`);
            }
        }

        console.log(`[Cron] Loyalty reconciliation complete: ${issued} issued, ${skipped} skipped`);
        return NextResponse.json({ success: true, issued, skipped, runTag });

    } catch (err: any) {
        console.error('[Cron] Loyalty reconciliation error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
