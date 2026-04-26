/**
 * Whop Push Notification Helpers
 * ================================
 * All push notification calls go through this module.
 * Notifications appear in the Whop iOS/Android app and web UI.
 *
 * Requires WHOP_*_EXPERIENCE_ID env vars for targeting.
 */

import { whop } from '@/lib/whop';

const PAID_EXPERIENCES = [
    process.env.WHOP_CORE_EXPERIENCE_ID,
    process.env.WHOP_PRO_EXPERIENCE_ID,
    process.env.WHOP_BUNDLE_EXPERIENCE_ID,
].filter(Boolean) as string[];

const REGIME_EMOJI: Record<string, string> = {
    BULL:     '🟢',
    SIDEWAYS: '🟡',
    BEAR:     '🔴',
};

/** Daily 3PM signal notification — sent to all paid experience IDs */
export async function sendSignalPushNotification(signal: {
    regime:     string;
    confidence: number;
    tqqqAlloc?: number;
}): Promise<void> {
    if (!PAID_EXPERIENCES.length) {
        console.warn('[Whop Push] No experience IDs configured — skipping signal notification');
        return;
    }

    const emoji = REGIME_EMOJI[signal.regime] ?? '📊';
    const subtitle = signal.tqqqAlloc !== undefined
        ? `TQQQ: ${signal.tqqqAlloc}% | ${signal.confidence}% confidence`
        : `${signal.confidence}% confidence`;

    await Promise.allSettled(
        PAID_EXPERIENCES.map(experience_id =>
            whop.notifications.create({
                experience_id,
                title:    `${emoji} TurboCore: ${signal.regime} Signal`,
                subtitle,
                content:  'Tap to see today\'s full allocation and execute in 2 minutes.',
                rest_path: '/signal',
            })
        )
    );

    console.log(`[Whop Push] Signal notification sent (${signal.regime} ${signal.confidence}%)`);
}

/** Morning brief notification — sent to all paid experience IDs */
export async function sendMorningBriefPushNotification(regime: string, headline: string): Promise<void> {
    if (!PAID_EXPERIENCES.length) return;

    const emoji = REGIME_EMOJI[regime] ?? '📊';

    await Promise.allSettled(
        PAID_EXPERIENCES.map(experience_id =>
            whop.notifications.create({
                experience_id,
                title:    `${emoji} Morning Brief Ready`,
                subtitle: headline.substring(0, 80),
                content:  'Pre-market brief is live. Tap to read before the open.',
                rest_path: '/morning-brief',
            })
        )
    );

    console.log(`[Whop Push] Morning brief notification sent`);
}

/** Weekly debrief notification — targeted to Bundle experience only */
export async function sendWeeklyDebriefPushNotification(userId?: string): Promise<void> {
    const experienceId = process.env.WHOP_BUNDLE_EXPERIENCE_ID;
    if (!experienceId) return;

    const payload: any = {
        experience_id: experienceId,
        title:    '📈 Your Weekly Debrief is Ready',
        subtitle: 'Personalized performance review',
        content:  'See how your portfolio tracked TurboCore this week.',
        rest_path: '/debrief',
    };

    // If targeting a specific user only
    if (userId) payload.user_ids = [userId];

    await whop.notifications.create(payload).catch(e =>
        console.warn('[Whop Push] Weekly debrief notification failed (non-fatal):', e)
    );
}

/** Regime change alert — fires when the ML model detects a transition */
export async function sendRegimeChangePushNotification(
    oldRegime: string,
    newRegime: string
): Promise<void> {
    if (!PAID_EXPERIENCES.length) return;

    const emoji = REGIME_EMOJI[newRegime] ?? '⚠️';

    await Promise.allSettled(
        PAID_EXPERIENCES.map(experience_id =>
            whop.notifications.create({
                experience_id,
                title:    `${emoji} Regime Change: ${oldRegime} → ${newRegime}`,
                subtitle: 'TurboCore has detected a shift',
                content:  'Market conditions changed. Check today\'s allocation update.',
                rest_path: '/signal',
            })
        )
    );

    console.log(`[Whop Push] Regime change alert: ${oldRegime} → ${newRegime}`);
}
