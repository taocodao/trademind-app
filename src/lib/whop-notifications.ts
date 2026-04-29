/**
 * Whop Push Notification Helpers
 * ================================
 * All push notification calls go through this module.
 * Notifications appear in the Whop iOS/Android app and web UI.
 *
 * Requires WHOP_*_EXPERIENCE_ID env vars for targeting.
 */

import { whop } from '@/lib/whop';

const CORE_EXPERIENCES: string[]   = [process.env.WHOP_CORE_EXPERIENCE_ID].filter(Boolean) as string[];
const PRO_EXPERIENCES: string[]    = [process.env.WHOP_PRO_EXPERIENCE_ID].filter(Boolean) as string[];
const LEAPS_EXPERIENCES: string[]  = [process.env.WHOP_LEAPS_EXPERIENCE_ID].filter(Boolean) as string[];
const BUNDLE_EXPERIENCES: string[] = [process.env.WHOP_BUNDLE_EXPERIENCE_ID].filter(Boolean) as string[];

// All paid experiences (used for regime-change alerts which affect everyone)
const ALL_PAID_EXPERIENCES: string[] = [
    ...CORE_EXPERIENCES, ...PRO_EXPERIENCES, ...LEAPS_EXPERIENCES, ...BUNDLE_EXPERIENCES,
];

const REGIME_EMOJI: Record<string, string> = {
    BULL:     '🟢',
    SIDEWAYS: '🟡',
    BEAR:     '🔴',
};

/** Daily 3PM TurboCore signal — sent to Core + Bundle experience IDs */
export async function sendSignalPushNotification(signal: {
    regime:     string;
    confidence: number;
    tqqqAlloc?: number;
}): Promise<void> {
    const targets = [...CORE_EXPERIENCES, ...BUNDLE_EXPERIENCES];
    if (!targets.length) {
        console.warn('[Whop Push] No Core/Bundle experience IDs configured — skipping TurboCore notification');
        return;
    }

    const emoji = REGIME_EMOJI[signal.regime] ?? '📊';
    const subtitle = signal.tqqqAlloc !== undefined
        ? `TQQQ: ${signal.tqqqAlloc}% | ${signal.confidence}% confidence`
        : `${signal.confidence}% confidence`;

    await Promise.allSettled(
        targets.map(experience_id =>
            whop.notifications.create({
                experience_id,
                title:    `${emoji} TurboCore: ${signal.regime} Signal`,
                subtitle,
                content:  'Tap to see today\'s full allocation and execute in 2 minutes.',
                rest_path: '/signal',
            })
        )
    );

    console.log(`[Whop Push] TurboCore signal notification sent (${signal.regime} ${signal.confidence}%)`);
}

/** Turbo Pro IV-Switch signal notification — sent to Pro + Bundle */
export async function sendTurboProPushNotification(signal: {
    action:     string;   // OPEN_CSP | OPEN_ZEBRA | OPEN_CCS | OPEN_SQQQ | NO_ACTION
    confidence: number;
    regime?:    string;
}): Promise<void> {
    const targets = [...PRO_EXPERIENCES, ...BUNDLE_EXPERIENCES];
    if (!targets.length) {
        console.warn('[Whop Push] No Pro/Bundle experience IDs configured — skipping Turbo Pro notification');
        return;
    }

    const modeLabels: Record<string, string> = {
        OPEN_CSP:        'Mode A · Cash-Secured Put',
        OPEN_ZEBRA:      'Mode B · ZEBRA Spread',
        OPEN_ZEBRA_D3:   'Mode D3 · Crash Recovery ZEBRA',
        OPEN_CCS:        'Mode C · Bear Call Spread',
        OPEN_SQQQ:       'Mode D2 · Crash Hedge',
        CLOSE_POSITIONS: 'Exit · Close Position',
        NO_ACTION:       'Hold · No New Position',
    };
    const modeLabel = modeLabels[signal.action] ?? signal.action;
    const regimeSuffix = signal.regime ? ` · ${signal.regime.replace(/_/g, ' ')}` : '';

    await Promise.allSettled(
        targets.map(experience_id =>
            whop.notifications.create({
                experience_id,
                title:    `⚡ Turbo Pro: ${modeLabel}`,
                subtitle: `${signal.confidence}% confidence${regimeSuffix}`,
                content:  'IV-Switch signal ready. Tap to see options order details.',
                rest_path: '/signal',
            })
        )
    );

    console.log(`[Whop Push] Turbo Pro notification sent (${signal.action} ${signal.confidence}%)`);
}

/** QQQ LEAPS signal notification — sent to LEAPS + Bundle */
export async function sendLeapsSignalPushNotification(signal: {
    action:     string;    // ENTER | EXIT | HOLD
    regime:     string;
    confidence: number;
    strike?:    number;
}): Promise<void> {
    const targets = [...LEAPS_EXPERIENCES, ...BUNDLE_EXPERIENCES];
    if (!targets.length) {
        console.warn('[Whop Push] No LEAPS/Bundle experience IDs configured — skipping LEAPS notification');
        return;
    }

    const actionEmoji: Record<string, string> = {
        ENTER: '📈', EXIT: '📉', HOLD: '⏸️',
    };
    const emoji = actionEmoji[signal.action.toUpperCase()] ?? '📊';
    const strikeStr = signal.strike ? `Strike $${signal.strike} · ` : '';

    await Promise.allSettled(
        targets.map(experience_id =>
            whop.notifications.create({
                experience_id,
                title:    `${emoji} QQQ LEAPS: ${signal.action} Signal`,
                subtitle: `${strikeStr}${signal.confidence}% confidence · ${signal.regime.replace(/_/g, ' ')}`,
                content:  'LEAPS signal ready. Tap to view contract details and log position.',
                rest_path: '/signal',
            })
        )
    );

    console.log(`[Whop Push] QQQ LEAPS notification sent (${signal.action} ${signal.regime} ${signal.confidence}%)`);
}

/** Morning brief notification — sent to all paid experience IDs */
export async function sendMorningBriefPushNotification(regime: string, headline: string): Promise<void> {
    if (!ALL_PAID_EXPERIENCES.length) return;

    const emoji = REGIME_EMOJI[regime] ?? '📊';

    await Promise.allSettled(
        ALL_PAID_EXPERIENCES.map(experience_id =>
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
    if (!ALL_PAID_EXPERIENCES.length) return;

    const emoji = REGIME_EMOJI[newRegime] ?? '⚠️';

    await Promise.allSettled(
        ALL_PAID_EXPERIENCES.map(experience_id =>
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
