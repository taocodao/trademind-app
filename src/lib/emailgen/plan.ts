import type { EditionPlan, EditionType, HookPattern, PsType, SegmentId } from './types';
import { EDITIONS } from './editions';
import { HOOKS, PS, FLIGHT_PLAN_MODULES, RISK_MODULES, pickModule } from './modules';

export interface FactsInput {
    run_id: string;
    record_hash: string;
    defensive: { status: 'VERIFIED' | 'DELAYED' | 'RUN_FAILED' | 'UNVERIFIED'; risk_levels: { level: string; text: string }[]; regime: string | null };
    leaps: { status: 'VERIFIED' | 'DELAYED' | 'RUN_FAILED' | 'UNVERIFIED'; sentence: string };
    trend?: { state: 'above' | 'below' | 'unavailable'; changed: boolean | null };
    numbers?: string[];
}

const NUM_BASE = ['229.48', '14.59', '49.46', '22.88', '200', '21', '3:00', '4', '20', '30', '3', '2024', '2026', '14', '13'];

export function buildEditionPlan(p: { edition: EditionType; segment: SegmentId; facts: FactsInput; edition_id: string; date_label: string; index: number }): EditionPlan {
    const def = EDITIONS[p.edition];
    if (!def.implemented) throw new Error('edition not implemented: ' + p.edition);
    const f = p.facts;
    const verified = f.defensive.status === 'VERIFIED' && f.leaps.status !== 'RUN_FAILED';
    const hooks = Object.keys(HOOKS) as HookPattern[];
    const ps = Object.keys(PS) as PsType[];
    return {
        edition_id: p.edition_id, edition_type: p.edition, segment: p.segment, goal: def.goal,
        run_id: f.run_id, facts_record_hash: f.record_hash,
        status_fallback: !verified,
        facts: { defensive: f.defensive, leaps: f.leaps, trend: f.trend ?? { state: 'unavailable', changed: null } },
        modules: { flight_plan: pickModule(p.index, Object.keys(FLIGHT_PLAN_MODULES)), turbulence: [pickModule(p.index, Object.keys(RISK_MODULES)), pickModule(p.index + 1, Object.keys(RISK_MODULES))] },
        hook_pattern: hooks[p.index % hooks.length], ps_type: ps[p.index % ps.length],
        length_words: def.words,
        allowed_numbers: [...NUM_BASE, ...(f.numbers ?? [])],
        date_label: p.date_label,
    };
}
