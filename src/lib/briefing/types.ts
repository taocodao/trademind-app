export type RunStatus = 'CHANGE' | 'NO_CHANGE' | 'RUN_FAILED' | 'DELAYED' | 'UNVERIFIED';

export interface Tier { conservative?: Record<string, number>; moderate?: Record<string, number>; aggressive?: Record<string, number> }

export interface StrategyFacts {
    strategy: 'QQQ_LEAPS' | 'TQQQ_TURBOCORE_PRO';
    display_name: string;
    status: RunStatus;
    run_verified: boolean;
    source_signal_id: string | null;
    as_of: string | null;
    regime: string | null;
    confidence_pct: number | null;
    qqq_close: number | null;
    /** Model weights by risk level, as percentages (Defensive). */
    weights: { level: string; items: { symbol: string; pct: number }[] }[];
    /** Weights from the previous market day, kept so a change can show what moved. */
    previous_weights: { level: string; items: { symbol: string; pct: number }[] }[];
    previous_weights_differ: boolean | null;
    /** Instruction lines taken only from signal fields. */
    instructions: string[];
    gates: { name: string; value: string }[];
}

export interface FactsRun {
    run_id: string;
    run_date: string;
    record_type: 'live_model';
    early_close: boolean;
    strategies: StrategyFacts[];
    benchmark: { symbol: 'QQQ'; close: number | null };
    engine_note: string;
    hash: string;
}

export interface Check { name: string; pass: boolean; detail?: string }

export interface BriefingDraft {
    kind: 'daily' | 'alert';
    subject: string;
    text: string;
    html: string;
    commentary: string | null;
    status_only: boolean;
    checks: Check[];
    pass: boolean;
}
