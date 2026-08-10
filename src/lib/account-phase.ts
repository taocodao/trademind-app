/**
 * Account Phase Engine (app-side)
 * ===============================
 * Mirrors the backend PhaseManager (tastywork-trading/src/qqq_leaps/phase_manager.py)
 * but operates on a NAMED account's NLV (cash + positions at live prices).
 *
 * NAV is the sole phase trigger. Phases scale position sizing as capital grows:
 *   SEED   (NLV < $15K)        — most conservative sizing
 *   GROWTH ($15K – $29,999)    — intermediate
 *   TARGET ($30K+)             — full production sizing
 *
 * Hysteresis (demotion buffer) + min-dwell prevent flip-flopping around a
 * threshold. Emergency demotion bypasses dwell on a large close-over-close
 * drawdown. Skip-level promotion is allowed (SEED -> TARGET on a deposit).
 *
 * Tier (conservative/moderate/aggressive) = entry strictness (user preference).
 * Phase = capital scaling (NLV-driven). Phase caps sizing; tier gates entries.
 */

import pool from '@/lib/db';

// ─── Phase definitions (mirror config/phase_config.yaml sizing caps) ─────────

export type PhaseName = 'SEED' | 'GROWTH' | 'TARGET';

export interface PhaseSpec {
    name: PhaseName;
    navMin: number;
    navMax: number | null;
    /** Cap on any single position's share of NLV (phase-level sizing cap). */
    maxPositionPct: number;
    /** Cap on number of concurrent positions (informational / future use). */
    maxPositions: number;
}

export const PHASES: PhaseSpec[] = [
    { name: 'SEED', navMin: 0, navMax: 14999, maxPositionPct: 0.95, maxPositions: 1 },
    { name: 'GROWTH', navMin: 15000, navMax: 29999, maxPositionPct: 0.45, maxPositions: 2 },
    { name: 'TARGET', navMin: 30000, navMax: null, maxPositionPct: 0.33, maxPositions: 3 },
];

const DEMOTION_BUFFER_PCT = 0.05;
const MIN_DWELL_DAYS = 5;
const EMERGENCY_DEMOTION_DD_PCT = 0.15;

export function phaseForNlv(nlv: number): PhaseSpec {
    for (const p of PHASES) {
        if (nlv >= p.navMin && (p.navMax === null || nlv <= p.navMax)) return p;
    }
    return PHASES[0];
}

/** Look up a phase spec by name (defaults to SEED if unknown). */
export function getPhaseSpec(name: PhaseName | string): PhaseSpec {
    return PHASES.find((p) => p.name === name) ?? PHASES[0];
}

function rank(name: PhaseName): number {
    return PHASES.findIndex((p) => p.name === name);
}

// ─── Schema (idempotent) ─────────────────────────────────────────────────────

let _phaseInit: Promise<void> | null = null;

export function initializePhaseTables(): Promise<void> {
    if (!_phaseInit) {
        _phaseInit = (async () => {
            await pool.query(`
                CREATE TABLE IF NOT EXISTS account_phase_transitions (
                    id SERIAL PRIMARY KEY,
                    account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
                    from_phase VARCHAR(10) NOT NULL,
                    to_phase VARCHAR(10) NOT NULL,
                    nlv_at_transition DECIMAL(15, 2) NOT NULL,
                    reason VARCHAR(64) NOT NULL,
                    created_at TIMESTAMPTZ DEFAULT NOW()
                )
            `);
            await pool.query(`CREATE INDEX IF NOT EXISTS idx_phase_transitions_account ON account_phase_transitions(account_id)`);
            // Persist the account's current phase + when it entered (for dwell).
            await pool.query(`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS phase VARCHAR(10)`);
            await pool.query(`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS phase_entered_at TIMESTAMPTZ`);
        })().catch((err) => {
            _phaseInit = null;
            throw err;
        });
    }
    return _phaseInit;
}

// ─── Evaluation ──────────────────────────────────────────────────────────────

export interface PhaseEvalResult {
    phase: PhaseSpec;
    transitioned: boolean;
    fromPhase: PhaseName | null;
    reason: string | null;
    nlv: number;
}

interface AccountPhaseRow {
    phase: PhaseName | null;
    phase_entered_at: string | null;
}

/**
 * Evaluate an account's phase from its current NLV. Causal and idempotent per
 * transition: only writes a transition row when the phase actually changes.
 *
 * @param accountId   the named account
 * @param nlv         current net liquidation value (cash + positions at live px)
 * @param priorNlv    previous evaluation's NLV (for emergency-drawdown detection)
 */
export async function evaluateAccountPhase(
    accountId: number,
    nlv: number,
    priorNlv: number | null
): Promise<PhaseEvalResult> {
    await initializePhaseTables();

    const target = phaseForNlv(nlv);

    const cur = await pool.query(`SELECT phase, phase_entered_at FROM accounts WHERE id = $1`, [accountId]);
    const row: AccountPhaseRow = cur.rows[0] || { phase: null, phase_entered_at: null };
    const currentName: PhaseName | null = row.phase as PhaseName | null;

    // First evaluation: assign the NAV-appropriate phase.
    if (!currentName) {
        await recordTransition(accountId, 'NONE', target.name, nlv, 'INITIAL_ASSIGNMENT');
        return { phase: target, transitioned: true, fromPhase: null, reason: 'INITIAL_ASSIGNMENT', nlv };
    }

    const current = PHASES[rank(currentName)];

    // Emergency demotion: large close-over-close drawdown crossing a boundary.
    if (priorNlv && priorNlv > 0) {
        const dd = (priorNlv - nlv) / priorNlv;
        if (dd >= EMERGENCY_DEMOTION_DD_PCT && target.name !== currentName) {
            await recordTransition(accountId, currentName, target.name, nlv, `EMERGENCY_DEMOTION_DD_${(dd * 100).toFixed(1)}%`);
            return { phase: target, transitioned: true, fromPhase: currentName, reason: 'EMERGENCY_DEMOTION', nlv };
        }
    }

    if (target.name === currentName) {
        return { phase: current, transitioned: false, fromPhase: currentName, reason: null, nlv };
    }

    const dwellDays = row.phase_entered_at
        ? (Date.now() - new Date(row.phase_entered_at).getTime()) / (1000 * 60 * 60 * 24)
        : Infinity;

    if (rank(target.name) > rank(currentName)) {
        // Promotion (skip-level allowed): dwell-gated only.
        if (dwellDays >= MIN_DWELL_DAYS) {
            await recordTransition(accountId, currentName, target.name, nlv, 'PROMOTION');
            return { phase: target, transitioned: true, fromPhase: currentName, reason: 'PROMOTION', nlv };
        }
        return { phase: current, transitioned: false, fromPhase: currentName, reason: null, nlv };
    }

    // Demotion: NAV must clear the current phase's floor by the buffer.
    const bufferedFloor = current.navMin * (1 - DEMOTION_BUFFER_PCT);
    if (nlv < bufferedFloor && dwellDays >= MIN_DWELL_DAYS) {
        await recordTransition(accountId, currentName, target.name, nlv, 'DEMOTION_HYSTERESIS_CONFIRMED');
        return { phase: target, transitioned: true, fromPhase: currentName, reason: 'DEMOTION', nlv };
    }
    return { phase: current, transitioned: false, fromPhase: currentName, reason: null, nlv };
}

async function recordTransition(
    accountId: number,
    from: PhaseName | 'NONE',
    to: PhaseName,
    nlv: number,
    reason: string
): Promise<void> {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query(
            `INSERT INTO account_phase_transitions (account_id, from_phase, to_phase, nlv_at_transition, reason)
             VALUES ($1, $2, $3, $4, $5)`,
            [accountId, from, to, nlv, reason]
        );
        await client.query(
            `UPDATE accounts SET phase = $2, phase_entered_at = NOW(), updated_at = NOW() WHERE id = $1`,
            [accountId, to]
        );
        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

/** Current persisted phase for an account (defaults to NLV-appropriate if unset). */
export async function getAccountPhase(accountId: number): Promise<PhaseName | null> {
    await initializePhaseTables();
    const res = await pool.query(`SELECT phase FROM accounts WHERE id = $1`, [accountId]);
    return (res.rows[0]?.phase as PhaseName | null) ?? null;
}

/** Transition history for an account, most recent first. */
export async function getPhaseTransitions(accountId: number, limit = 50) {
    await initializePhaseTables();
    const res = await pool.query(
        `SELECT id, from_phase, to_phase, nlv_at_transition, reason, created_at
         FROM account_phase_transitions WHERE account_id = $1 ORDER BY created_at DESC LIMIT $2`,
        [accountId, limit]
    );
    return res.rows;
}
