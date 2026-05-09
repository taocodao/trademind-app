/**
 * Whop Webhook Handler
 * ====================
 * Handles all Whop membership lifecycle events.
 * Writes to the same user_settings table used by Stripe subscribers
 * so all existing tier-gating logic works without modification.
 *
 * Also maintains whop_trials table for the full trial lifecycle,
 * queues winback DMs, and sends magic link migration emails at Day 30.
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { whopPlanToTier, sendWhopDM } from '@/lib/whop';
import { query } from '@/lib/db';
import { issueCredits } from '@/lib/credits';
import { ensureReferralCode, recordReferralConversion, getReferrerByCode } from '@/lib/referrals';
import { PRICING } from '@/lib/pricing-config';
import { generateMigrationToken } from '@/lib/migration';

// Webhook verification is handled by the Whop SDK's unwrap method

export async function POST(req: NextRequest): Promise<NextResponse> {
    const body      = await req.text();
    const hdrs      = await headers();
    const headersObj = Object.fromEntries(hdrs.entries());

    let event: any;
    try {
        const secret = process.env.WHOP_WEBHOOK_SECRET ?? '';
        if (!secret) {
            console.warn('[Whop Webhook] WHOP_WEBHOOK_SECRET not set — skipping verification');
            event = JSON.parse(body);
        } else {
            event = await import('@/lib/whop').then(m => m.whop).then(whopClient =>
                whopClient.webhooks.unwrap(body, { headers: headersObj })
            );
        }
    } catch (err: any) {
        console.error('[Whop Webhook] Signature verification failed:', err.message);
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Whop sends event name in the 'type' field (or 'event'/'action' in older versions)
    const action = (event.type ?? event.event ?? event.action ?? '') as string;
    const data   = event.data ?? {};

    console.log(`[Whop Webhook] ${action} | user: ${data.user?.id ?? data.user_id ?? 'unknown'}`);

    switch (action) {
        // Membership activated — user paid, grant access + issue credits
        case 'membership_activated':
            await handleMemberActivated(data);
            break;

        // Membership deactivated — revoke access, send migration link
        case 'membership_deactivated':
            await handleMemberCancelled(data);
            break;

        // Subscription set to cancel at period end — send retention DM early
        case 'membership_cancel_at_period_end_changed':
            if (data.cancel_at_period_end === true) {
                await sendWhopDM(
                    data.user?.id ?? data.user_id,
                    `Hey — we noticed you turned off renewal. Before your access ends, reply "deal" for 30% off your next month, or "pause" to hold your spot for 30 days at no charge.`
                ).catch(() => {});
            }
            break;

        // Payment events — membership_activated handles access; just log these
        case 'payment_succeeded':
            console.log(`[Whop Webhook] Payment succeeded for ${data.user?.id ?? data.user_id}`);
            break;
        case 'payment_failed':
            console.log(`[Whop Webhook] Payment failed for ${data.user?.id ?? data.user_id}`);
            break;

        default:
            console.log(`[Whop Webhook] Unhandled event: ${action}`);
    }

    // Log to whop_events for analytics (non-fatal)
    await query(
        `INSERT INTO whop_events (event_type, user_id, metadata, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [action, data.user?.id ?? data.user_id ?? null, JSON.stringify(data)]
    ).catch(() => {});

    return NextResponse.json({ received: true });
}

// ── Handlers ──────────────────────────────────────────────────────────────────

async function handleMemberActivated(data: any) {
    const user       = data.user ?? {};
    const planId     = data.plan_id ?? data.membership?.plan_id ?? '';
    const tier       = whopPlanToTier(planId);
    const userId     = user.id ?? data.user_id;
    const email      = user.email ?? '';
    const name       = user.name ?? user.username ?? '';
    const firstName  = name.split(' ')[0] ?? 'Trader';
    const membershipId = data.id ?? data.membership_id ?? '';

    // trial_ends_at from Whop payload (renewal_period_end or expires_at)
    const trialEndsAt = data.renewal_period_end
        ? new Date(data.renewal_period_end)
        : data.expires_at
        ? new Date(data.expires_at)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // fallback: +30 days

    if (!userId) {
        console.error('[Whop Webhook] No user_id in activation event');
        return;
    }

    // 1. Upsert into user_settings (same table as Stripe subscribers)
    await query(
        `INSERT INTO user_settings
            (user_id, email, first_name, subscription_tier, billing_source, auth_provider, whop_user_id, whop_plan_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'whop', 'whop', $5, $6, NOW(), NOW())
         ON CONFLICT (user_id) DO UPDATE SET
            subscription_tier = EXCLUDED.subscription_tier,
            billing_source    = 'whop',
            whop_user_id      = EXCLUDED.whop_user_id,
            whop_plan_id      = EXCLUDED.whop_plan_id,
            updated_at        = NOW()`,
        [userId, email, firstName, tier, userId, planId]
    );

    // 2. Upsert into whop_trials for full lifecycle tracking
    await query(
        `INSERT INTO whop_trials
            (whop_user_id, whop_member_id, whop_membership_id, email, name, trial_started_at, trial_ends_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), $6)
         ON CONFLICT (whop_user_id) DO UPDATE SET
            trial_ends_at      = EXCLUDED.trial_ends_at,
            whop_membership_id = EXCLUDED.whop_membership_id`,
        [userId, data.member?.id ?? '', membershipId, email, name, trialEndsAt.toISOString()]
    );

    // 3. Record trial conversion (legacy table — kept for existing queries)
    await query(
        `INSERT INTO trial_conversions
            (user_id, trial_source, trial_started_at, converted, converted_plan, converted_at)
         VALUES ($1, 'whop', NOW(), FALSE, $2, NULL)
         ON CONFLICT DO NOTHING`,
        [userId, tier]
    );

    // 4. Ensure referral code exists
    await ensureReferralCode(userId, firstName).catch(e =>
        console.warn('[Whop] Referral code generation failed:', e)
    );

    // 5. Issue $15 trial bonus credits if this is the trial plan
    const isTrialPlan = planId === (process.env.WHOP_PLAN_TRIAL ?? '');
    if (isTrialPlan) {
        await issueCredits(userId, PRICING.trial.creditCents, 'trial_bonus').catch(() => {});
    }

    // 6. Handle referral attribution
    const referralCode = data.metadata?.referral_code ?? data.referral_code ?? '';
    if (referralCode) {
        const referrer = await getReferrerByCode(referralCode).catch(() => null);
        if (referrer) {
            await recordReferralConversion(
                referrer.userId, userId, referralCode, 'whop', tier
            ).catch(e => console.warn('[Whop] Referral record failed:', e));
        }
    }

    // 7. Send welcome DM with trial end date
    const endDate = trialEndsAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    await sendWhopDM(userId,
        `👋 **Welcome to TradeMind, ${firstName}!**

Your 30-day trial runs until **${endDate}**. Here's what to do right now:

**1. Turn on push notifications** — that's how the 3 PM TurboCore signal reaches you every trading day.

**2. Check #morning-brief** every day at 8:15 AM ET before market open.

**3. When the 3 PM signal drops** — execute in any brokerage in under 2 minutes.

**4. Start TurboCore 101** — the course in the Courses tab covers the full strategy in 30 minutes.

---
On **${endDate}**, you'll get a link to continue on trademind.bot — no new signup needed, your history carries over.

Questions? Ask in #general-chat.

_Educational analysis only. Not personalized investment advice._`
    );

    // 8. Send welcome email via Resend (non-fatal)
    if (process.env.RESEND_API_KEY && email) {
        await sendWelcomeEmail({ to: email, name: firstName, trialEndsAt }).catch(e =>
            console.warn('[Whop] Welcome email failed (non-fatal):', e)
        );
    }

    // 9. Queue mid-trial drip messages
    // Day 3: signal recap check-in
    // Day 7: mid-trial check-in + review request
    const upgradeUrl = process.env.NEXT_PUBLIC_APP_URL
        ? `${process.env.NEXT_PUBLIC_APP_URL}/upgrade`
        : 'https://trademind.bot/upgrade';

    await query(
        `INSERT INTO scheduled_messages (user_id, message_type, send_at, content)
         VALUES ($1, 'mid_trial_day3', NOW() + INTERVAL '3 days', $2)`,
        [
            userId,
            `👋 Hey ${firstName} — quick check-in after your first 3 days.\n\n` +
            `You should have received your first TurboCore signals by now. ` +
            `If you missed any, type **!signal** in chat to see the latest allocation.\n\n` +
            `**A few things to try this week:**\n` +
            `• Type \`!regime\` to see the current market regime\n` +
            `• Type \`!backtest\` to see the 7-year strategy performance\n` +
            `• Check TurboCore 101 in the Courses tab\n\n` +
            `Questions? Reply here or ask in #general-chat.\n\n` +
            `_Educational analysis only. Not personalized investment advice._`,
        ]
    ).catch(() => {});

    await query(
        `INSERT INTO scheduled_messages (user_id, message_type, send_at, content)
         VALUES ($1, 'mid_trial_day7', NOW() + INTERVAL '7 days', $2)`,
        [
            userId,
            `📊 **Week 1 complete, ${firstName}.**\n\n` +
            `You've been following TurboCore signals for 7 days. ` +
            `Here's a reminder of what you're testing:\n\n` +
            `• **CAGR 27.8%** over 7 years\n` +
            `• **Max Drawdown -5.1%** (vs TQQQ -83% in 2022)\n` +
            `• **Win Rate 86%** — 6 of 7 years positive\n\n` +
            `If you're finding value, we'd love a review — it helps other traders find TradeMind:\n` +
            `→ Type **!review** in chat for the link\n\n` +
            `23 days left in your trial. When it ends you'll get a link to continue on trademind.bot.\n` +
            `Plans from $29/mo: ${upgradeUrl}\n\n` +
            `_Educational analysis only. Not personalized investment advice._`,
        ]
    ).catch(() => {});

    console.log(`[Whop] ✅ Member activated: ${email} → ${tier} (trial ends ${endDate})`);
}

async function handleMemberCancelled(data: any) {
    const userId = data.user?.id ?? data.user_id;
    const email  = data.user?.email ?? '';
    if (!userId) return;

    // 1. Revoke access
    await query(
        `UPDATE user_settings SET subscription_tier = 'observer', updated_at = NOW()
         WHERE whop_user_id = $1`,
        [userId]
    );

    // 2. Mark trial as ended
    await query(
        `UPDATE trial_conversions SET trial_ended_at = NOW()
         WHERE user_id = $1 AND trial_ended_at IS NULL`,
        [userId]
    );

    // 3. Generate a magic link for trademind.bot migration
    let magicLink: string | null = null;
    try {
        // Get trial record for migration token
        const trialResult = await query(
            `SELECT id, email FROM whop_trials WHERE whop_user_id = $1`,
            [userId]
        );
        const trial = trialResult.rows[0];
        const resolvedEmail = trial?.email ?? email;

        if (resolvedEmail) {
            const token = await generateMigrationToken({
                email:        resolvedEmail,
                whop_user_id: userId,
                trial_id:     trial?.id ?? userId,
            });
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://trademind.bot';
            magicLink = `${baseUrl}/api/auth/migrate?token=${token}`;

            // Mark migration link as sent
            await query(
                `UPDATE whop_trials SET migration_sent_at = NOW()
                 WHERE whop_user_id = $1`,
                [userId]
            );
        }
    } catch (e) {
        console.warn('[Whop] Migration token generation failed:', e);
    }

    // 4. Send migration DM (Whop DM may fail if access expired — non-fatal)
    const name = data.user?.name ?? data.user?.username ?? '';
    const firstName = name.split(' ')[0] || 'Trader';
    await sendWhopDM(userId, buildMigrationDm(firstName, magicLink)).catch(() => {});

    // 5. Send migration email (primary channel — always works)
    const resolvedEmail = data.user?.email ?? email;
    if (process.env.RESEND_API_KEY && resolvedEmail && magicLink) {
        await sendMigrationEmail({
            to:        resolvedEmail,
            name:      firstName,
            magicLink,
        }).catch(e => console.warn('[Whop] Migration email failed (non-fatal):', e));
    }

    // 6. Queue winback DM for 48 hours later
    await query(
        `INSERT INTO scheduled_messages (user_id, message_type, send_at)
         VALUES ($1, 'winback', NOW() + INTERVAL '48 hours')`,
        [userId]
    ).catch(() => {});

    // 7. Queue T+7 survey DM — second re-engagement touch after churn
    const upgradeUrl = process.env.NEXT_PUBLIC_APP_URL
        ? `${process.env.NEXT_PUBLIC_APP_URL}/upgrade`
        : 'https://trademind.bot/upgrade';
    await query(
        `INSERT INTO scheduled_messages (user_id, message_type, send_at, content)
         VALUES ($1, 'churn_survey_day7', NOW() + INTERVAL '7 days', $2)`,
        [
            userId,
            `Quick question — what would have made TradeMind worth keeping?\n\n` +
            `Reply with a number:\n` +
            `1️⃣ Price was too high\n` +
            `2️⃣ Didn't see enough signals\n` +
            `3️⃣ Technical issues\n` +
            `4️⃣ Found a better alternative\n\n` +
            `Your feedback genuinely helps us improve.\n\n` +
            `Changed your mind? Re-activate here: ${upgradeUrl}`,
        ]
    ).catch(() => {});

    console.log(`[Whop] Member deactivated: ${userId} — magic link sent`);
}

// ── Message builders ──────────────────────────────────────────────────────────

function buildMigrationDm(firstName: string, magicLink: string | null): string {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://trademind.bot';
    const link = magicLink ?? `${baseUrl}/upgrade`;

    return `⏰ **Your TradeMind 30-day trial has ended.**

Thanks for being part of the community, ${firstName}.

Your account on **trademind.bot** is already set up with your trial history. Click the link below to continue — no new signup required:

👉 ${link}

**Choose your plan:**
• **TurboCore** $29/mo — daily signals, morning brief, auto-execution
• **TurboCore Pro** $49/mo — signals + LEAPS + enhanced ML
• **Both Bundle** $69/mo — everything, unlimited

The link is valid for 7 days. Your $15 trial credit converts to bonus days at checkout.

_Educational analysis only. Not personalized investment advice._`;
}

// ── Email helpers ─────────────────────────────────────────────────────────────

async function sendWelcomeEmail(params: {
    to:          string;
    name:        string;
    trialEndsAt: Date;
}): Promise<void> {
    const endDate = params.trialEndsAt.toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric',
    });
    const upgradeUrl = process.env.NEXT_PUBLIC_APP_URL
        ? `${process.env.NEXT_PUBLIC_APP_URL}/upgrade`
        : 'https://trademind.bot/upgrade';

    await fetch('https://api.resend.com/emails', {
        method:  'POST',
        headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type':  'application/json',
        },
        body: JSON.stringify({
            from:    'TradeMind <support@trademind.bot>',
            to:      [params.to],
            subject: 'Welcome to TradeMind — your 30-day trial starts now',
            html: `
<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,sans-serif;background:#0a0a0a;color:#fff;padding:32px;max-width:600px;margin:0 auto">
  <h2 style="color:#7c3aed">Welcome to TradeMind, ${params.name}! 🎯</h2>
  <p>Your 30-day trial is now active and runs until <strong>${endDate}</strong>.</p>
  <p><strong>What to do first:</strong></p>
  <ul>
    <li>Turn on push notifications for Whop — that's how the 3 PM signal reaches you</li>
    <li>Check #morning-brief on Whop every day at 8:15 AM ET</li>
    <li>Start TurboCore 101 in the Courses tab</li>
  </ul>
  <p>On <strong>${endDate}</strong>, you'll receive a magic link to continue on trademind.bot where the full platform lives. Your $15 trial converts to bonus subscription days at checkout.</p>
  <a href="${upgradeUrl}" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">
    Preview Plans →
  </a>
  <p style="color:#888;font-size:12px;margin-top:32px">TradeMind · Educational analysis only · Not personalized investment advice</p>
</body>
</html>`,
        }),
    });
}

async function sendMigrationEmail(params: {
    to:        string;
    name:      string;
    magicLink: string;
}): Promise<void> {
    await fetch('https://api.resend.com/emails', {
        method:  'POST',
        headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type':  'application/json',
        },
        body: JSON.stringify({
            from:    'TradeMind <support@trademind.bot>',
            to:      [params.to],
            subject: 'Your TradeMind trial has ended — continue here',
            html: `
<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,sans-serif;background:#0a0a0a;color:#fff;padding:32px;max-width:600px;margin:0 auto">
  <h2 style="color:#f97316">Your 30-day trial has ended</h2>
  <p>Hey ${params.name},</p>
  <p>Thanks for trying TradeMind. Your account is already set up on trademind.bot — click below to continue, no new signup needed:</p>
  <a href="${params.magicLink}" style="display:inline-block;background:#7c3aed;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0;font-size:16px">
    Continue on TradeMind →
  </a>
  <p><strong>Plans:</strong></p>
  <ul>
    <li>TurboCore: $29/mo</li>
    <li>TurboCore Pro: $49/mo</li>
    <li>Both Bundle: $69/mo</li>
  </ul>
  <p>Your $15 trial fee converts to bonus subscription days — use code <strong>TRIALBACK15</strong> at checkout.</p>
  <p style="color:#888;font-size:12px">Link valid for 7 days. TradeMind · Educational analysis only · Not personalized investment advice</p>
</body>
</html>`,
        }),
    });
}
