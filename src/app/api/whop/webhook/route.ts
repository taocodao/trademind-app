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
import { whopPlanToTier, whopPlanTrialDays, extractProductSlug, isWhopTrialProduct, sendWhopDM } from '@/lib/whop';
import { query } from '@/lib/db';
import { issueCredits } from '@/lib/credits';
import { ensureReferralCode, recordReferralConversion, getReferrerByCode } from '@/lib/referrals';
import { PRICING } from '@/lib/pricing-config';
import { generateMigrationToken } from '@/lib/migration';

// Webhook verification is handled by the Whop SDK's unwrap method

export async function POST(req: NextRequest): Promise<NextResponse> {
    try {
        const body      = await req.text();
        const hdrs      = await headers();
        const headersObj = Object.fromEntries(hdrs.entries());

        // Log raw payload for debugging regardless of verification outcome
        console.log('[Whop Webhook] Received POST, body length:', body.length, '| first 200 chars:', body.slice(0, 200));

        let event: any;
        const secret = process.env.WHOP_WEBHOOK_SECRET ?? '';
        if (!secret) {
            console.warn('[Whop Webhook] WHOP_WEBHOOK_SECRET not set — skipping verification');
            event = JSON.parse(body);
        } else {
            try {
                event = await import('@/lib/whop').then(m => m.whop).then(whopClient =>
                    whopClient.webhooks.unwrap(body, { headers: headersObj })
                );
            } catch (sigErr: any) {
                // Signature failed — try parsing anyway and log for debugging
                console.error('[Whop Webhook] Signature verification failed:', sigErr.message, '| Attempting raw parse for debug');
                try { event = JSON.parse(body); }
                catch { return NextResponse.json({ error: 'Invalid signature and invalid JSON' }, { status: 401 }); }
                // Re-log parsed event so we can see what Whop is actually sending
                console.log('[Whop Webhook] Raw parsed event (sig failed):', JSON.stringify(event).slice(0, 500));
            }
        }

        // Whop v1 API uses dot notation: 'membership.activated'
        // Some older event versions used underscore: 'membership_activated'
        // We handle both for safety.
        const action = (event.type ?? event.event ?? event.action ?? '') as string;
        const data   = event.data ?? {};
        const userEmail = data.user?.email ?? data.email ?? 'unknown';
        const userId    = data.user?.id ?? data.user_id ?? 'unknown';

        console.log(`[Whop Webhook] event="${action}" user=${userId} email=${userEmail}`);

        switch (action) {
            // Membership activated (dot notation — Whop v1 current)
            case 'membership.activated':
            // Legacy underscore fallback
            case 'membership_activated':
                await handleMemberActivated(data);
                break;

            // Payment succeeded — also trigger activation in case membership event is missed
            case 'payment.succeeded':
            case 'payment_succeeded':
                console.log(`[Whop Webhook] Payment succeeded for ${userId} (${userEmail})`);
                // payment.succeeded fires before membership.activated — activation handled there
                break;

            // Membership deactivated
            case 'membership.went_invalid':
            case 'membership_deactivated':
                await handleMemberCancelled(data);
                break;

            // Cancel at period end
            case 'membership.cancel_at_period_end_changed':
            case 'membership_cancel_at_period_end_changed':
                if (data.cancel_at_period_end === true) {
                    await sendWhopDM(
                        userId,
                        `Hey — we noticed you turned off renewal. Before your access ends, reply "deal" for 30% off your next month, or "pause" to hold your spot for 30 days at no charge.`
                    ).catch(() => {});
                }
                break;

            case 'payment.failed':
            case 'payment_failed':
                console.log(`[Whop Webhook] Payment failed for ${userId} (${userEmail})`);
                break;

            default:
                console.log(`[Whop Webhook] Unhandled event: "${action}" — full payload keys: ${Object.keys(event).join(', ')}`);
        }

        // Log to whop_events for analytics (non-fatal)
        await query(
            `INSERT INTO whop_events (event_type, user_id, metadata, created_at)
             VALUES ($1, $2, $3, NOW())`,
            [action, data.user?.id ?? data.user_id ?? null, JSON.stringify(data)]
        ).catch(() => {});

        return NextResponse.json({ received: true });
    } catch (err: any) {
        console.error('[Whop Webhook] Unhandled exception:', err.message, err.stack);
        return NextResponse.json({ error: 'Internal Server Error', message: err.message, stack: err.stack }, { status: 500 });
    }
}

// ── Handlers ──────────────────────────────────────────────────────────────────

async function handleMemberActivated(data: any) {
    const user         = data.user ?? {};

    // ── Primary: extract product URL slug (from Whop dashboard "Product URL" field)
    // This is the human-readable slug, e.g. "trademind-algo-signals-30day"
    // It's more stable than plan IDs and requires no env var configuration.
    // extractProductSlug() checks all known Whop payload locations.
    const productSlug = extractProductSlug(data);

    // Keep plan_id available as a secondary key (stored in DB, used for logging)
    const planId       = data.plan_id ?? data.plan?.id ?? data.membership?.plan_id ?? '';
    const slugOrId     = productSlug || planId; // use slug preferentially

    const userId       = user.id ?? data.user_id;
    const email        = user.email ?? '';
    const name         = user.name ?? user.username ?? '';
    const firstName    = name.split(' ')[0] ?? 'Trader';
    const membershipId = data.id ?? data.membership_id ?? '';

    console.log(`[Whop Webhook] Activation — slug: "${productSlug}", plan_id: "${planId}", user: ${userId}`);

    if (!userId) {
        console.error('[Whop Webhook] No user_id in activation event');
        return;
    }

    // ── Observer (free) plan branch ──────────────────────────────────────────
    const observerPlanId = process.env.WHOP_PLAN_OBSERVER ?? '';
    if (observerPlanId && planId === observerPlanId) {
        await handleObserverActivated({ userId, email, firstName });
        return;
    }

    // ── Paid trial branch (default) ──────────────────────────────────────
    // whopPlanToTier and whopPlanTrialDays use the slug (or plan ID as fallback)
    const tier      = whopPlanToTier(slugOrId);
    const trialDays = whopPlanTrialDays(slugOrId); // 60 for free-trial slug, 30 for 30day slug
    const trialEndsAt = data.renewal_period_end
        ? new Date(data.renewal_period_end)
        : data.expires_at
        ? new Date(data.expires_at)
        : new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);

    await query(
        `INSERT INTO user_settings
            (user_id, email, first_name, subscription_tier, subscription_status,
             billing_source, auth_provider, whop_user_id, whop_plan_id,
             whop_trial_ends_at, whop_trial_days, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'active', 'whop', 'whop', $5, $6, $7, $8, NOW(), NOW())
         ON CONFLICT (user_id) DO UPDATE SET
            subscription_tier   = EXCLUDED.subscription_tier,
            subscription_status = 'active',
            billing_source      = 'whop',
            whop_user_id        = EXCLUDED.whop_user_id,
            whop_plan_id        = EXCLUDED.whop_plan_id,
            whop_trial_ends_at  = EXCLUDED.whop_trial_ends_at,
            whop_trial_days     = EXCLUDED.whop_trial_days,
            updated_at          = NOW()`,
        [userId, email, firstName, tier, userId, planId, trialEndsAt.toISOString(), trialDays]
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

    // 3. Issue trial bonus credits ($10 or $20 depending on product)
    // Uses isWhopTrialProduct() which matches by slug — no env vars needed.
    if (isWhopTrialProduct(slugOrId)) {
        // $20 credit for 60-day product, $10 for 30-day product
        const creditCents = trialDays === 60 ? 2000 : 1000;
        await issueCredits(userId, creditCents, 'trial_bonus').catch(() => {});
        console.log(`[Whop] Trial bonus: $${creditCents/100} issued to ${userId} (${trialDays}-day plan)`);
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

    // 7. Send welcome DM with trial end date and correct duration
    const endDate = trialEndsAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    await sendWhopDM(userId,
        `👋 **Welcome to TradeMind, ${firstName}!**

Your **${trialDays}-day Full Access trial** runs until **${endDate}**. You have complete access to all 3 strategies.

**Start here:**

**1. Turn on push notifications** — the TurboCore signal arrives at 3 PM ET every trading day.

**2. Check #morning-brief** every day at 8:15 AM ET before market open.

**3. When the 3 PM signal drops** — execute in any brokerage in under 2 minutes.

**4. Start TurboCore 101** — the 30-minute course in the Courses tab.

---
On **${endDate}**, you'll get a magic link to continue on trademind.bot.
Your **$${trialDays === 60 ? 20 : 10} trial fee converts to bonus subscription days** at checkout — no wasted money.

**Plans after trial:**
• Turbo Core + Pro  $69/mo
• QQQ LEAPS         $59/mo
• Full Access (all) $100/mo  ← same as your trial
Yearly plans: 30% off · 2-year: 40% off

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

    // Day 7: dynamic — cron builds this with the actual signal from 7 days ago
    await query(
        `INSERT INTO scheduled_messages (user_id, message_type, send_at)
         VALUES ($1, 'mid_trial_day7_dynamic', NOW() + INTERVAL '7 days')`,
        [userId]
    ).catch(() => {});

    console.log(`[Whop] Member activated: ${email} -> ${tier} (trial ends ${endDate})`);
}

// ── Observer (free) tier activation ───────────────────────────────────────────
async function handleObserverActivated({ userId, email, firstName }: {
    userId: string; email: string; firstName: string;
}) {
    const upgradeUrl = process.env.NEXT_PUBLIC_APP_URL
        ? `${process.env.NEXT_PUBLIC_APP_URL}/upgrade`
        : 'https://trademind.bot/upgrade';

    // Upsert as observer tier — open-ended access (no renewal_period_end logic)
    await query(
        `INSERT INTO user_settings
             (user_id, email, subscription_tier, subscription_status, billing_source, auth_provider, whop_user_id, created_at, updated_at)
         VALUES ($1, $2, 'observer', 'active', 'whop', 'whop', $1, NOW(), NOW())
         ON CONFLICT (user_id) DO UPDATE SET
             subscription_tier = LEAST(user_settings.subscription_tier, 'observer'),
             updated_at        = NOW()`,
        [userId, email]
    );

    // FOMO welcome DM — show what paid members get, CTA to $15 trial
    await sendWhopDM(userId,
        `Welcome to TradeMind Observer, ${firstName}!

You can see the #daily-regime-preview and #wins-and-misses channels, where you'll get context on how the ML regime model reads the market.

Here's what paid trial members get that you don't see yet:
• Full TurboCore allocation (QQQ / QLD / TQQQ / SGOV %) every day at 3 PM ET
• Live chatbot commands: !signal, !regime, !backtest, !record
• Morning brief at 8:15 AM ET before market open
• TurboCore 101 course in the Courses tab

The $15 trial unlocks all of that for 30 full days:
-> ${upgradeUrl}

Questions? Ask in #general-chat.

_Educational analysis only. Not personalized investment advice._`
    ).catch(() => {});

    console.log(`[Whop] Observer activated: ${email} (${userId})`);
}

async function handleMemberCancelled(data: any) {
    const userId = data.user?.id ?? data.user_id;
    const email  = data.user?.email ?? '';
    if (!userId) return;

    // 1. Revoke access (set status + tier)
    await query(
        `UPDATE user_settings
         SET subscription_tier   = 'observer',
             subscription_status = 'canceled',
             updated_at          = NOW()
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

    return `⏰ **Your TradeMind trial has ended.**

Thanks for being part of the community, ${firstName}.

Your account on **trademind.bot** is already set up with your trial history. Click the link below to continue — no new signup required:

👉 ${link}

**Choose your plan:**
• **Turbo Core + Pro** $69/mo — TurboCore signal + IV-Switching options
• **QQQ LEAPS**        $59/mo — ML-powered LEAPS ENTER / EXIT signals
• **Full Access**      $100/mo — all 3 strategies (same as your trial)

**Yearly plans: 30% off · 2-year: 40% off**

Your trial fee ($10 or $20) converts to **bonus subscription days** — no money wasted.

Link valid for 7 days.

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
