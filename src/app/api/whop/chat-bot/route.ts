/**
 * Whop Chat Bot Handler
 * =====================
 * POST /api/whop/chat-bot
 *
 * Registered as the Chat Bot endpoint in Whop dashboard → Apps → Chat Bot.
 * Listens for messages starting with '!' and responds with live data.
 *
 * Commands:
 *   !signal    Today's full TurboCore allocation
 *   !regime    Current regime + confidence
 *   !help      List all commands
 *   !plan      Plan comparison with prices
 *   !backtest  7-year performance summary
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { postToWhopChannel } from '@/lib/whop';

export const dynamic = 'force-dynamic';

const REGIME_EMOJI: Record<string, string> = {
    BULL:     '🟢',
    SIDEWAYS: '🟡',
    BEAR:     '🔴',
};

// ── Command handlers ──────────────────────────────────────────────────────────

async function cmdSignal(): Promise<string> {
    // Read from whop_posts — populated by EC2 signal bridge (/api/internal/publish-to-whop)
    const { rows } = await query(
        `SELECT content, signal_date, regime, confidence
         FROM whop_posts
         WHERE post_type = 'signal'
         ORDER BY signal_date DESC LIMIT 1`
    );

    if (!rows.length) {
        const today = new Date().toISOString().split('T')[0];
        return `📊 No signal yet for today (${today}). Check back at 3 PM ET.`;
    }

    // Return the already-formatted signal content posted by the EC2 bridge
    return rows[0].content;
}

async function cmdRegime(): Promise<string> {
    // Read regime/confidence from whop_posts (populated by EC2 bridge)
    const { rows } = await query(
        `SELECT regime, confidence FROM whop_posts
         WHERE post_type = 'signal' AND regime IS NOT NULL
         ORDER BY signal_date DESC LIMIT 1`
    );

    if (!rows.length) return '📊 No signal data available yet.';

    const { regime, confidence } = rows[0];
    const emoji = REGIME_EMOJI[regime] ?? '📊';
    return `${emoji} Current Regime: **${regime}** | Confidence: ${confidence}%`;
}

function cmdHelp(): string {
    return `**TradeMind Bot Commands**

\`!signal\` — Today's full TurboCore allocation
\`!regime\` — Current market regime + confidence
\`!record\` — Last 30 days of signal history
\`!methodology\` — How the ML regime model works
\`!plan\` — Subscription plan options and pricing
\`!backtest\` — 7-year performance summary
\`!review\` — Leave a review on Whop
\`!refer\` — Earn 40% commission by referring friends
\`!help\` — Show this help message

_Signals drop daily at 3 PM ET. Morning briefs at 8:15 AM ET._`;
}

function cmdPlan(): string {
    return `**TradeMind Plans** (after your trial)

• **TurboCore** $29/mo — daily signals, morning brief, auto-execution
• **TurboCore Pro** $49/mo — signals + LEAPS strategy + enhanced ML
• **Both Bundle** $69/mo — everything, unlimited

Your $15 trial credit converts to bonus days at checkout.
Upgrade at: trademind.bot/upgrade`;
}

function cmdBacktest(): string {
    return `**TurboCore 7-Year Backtest (2018–2024)**

• CAGR: **27.8%** (vs TQQQ 35% raw, with -83% 2022 drawdown)
• Max Drawdown: **-5.1%** (vs TQQQ -83% in 2022)
• Win Rate: **86%** (6 of 7 years positive)
• 2022 (worst year): TurboCore **-5.1%** | TQQQ **-83%**

Full methodology + data: trademind.bot/results
_Past performance doesn't guarantee future results._`;
}

async function cmdRecord(): Promise<string> {
    const { rows } = await query(
        `SELECT signal_date, regime, confidence
         FROM whop_posts
         WHERE post_type = 'signal' AND regime IS NOT NULL
           AND signal_date >= CURRENT_DATE - INTERVAL '30 days'
         ORDER BY signal_date DESC
         LIMIT 15`
    );
    if (!rows.length) return '📊 No signal history available yet. Check back after the first signal drops.';

    const EMOJI: Record<string, string> = { BULL: '🟢', SIDEWAYS: '🟡', BEAR: '🔴' };
    const lines = rows.map((r: any) =>
        `• ${r.signal_date} — ${EMOJI[r.regime] ?? '📊'} **${r.regime}** (${r.confidence}% confidence)`
    );
    return `**TradeMind Signal Record — Last 30 Days**

${lines.join('\n')}

Full track record with returns: trademind.bot/results
_Past performance doesn't guarantee future results._`;
}

function cmdMethodology(): string {
    return `**How TradeMind's ML Regime Model Works**

1. Each day the model reads macro inputs: VIX level, SPY momentum, volume profile, and multi-timeframe trend indicators.

2. A trained classifier maps those inputs to one of three **market regimes**: BULL, SIDEWAYS, or BEAR.

3. Each regime has pre-optimized allocations across QQQ, QLD (2×), TQQQ (3×), and SGOV (cash) — sized for that regime's risk profile.

4. Backtested on 7 years (2018–2024) using walk-forward methodology — never trained on future data.
   Result: CAGR 27.8%, Max Drawdown -5.1%.

_We don't predict stock prices. We classify what kind of market we're in and position accordingly._

Questions? Ask in #general-chat.
_Educational analysis only. Not personalized investment advice._`;
}

function cmdReview(): string {
    return `**Enjoying TradeMind? Leave us a review 🙏**

Your honest feedback helps other traders find us and helps us improve.

→ Go to our Whop page and scroll to **Reviews**
→ whop.com/trademind

Takes 30 seconds. Thank you!`;
}

function cmdRefer(): string {
    return `**Earn commission by sharing TradeMind 💰**

As a member you earn **40% commission** on every trial you refer.

How to get your link:
→ Go to **whop.com/dashboard** → Affiliates
→ Find TradeMind and copy your unique referral link

Share it on TikTok, Twitter, or with trading friends.
You earn on the $15 trial AND if they convert to a monthly plan.

_Your $15 trial credit also applies toward your own subscription._`;
}

// ── Command map ───────────────────────────────────────────────────────────────

const COMMANDS: Record<string, () => Promise<string> | string> = {
    '!signal':      cmdSignal,
    '!regime':      cmdRegime,
    '!help':        cmdHelp,
    '!plan':        cmdPlan,
    '!backtest':    cmdBacktest,
    '!record':      cmdRecord,
    '!methodology': cmdMethodology,
    '!review':      cmdReview,
    '!refer':       cmdRefer,
};

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
    let body: any;
    try {
        body = await req.json();
    } catch {
        return new NextResponse('OK', { status: 200 });
    }

    const content: string = body?.content ?? body?.message ?? '';
    const channelId: string = body?.channel_id ?? body?.channel ?? '';

    // Only respond to ! commands
    if (!content.startsWith('!') || !channelId) {
        return new NextResponse('OK', { status: 200 });
    }

    const command = content.trim().toLowerCase().split(' ')[0];
    const handler = COMMANDS[command];

    if (handler) {
        try {
            const response = await handler();
            await postToWhopChannel(channelId, response);
        } catch (err) {
            console.error(`[Chat Bot] Error handling ${command}:`, err);
            await postToWhopChannel(channelId,
                '⚠️ Something went wrong fetching that data. Try again in a moment.'
            ).catch(() => {});
        }
    }

    return new NextResponse('OK', { status: 200 });
}
