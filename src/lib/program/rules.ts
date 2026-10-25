/**
 * Founding Member Program rules. Pure functions, no I/O, so they can be tested.
 * Dates are ISO strings in UTC; the program works in whole days.
 */

export const PREVIEW_DAYS = 30;
export const CREDIT_DAYS_PER_ACTIVITY = 30;
/** Total free access (preview plus earned credit) never exceeds six months from the start. */
export const MAX_FREE_DAYS = 180;
export const ACTIVITY_GRACE_DAYS = 14;
export const FIRST_GROUP = 30;
export const WAVE_SIZE_MAX = 50;
export const HARD_LIMIT = 200;

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
}

/** End of free access: the 30 day preview plus 30 days for each completed activity, capped at six months. */
export function freeAccessEnd(s: ParticipantState): string {
    const credit = new Set(s.completed_months.filter((m) => m >= 1 && m <= 6)).size * CREDIT_DAYS_PER_ACTIVITY;
    const days = Math.min(MAX_FREE_DAYS, PREVIEW_DAYS + (s.path === 'partner' || s.path === 'founding' ? credit : 0));
    return addDays(s.started_at, days);
}

/** When the activity for a month is due: monthly from the start date. */
export function activityDue(startedAt: string, month: number): string {
    return addDays(startedAt, 30 * month - 23); // month 1 due on day 7, then every 30 days
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
    if (s.path === 'undecided' && day >= 23 && day < PREVIEW_DAYS + 7) push({ kind: 'choice_reminder', key: 'choice_reminder' });
    if (s.path === 'partner') {
        for (let m = 1; m <= 6; m++) {
            const due = activityDue(s.started_at, m);
            if (new Date(nowIso) >= new Date(due) && !s.completed_months.includes(m) && daysBetween(due, nowIso) <= ACTIVITY_GRACE_DAYS && due < freeAccessEnd(s)) {
                push({ kind: 'activity_due', key: `activity_due_${m}`, month: m });
            }
        }
    }
    if (s.path === 'partner' || s.path === 'founding') {
        const end = freeAccessEnd(s);
        const left = daysBetween(nowIso, end);
        if (left <= 7 && left >= 0) push({ kind: 'free_time_ending', key: `free_time_ending_${end.slice(0, 10)}` });
    }
    // A founding member pays from the day free access ends; the checkout link is sent that day, never earlier.
    if (s.path === 'founding' && !s.paid_started_at && new Date(nowIso) >= new Date(freeAccessEnd(s))) {
        push({ kind: 'founding_ready', key: 'founding_ready' });
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
