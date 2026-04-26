/**
 * Winback Cron
 * ============
 * GET /api/cron/winback
 * Schedule: 0 14 * * *  (9 AM ET daily — same as trial-warning)
 *
 * Processes the scheduled_messages queue. Currently handles 'winback'
 * type DMs sent 48h after trial deactivation.
 *
 * Extensible: add new message_type values to handle future use cases
 * (nudge, upgrade_prompt, loyalty_reminder, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { sendWhopDM } from '@/lib/whop';

export const dynamic = 'force-dynamic';

const UPGRADE_URL = process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/upgrade`
    : 'https://trademind.bot/upgrade';

const WINBACK_MESSAGES: Record<string, string> = {
    default: `Hey — noticed you recently left TradeMind.

If you're still following markets: TurboCore's regime detection has been actively protecting capital during recent volatility. The signals kept running while you were gone.

If the timing wasn't right, reply "**pause**" to hold your spot 30 days at no cost, or go here to re-activate:
${UPGRADE_URL}`,
};

export async function GET(req: NextRequest): Promise<NextResponse> {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all unsent messages due now or earlier (batch of 100)
    const { rows: pending } = await query(
        `SELECT id, user_id, message_type, tier, content
         FROM scheduled_messages
         WHERE sent = FALSE AND send_at <= NOW()
         ORDER BY send_at ASC
         LIMIT 100`
    );

    let processed = 0;
    const errors: string[] = [];

    for (const msg of pending) {
        try {
            const content = msg.content
                ?? WINBACK_MESSAGES[msg.message_type]
                ?? WINBACK_MESSAGES.default;

            await sendWhopDM(msg.user_id, content);

            await query(
                `UPDATE scheduled_messages SET sent = TRUE, sent_at = NOW() WHERE id = $1`,
                [msg.id]
            );

            processed++;
            console.log(`[Winback] Sent ${msg.message_type} DM to Whop user ${msg.user_id}`);
        } catch (err: any) {
            errors.push(`${msg.user_id}: ${err.message}`);
            console.error('[Winback] Failed to send DM:', err);
        }
    }

    return NextResponse.json({ processed, errors: errors.length ? errors : undefined });
}
