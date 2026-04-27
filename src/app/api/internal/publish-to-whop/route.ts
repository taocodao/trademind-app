/**
 * EC2 → Whop Signal Bridge
 * =========================
 * POST /api/internal/publish-to-whop
 *
 * Called by the EC2 TurboCore signal publisher after saving a new signal
 * to the database. Posts the signal to the Whop announcements channel
 * and sends push notifications to all paid experience IDs.
 *
 * Auth: INTERNAL_API_SECRET header (same key used by Ghost Executor)
 *
 * Called from EC2 signal_publisher after signal DB write:
 *   curl -X POST https://www.trademind.bot/api/internal/publish-to-whop \
 *     -H "Authorization: Bearer $INTERNAL_API_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{"regime":"BULL","confidence":87,"allocation":{"QQQ":0,"QLD":40,"TQQQ":60,"SGOV":0},"reasoning":"...", "date":"2026-04-26"}'
 */

import { NextRequest, NextResponse } from 'next/server';
import { postToWhopChannel } from '@/lib/whop';
import { sendSignalPushNotification } from '@/lib/whop-notifications';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

const REGIME_EMOJI: Record<string, string> = {
    BULL:     '🟢',
    SIDEWAYS: '🟡',
    BEAR:     '🔴',
};

interface SignalPayload {
    regime:     string;
    confidence: number;
    allocation: {
        QQQ:  number;
        QLD:  number;
        TQQQ: number;
        SGOV: number;
    };
    reasoning: string;
    date:      string;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${process.env.INTERNAL_API_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let signal: SignalPayload;
    try {
        signal = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { regime, confidence, allocation, reasoning, date } = signal;

    // Idempotency: skip if we've already posted this date's signal to Whop
    const existing = await query(
        `SELECT id FROM whop_posts WHERE post_type = 'signal' AND signal_date = $1`,
        [date]
    );
    if (existing.rows.length) {
        console.log(`[Whop Signal] Already posted for ${date} — skipping`);
        return NextResponse.json({ skipped: true, date });
    }

    const emoji = REGIME_EMOJI[regime] ?? '📊';
    const { QQQ, QLD, TQQQ, SGOV } = allocation;

    const content = `**${emoji} TURBOCORE SIGNAL — ${date}**
**Regime:** ${regime} | Confidence: ${confidence}%

**Today's Allocation:**
• QQQ: ${QQQ ?? 0}%
• QLD: ${QLD ?? 0}%
• TQQQ: ${TQQQ ?? 0}%
• SGOV: ${SGOV ?? 0}%

**Why:** ${reasoning}

---
_Execute via any brokerage or one-tap via Tastytrade. Takes under 2 minutes._
_Educational analysis only. Not personalized investment advice._`;


    const channelId = process.env.WHOP_ANNOUNCEMENTS_CHANNEL_ID ?? '';
    let messageId: string | null = null;

    // Post to announcements channel
    if (channelId) {
        try {
            await postToWhopChannel(channelId, content);
            console.log(`[Whop Signal] Posted to announcements channel`);
        } catch (err) {
            console.error('[Whop Signal] Channel post failed:', err);
        }
    }

    // Push notification
    await sendSignalPushNotification({
        regime,
        confidence,
        tqqqAlloc: TQQQ,
    });

    // Log the post (idempotency guard for future calls)
    await query(
        `INSERT INTO whop_posts (post_type, channel_id, content, signal_date, regime, confidence)
         VALUES ('signal', $1, $2, $3, $4, $5)
         ON CONFLICT (post_type, signal_date) DO NOTHING`,
        [channelId, content, date, regime, confidence]
    );

    return NextResponse.json({ success: true, date, regime });
}
