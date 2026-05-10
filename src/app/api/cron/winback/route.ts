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

/** Dynamically builds the Day 7 drip message with the actual signal from 7 days ago */
async function buildDay7DynamicMessage(): Promise<string> {
    const { rows } = await query(
        `SELECT signal_date, regime, confidence
         FROM whop_posts
         WHERE post_type = 'signal' AND regime IS NOT NULL
           AND signal_date <= CURRENT_DATE - INTERVAL '6 days'
         ORDER BY signal_date DESC LIMIT 1`
    );
    const REGIME_EMOJI: Record<string, string> = { BULL: '🟢', SIDEWAYS: '🟡', BEAR: '🔴' };

    const signalLine = rows.length
        ? `7 days ago, TurboCore signaled **${rows[0].regime}** ${REGIME_EMOJI[rows[0].regime] ?? ''} with **${rows[0].confidence}% confidence**. ` +
          `Type \`!record\` in chat to see every signal called since you joined and how QQQ moved after.`
        : `Type \`!record\` in chat to see every signal called since you joined.`;

    return `📊 **Week 1 complete.**

${signalLine}

Here's the system you've been running on:
• **CAGR 27.8%** over 7 years (2018–2024 backtest)
• **Max Drawdown -5.1%** — vs TQQQ -83% in 2022
• **Win Rate 86%** — 6 of 7 years positive

Full track record: trademind.bot/results

If you're finding value, type **!review** in chat — it takes 30 seconds and helps other traders find us.

23 days left in your trial. Plans from $29/mo: ${UPGRADE_URL}

_Educational analysis only. Not personalized investment advice._`;
}


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
            let content: string;
            if (msg.message_type === 'mid_trial_day7_dynamic') {
                content = await buildDay7DynamicMessage();
            } else {
                content = msg.content
                    ?? WINBACK_MESSAGES[msg.message_type]
                    ?? WINBACK_MESSAGES.default;
            }

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
