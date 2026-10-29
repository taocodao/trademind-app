export type EditionType = 'weekly_free' | 'outreach_weekly' | 'daily_quiet' | 'daily_action' | 'daily_paid' | 'presell' | 'study_invite';
export type HookPattern = 'contrarian' | 'specific_event' | 'direct';
export type PsType = 'worse_number' | 'real_cap' | 'open_task' | 'next_read';
export type SegmentId = 'prospect' | 'free_weekly' | 'free_daily' | 'free_alerts' | 'plans_clicker' | 'engaged_reader' | 'study' | 'member' | 'suppressed';

export interface Goal { label: string; url: string }

export interface EditionPlan {
    edition_id: string;
    edition_type: EditionType;
    segment: SegmentId;
    goal: Goal;
    run_id: string;
    facts_record_hash: string;
    /** True when a model run is not verified. The edition then renders the failure wording, never "no change". */
    status_fallback: boolean;
    facts: {
        defensive: { status: string; risk_levels: { level: string; text: string }[]; regime: string | null };
        leaps: { status: string; sentence: string };
        trend: { state: 'above' | 'below' | 'unavailable'; changed: boolean | null };
    };
    modules: { flight_plan: string; turbulence: string[] };
    hook_pattern: HookPattern;
    ps_type: PsType;
    length_words: { min: number; max: number };
    allowed_numbers: string[];
    date_label: string;
}

export interface DraftSections {
    preheader: string;
    hook: string;
    cards: { market_weather: string; copilot_readout: string; flight_plan: string; turbulence_test: string };
    ps: string;
    used_numbers: string[];
    module_ids_used: string[];
}

export interface RenderContext {
    unsubscribe_url: string;
    preferences_url: string;
    token_placeholder: string;
    record_lines: { facts_run_id: string; facts_hash: string; defensive_cutoff: string; leaps_cutoff: string; model_file_hash: string; mapping_version: string; feed: string; corrections: string };
}

export interface Rendered { subject: string; html: string; text: string }
export interface Check { name: string; pass: boolean; detail?: string }
