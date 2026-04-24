/**
 * Whop Webhook Handler
 * ====================
 * Handles all Whop membership lifecycle events.
 * Writes to the same user_settings table used by Stripe subscribers
 * so all existing tier-gating logic works without modification.
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { whopPlanToTier, sendWhopDM } from '@/lib/whop';
import { query } from '@/lib/db';
import { issueCredits } from '@/lib/credits';
import { ensureReferralCode, recordReferralConversion, getReferrerByCode } from '@/lib/referrals';
import { PRICING } from '@/lib/pricing-config';

// Whop signs webhooks with HMAC — always verify before processing
async function verifyWhopSignature(body: string, signature: string): Promise<boolean> {
    const secret = process.env.WHOP_WEBHOOK_SECRET ?? '';
    if (!secret) {
        console.warn('[Whop Webhook] WHOP_WEBHOOK_SECRET not set — skipping verification');
        return true; // fail-open in dev; remove for prod
    }
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
    );
    const sigBytes = Buffer.from(signature.replace('sha256=', ''), 'hex');
    return crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(body));
}

export async function POST(req: NextRequest): Promise<NextResponse> {
    const body      = await req.text();
    const hdrs      = await headers();
    const signature = hdrs.get('whop-signature') ?? '';

    const valid = await verifyWhopSignature(body, signature);
    if (!valid) {
        console.error('[Whop Webhook] Signature verification failed');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    let event: any;
    try {
        event = JSON.parse(body);
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const action = event.action as string;
    const data   = event.data ?? {};

    console.log(`[Whop Webhook] ${action} | user: ${data.user?.id ?? data.user_id ?? 'unknown'}`);

    switch (action) {
        case 'membership.went_valid':
            await handleMemberActivated(data);
            break;
        case 'membership.went_invalid':
            await handleMemberCancelled(data);
            break;
        case 'membership.renewed':
            console.log(`[Whop Webhook] Renewal logged for ${data.user_id}`);
            break;
        case 'payment.succeeded':
            // Tier already set by membership.went_valid — just log
            console.log(`[Whop Webhook] Payment succeeded for ${data.user?.id}`);
            break;
        default:
            console.log(`[Whop Webhook] Unhandled event: ${action}`);
    }

    return NextResponse.json({ received: true });
}

// ── Handlers ──────────────────────────────────────────────────────────────────

async function handleMemberActivated(data: any) {
    const user    = data.user ?? {};
    const planId  = data.plan_id ?? data.membership?.plan_id ?? '';
    const tier    = whopPlanToTier(planId);
    const userId  = user.id ?? data.user_id;
    const email   = user.email ?? '';
    const name    = user.name ?? '';
    const firstName = name.split(' ')[0] ?? 'Trader';

    if (!userId) {
        console.error('[Whop Webhook] No user_id in membership.went_valid event');
        return;
    }

    // Upsert into user_settings — same table as Stripe subscribers
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

    // Record trial conversion
    await query(
        `INSERT INTO trial_conversions
            (user_id, trial_source, trial_started_at, converted, converted_plan, converted_at)
         VALUES ($1, 'whop', NOW(), FALSE, $2, NULL)
         ON CONFLICT DO NOTHING`,
        [userId, tier]
    );

    // Ensure referral code exists for this user
    await ensureReferralCode(userId, firstName).catch(e =>
        console.warn('[Whop] Referral code generation failed:', e)
    );

    // Issue $15 trial bonus credits (1500 cents) if this is the trial plan
    const isTrialPlan = planId === (process.env.WHOP_PLAN_TRIAL ?? '');
    if (isTrialPlan) {
        await issueCredits(userId, PRICING.trial.creditCents, 'trial_bonus').catch(() => {});
    }

    // Handle referral attribution if present
    const referralCode = data.metadata?.referral_code ?? data.referral_code ?? '';
    if (referralCode) {
        const referrer = await getReferrerByCode(referralCode).catch(() => null);
        if (referrer) {
            await recordReferralConversion(
                referrer.userId, userId, referralCode,
                'whop', tier
            ).catch(e => console.warn('[Whop] Referral record failed:', e));
        }
    }

    // Send welcome DM
    await sendWhopDM(userId,
        `Welcome to TradeMind! 🎯 Your first signal drops today at 3 PM ET — ` +
        `watch for it in the Signal Alerts channel. Open the app here: https://trademind.bot/dashboard`
    );

    console.log(`[Whop] ✅ Member activated: ${email} → ${tier}`);
}

async function handleMemberCancelled(data: any) {
    const userId = data.user?.id ?? data.user_id;
    if (!userId) return;

    await query(
        `UPDATE user_settings SET subscription_tier = 'observer', updated_at = NOW()
         WHERE whop_user_id = $1`,
        [userId]
    );

    // Mark trial as not converted
    await query(
        `UPDATE trial_conversions SET trial_ended_at = NOW()
         WHERE user_id = $1 AND trial_ended_at IS NULL`,
        [userId]
    );

    // Churn-save DM
    await sendWhopDM(userId,
        `Before you go — reply "pause" to hold your account 30 days at no charge, ` +
        `or "deal" for 30% off next month. Your signal history stays intact either way.`
    );

    console.log(`[Whop] Member deactivated: ${userId}`);
}
