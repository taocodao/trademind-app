import type { HookPattern, PsType } from './types';

/** Approved teaching modules. Every sentence is a rule or a definition, never a claim about other publishers. */
export const FLIGHT_PLAN_MODULES: Record<string, { title: string; body: string }> = {
    W01: { title: 'What a model stance means', body: 'A model stance is a rule-based reading of conditions. It is a published research instruction for a strategy, not a prediction and not advice for your account.' },
    W02: { title: 'Why a defensive model can lag a rising market', body: 'A defensive model holds less exposure when its rules say conditions are weaker. When the market keeps rising anyway, that lower exposure lags. The lag is the cost of the same rule that limits declines.' },
    W03: { title: 'How the allocation score is used', body: 'The allocation score is one input that helps set how much exposure the Defensive model holds. It reads market conditions and is checked against fixed rules. It is not a probability of any outcome.' },
    W04: { title: 'Simulation is not execution', body: 'A simulation applies the rules to past data with model-priced options. Real fills, spreads and timing differ, so a simulated result is not what an account would have received.' },
};

export const RISK_MODULES: Record<string, { title: string; body: string }> = {
    R01: { title: 'Opportunity cost', body: 'Holding less exposure can mean missing part of a rise. That is a real cost, and it is the price of the rule that limits declines.' },
    R02: { title: 'Leveraged ETFs', body: 'QLD and TQQQ aim for a multiple of one day of QQQ movement. Over longer periods the result can differ from that multiple, and declines can be deep.' },
    R03: { title: 'Modeled option prices', body: 'LEAPS values in a simulation are model-priced. Live quotes, spreads and fills can differ.' },
    R04: { title: 'Context is not an instruction', body: 'Market context in this issue is background. The only instruction is the published strategy status.' },
    R05: { title: 'Timing', body: 'Instructions are published at fixed times. Acting later in the session means acting on information the model did not have.' },
};

export const HOOKS: Record<HookPattern, string> = {
    contrarian: 'Open with one plain, checkable observation taken from the facts record. No absolute words such as most, ever, never, always.',
    specific_event: 'Open with the one thing that happened or did not happen in the facts record, with its time.',
    direct: 'Open with what the reader needs to know or do today, taken from the facts record.',
};

export const PS: Record<PsType, string> = {
    worse_number: 'Name the less flattering of two numbers that are in the record and say what it means.',
    real_cap: 'State a real limit that is in the record, such as seats or an eligibility rule.',
    open_task: 'Name one thing the reader can check themselves with a link from the fixed list.',
    next_read: 'Say what the next issue will cover, only if it is scheduled.',
};

/** Deterministic rotation so the same facts never produce a random pick. */
export function pickModule(idx: number, ids: string[]): string { return ids[((idx % ids.length) + ids.length) % ids.length]; }
