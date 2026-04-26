/**
 * Day 25 Trial Warning Cron
 * ==========================
 * GET /api/cron/trial-warning
 * Schedule: 0 14 * * *  (9 AM ET daily)
 *
 * Finds all active trials ending within 5–6 days that haven't
 * received a warning yet, and sends them a Whop DM + Resend email.
 *
 * Idempotent: warning_sent_at is set after first successful send,
 * preventing duplicate warnings if the cron fires twice in a day.
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { sendWhopDM } from '@/lib/whop';

export const dynamic = 'force-dynamic';

const UPGRADE_URL = process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/upgrade`
    : 'https://trademind.bot/upgrade';

export async function GET(req: NextRequest): Promise<NextResponse> {
    // Auth check — Vercel Cron passes this automatically
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Trials ending in 5–6 days that haven't been warned yet
    const warningWindowStart = new Date();
    const warningWindowEnd   = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000);

    const { rows: trialsToWarn } = await query(
        `SELECT id, whop_user_id, email, name, trial_ends_at
         FROM whop_trials
         WHERE trial_ends_at BETWEEN $1 AND $2
           AND warning_sent_at IS NULL
           AND migrated = FALSE`,
        [warningWindowStart.toISOString(), warningWindowEnd.toISOString()]
    );

    let warned = 0;
    const errors: string[] = [];

    for (const trial of trialsToWarn) {
        const daysLeft = Math.ceil(
            (new Date(trial.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        const firstName = (trial.name ?? 'Trader').split(' ')[0];
        const endDate = new Date(trial.trial_ends_at).toLocaleDateString('en-US', {
            month: 'long', day: 'numeric',
        });

        const dmContent =
`⏰ **Your TradeMind trial ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''} (${endDate}).**

You've been getting daily TurboCore signals and the morning brief. When your trial ends, you'll get a link to continue on **trademind.bot** — no new signup needed, your history stays intact.

**Plans from $29/mo.** Your $15 trial converts to bonus days at checkout:
${UPGRADE_URL}

_Keep following the signals until then._`;

        try {
            // Whop DM (non-fatal)
            await sendWhopDM(trial.whop_user_id, dmContent);

            // Resend email (non-fatal — only if RESEND_API_KEY is configured)
            if (process.env.RESEND_API_KEY && trial.email) {
                await sendTrialWarningEmail({
                    to:        trial.email,
                    name:      firstName,
                    daysLeft,
                    endDate,
                    upgradeUrl: UPGRADE_URL,
                }).catch(e => console.warn('[Trial Warning] Email failed (non-fatal):', e));
            }

            // Mark as warned
            await query(
                `UPDATE whop_trials SET warning_sent_at = NOW() WHERE id = $1`,
                [trial.id]
            );

            warned++;
            console.log(`[Trial Warning] Sent to ${trial.email} (${daysLeft} days left)`);
        } catch (err: any) {
            errors.push(`${trial.email}: ${err.message}`);
            console.error('[Trial Warning] Failed for', trial.email, err);
        }
    }

    return NextResponse.json({ warned, errors: errors.length ? errors : undefined });
}

// ── Email helper ──────────────────────────────────────────────────────────────

async function sendTrialWarningEmail(params: {
    to:         string;
    name:       string;
    daysLeft:   number;
    endDate:    string;
    upgradeUrl: string;
}): Promise<void> {
    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type':  'application/json',
        },
        body: JSON.stringify({
            from:    'TradeMind <support@trademind.bot>',
            to:      [params.to],
            subject: `Your TradeMind trial ends in ${params.daysLeft} days`,
            html: `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, sans-serif; background: #0a0a0a; color: #fff; padding: 32px; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #f97316;">⏰ Your trial ends in ${params.daysLeft} days</h2>
  <p>Hey ${params.name},</p>
  <p>Your 30-day TradeMind trial ends on <strong>${params.endDate}</strong>.</p>
  <p>When it does, you'll get a magic link to continue on trademind.bot — your signal history and virtual portfolio carry over automatically.</p>
  <p>Your <strong>$15 trial fee</strong> converts to bonus subscription days at checkout. No extra cost.</p>
  <a href="${params.upgradeUrl}" style="display: inline-block; background: #7c3aed; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 16px 0;">
    See Plans →
  </a>
  <p style="color: #888; font-size: 12px; margin-top: 32px;">
    TradeMind · Educational analysis only · Not personalized investment advice
  </p>
</body>
</html>`,
        }),
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Resend error: ${err}`);
    }
}
