import type { SegmentId } from './types';

export interface SubscriberState {
    listed_prospect?: boolean;             // on the researched list, never emailed
    confirmed?: boolean;
    cadence?: 'weekly' | 'daily' | 'alerts';
    unsubscribed?: boolean;
    bounced?: boolean;
    complained?: boolean;
    has_account?: boolean;                 // paid account membership
    study_participant?: boolean;
    clicked_plans_days_ago?: number | null;
    purchased_since_plans_click?: boolean;
    days_subscribed?: number;
    clicks_30d?: number;
}

/** Order matters: suppression first, then paid states, then behavior, then cadence. */
export function resolveSegment(s: SubscriberState): SegmentId {
    if (s.unsubscribed || s.bounced || s.complained) return 'suppressed';
    if (s.study_participant) return 'study';
    if (s.has_account) return 'member';
    if (!s.confirmed) return s.listed_prospect ? 'prospect' : 'suppressed';
    if (s.clicked_plans_days_ago != null && s.clicked_plans_days_ago <= 14 && !s.purchased_since_plans_click) return 'plans_clicker';
    if (s.cadence === 'daily' && (s.days_subscribed ?? 0) >= 28 && (s.clicks_30d ?? 0) >= 3) return 'engaged_reader';
    if (s.cadence === 'daily') return 'free_daily';
    if (s.cadence === 'alerts') return 'free_alerts';
    return 'free_weekly';
}

/** Which edition types a segment may receive. */
export const SEGMENT_EDITIONS: Record<SegmentId, string[]> = {
    prospect: ['outreach_weekly'],
    free_weekly: ['weekly_free'],
    free_daily: ['weekly_free', 'daily_quiet', 'daily_action'],
    free_alerts: ['daily_action'],
    plans_clicker: ['presell'],
    engaged_reader: ['study_invite'],
    study: ['daily_paid', 'weekly_free'],
    member: ['daily_paid', 'weekly_free'],
    suppressed: [],
};

export function mayReceive(seg: SegmentId, edition: string): boolean { return SEGMENT_EDITIONS[seg].includes(edition); }
