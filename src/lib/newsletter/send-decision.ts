/** Pure decision logic for the newsletter send engine (no I/O, unit tested). */

interface DecisionSettings { cadence_days: number; max_attempts: number }

/** Hours of tolerance so an hourly run never slips a whole day. */
export const DUE_TOLERANCE_HOURS = 3;

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
        const dueAt = h.lastCompletedAt.getTime()
            + s.cadence_days * 86400_000 - DUE_TOLERANCE_HOURS * 3600_000;
        if (now.getTime() < dueAt) return { action: 'wait', reason: 'not_due' };
    }
    return { action: 'send', issue, attempt: h.failedAttemptsNext + 1 };
}

