/**
 * Study program rules (4 months free, a short survey at the end of each month, and each survey completed earns 3 more free months
 * for one account after the program, up to 12 months. People can leave at any time and keep what they earned. 20 seats, no card).
 * The founding price tables below are retired and kept only until the old billing code is removed. Pure functions, no I/O, so they can be tested.
 * Dates are ISO strings in UTC; the program works in whole days.
 */

/** The study runs 4 months, counted as 120 days. */
export const PREVIEW_DAYS = 120;
/** Each month survey completed earns 3 months (90 days) of free access for one account after the study. */
export const CREDIT_DAYS_PER_ACTIVITY = 90;
/** Four surveys, so at most 12 months (360 days) of credit after the study. */
export const MAX_ACTIVITIES = 4;
export const MAX_FREE_DAYS = PREVIEW_DAYS + CREDIT_DAYS_PER_ACTIVITY * MAX_ACTIVITIES;
export const ACTIVITY_GRACE_DAYS = 14;
/** Study preview seats. */
export const FIRST_GROUP = 20;
export const WAVE_SIZE_MAX = 20;
export const HARD_LIMIT = 20;

export type PlanLevel = 'research' | 'tracking';
export type Interval = 'month' | 'year';

/** Standard prices and founding prices, in US dollars. */
export const PRICES = {
    research: { month: 29, year: 290, founding: { month: 19, year: 190 } },
    tracking: { month: 49, year: 490, founding: { month: 34, year: 340 } },
} as const;

/** Founding paid months (monthly plans). Annual founding applies to the first year only. */
export const FOUNDING_PAID_MONTHS = 12;

/** Dollars taken off the standard price by the founding coupon. */
export function foundingDiscount(level: PlanLevel, interval: Interval): number {
    const p = PRICES[level];
    return p[interval] - p.founding[interval];
}

export const addDays = (iso: string, days: number): string => new Date(new Date(iso).getTime() + days * 86400_000).toISOString();
export const daysBetween = (a: string, b: string): number => Math.floor((new Date(b).getTime() - new Date(a).getTime()) / 86400_000);

export interface ParticipantState {
    started_at: string;
    /** Completed monthly activities, one entry per month number (1 to 6). */
    completed_months: number[];
    path: 'undecided' | 'partner' | 'founding' | 'free';
    /** Set when a partner has asked to become a founding member. */
    founding_selected_at: string | null;
    paid_started_at: string | null;
    /** Set when the person leaves the study. Study time stops then, and earned months start from that day. */
    left_at?: string | null;
}

/** End of free access: the months actually stayed in the study (up to 4) plus 90 days for each completed monthly survey, up to four. */
export function freeAccessEnd(s: ParticipantState): string {
    const credit = new Set(s.completed_months.filter((m) => m >= 1 && m <= MAX_ACTIVITIES)).size * CREDIT_DAYS_PER_ACTIVITY;
    const studyEnd = addDays(s.started_at, PREVIEW_DAYS);
    // Leaving early cuts the study time short. Each survey passed still adds its 3 months.
    const base = s.left_at && s.left_at < studyEnd ? s.left_at : studyEnd;
    return addDays(base, credit);
}

/** When the activity for a month is due: monthly from the start date. */
export function activityDue(startedAt: string, month: number): string {
    return addDays(startedAt, 30 * month - 7); // each survey opens one week before the month ends: days 23, 53, 83 and 113
}

export type LifecycleEmail =
    | 'preview_started'
    | 'choice_reminder'
    | 'activity_due'
    | 'free_time_ending'
    | 'founding_ready';

export interface DueEmail { kind: LifecycleEmail; key: string; month?: number }

/**
 * Which lifecycle emails are due right now. `sent` holds keys already sent so nothing repeats.
 * Nobody is ever moved to a paid plan here: at the end of free time with no choice, access simply ends.
 */
export function dueEmails(s: ParticipantState, nowIso: string, sent: Set<string>): DueEmail[] {
    const out: DueEmail[] = [];
    const day = daysBetween(s.started_at, nowIso);
    const push = (e: DueEmail) => { if (!sent.has(e.key)) out.push(e); };
    if (day >= 0) push({ kind: 'preview_started', key: 'preview_started' });
    if (s.path !== 'free') {
        for (let m = 1; m <= MAX_ACTIVITIES; m++) {
            const due = activityDue(s.started_at, m);
            if (new Date(nowIso) >= new Date(due) && !s.completed_months.includes(m) && daysBetween(due, nowIso) <= ACTIVITY_GRACE_DAYS && due < freeAccessEnd(s)) {
                push({ kind: 'activity_due', key: `activity_due_${m}`, month: m });
            }
        }
    }
    if (s.path !== 'free' && !s.paid_started_at) {
        const end = freeAccessEnd(s);
        const left = daysBetween(nowIso, end);
        if (left <= 7 && left >= 0) push({ kind: 'free_time_ending', key: `free_time_ending_${end.slice(0, 10)}` });
    }
    return out;
}

/** What a person can see right now. Free time ending with no choice means Free Weekly, never a charge. */
export function accessNow(s: ParticipantState, nowIso: string): 'research_plus_tracking' | 'paid' | 'free_weekly' {
    if (s.paid_started_at) return 'paid';
    return new Date(nowIso) < new Date(freeAccessEnd(s)) ? 'research_plus_tracking' : 'free_weekly';
}

/** The day billing may begin. Never before free access ends. */
export function billingStart(s: ParticipantState): string {
    return freeAccessEnd(s);
}
