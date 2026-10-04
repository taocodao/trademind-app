/** Pure decision logic for the newsletter send engine (no I/O, unit tested). */

interface DecisionSettings { cadence_days: number; max_attempts: number }

/** Kept for compatibility; the due check now compares Eastern calendar days. */
export const DUE_TOLERANCE_HOURS = 0;

/** Days since epoch for the America/New_York calendar date of `d`. */
export function etDayNumber(d: Date): number {
    const p = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(d);
    const g = (t: string) => Number(p.find((x) => x.type === t)?.value);
    return Math.floor(Date.UTC(g('year'), g('month') - 1, g('day')) / 86400_000);
}

export type Decision =
    | { action: 'send'; issue: number; attempt: number }
    | { action: 'wait'; reason: 'in_flight' | 'not_due' | 'max_attempts' }
    | { action: 'done'; reason: 'sequence_complete' };

export interface HistoryFacts {
    /** Highest completed issue number (0 when none). */
    lastCompleted: number;
    /** When that issue was sent (created_at), null when none. */
    lastCompletedAt: Date | null;
    /** Any send currently in flight (sending, or accepted within the grace window). */
    inFlight: boolean;
    /** Failed attempts already recorded for issue lastCompleted + 1. */
    failedAttemptsNext: number;
}

export function decideNext(
    h: HistoryFacts, s: DecisionSettings,
    totalIssues: number, now: Date = new Date()
): Decision {
    if (h.inFlight) return { action: 'wait', reason: 'in_flight' };
    if (h.lastCompleted >= totalIssues) return { action: 'done', reason: 'sequence_complete' };
    const issue = h.lastCompleted + 1;
    if (h.failedAttemptsNext >= s.max_attempts) return { action: 'wait', reason: 'max_attempts' };
    if (h.lastCompleted > 0 && h.lastCompletedAt) {
        // Due on the Eastern calendar day cadence_days after the last send,
        // regardless of the hour it went out. The daily run then sends it.
        if (etDayNumber(now) - etDayNumber(h.lastCompletedAt) < s.cadence_days) {
            return { action: 'wait', reason: 'not_due' };
        }
    }
    return { action: 'send', issue, attempt: h.failedAttemptsNext + 1 };
}

