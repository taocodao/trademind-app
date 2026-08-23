import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { initializeMembershipTables } from '@/lib/membership';
import { sendFreeMonthReminderEmail } from '@/lib/membership-email';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
    const expected = process.env.CRON_SECRET;
    if (!expected || req.headers.get('authorization') !== `Bearer ${expected}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        await initializeMembershipTables();

        const reminders = await query(
            `SELECT a.name AS account_name, m.free_month_ends_at,
                    COALESCE(NULLIF(a.alert_email, ''), NULLIF(u.login_email, '')) AS email
             FROM account_memberships m
             JOIN accounts a ON a.id = m.account_id
             LEFT JOIN user_settings u ON u.user_id = m.user_id
             WHERE m.status = 'free_month'
               AND m.stripe_subscription_id IS NULL
               AND m.free_month_ends_at::date IN ((CURRENT_DATE + INTERVAL '7 days')::date, (CURRENT_DATE + INTERVAL '2 days')::date)`,
        );

        let remindersSent = 0;
        for (const reminder of reminders.rows) {
            if (!reminder.email) continue;
            if (await sendFreeMonthReminderEmail({
                to: reminder.email,
                accountName: reminder.account_name,
                endsAt: new Date(reminder.free_month_ends_at).toISOString(),
            })) remindersSent += 1;
        }

        const expiredFreeMonths = await query(
            `UPDATE account_memberships
             SET status = 'expired', updated_at = NOW()
             WHERE status = 'free_month'
               AND stripe_subscription_id IS NULL
               AND free_month_ends_at <= NOW()`,
        );
        const expiredCanceled = await query(
            `UPDATE account_memberships
             SET status = 'expired', updated_at = NOW()
             WHERE (status = 'canceled' OR cancel_at_period_end = TRUE)
               AND current_period_end <= NOW()`,
        );

        return NextResponse.json({
            success: true,
            remindersSent,
            expiredFreeMonths: expiredFreeMonths.rowCount ?? 0,
            expiredCanceled: expiredCanceled.rowCount ?? 0,
        });
    } catch (error) {
        console.error('[free-month-lifecycle] failed:', error);
        return NextResponse.json({ error: 'Free month lifecycle failed' }, { status: 500 });
    }
}
