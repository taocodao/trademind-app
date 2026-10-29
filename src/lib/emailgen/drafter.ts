import type { DraftSections, EditionPlan } from './types';
import { FLIGHT_PLAN_MODULES, HOOKS, PS, RISK_MODULES } from './modules';

export const SYSTEM_PROMPT = `You draft one TradeMind newsletter as JSON. You write only from the facts record you are given.
Rules: plain English, no exclamation points, no emojis, no dashes of any kind. Never give a personal instruction to buy or sell.
The allocation score is one input that helps set exposure. It is not a probability. The trend reading is a price against its 200 day average.
Risk levels (conservative, moderate, aggressive) are separate account settings, not model states. Do not call them tiers of the model.
Do not compare TradeMind with other publishers. Do not use absolute words such as most, ever, never, always unless the record states them.
Use only numbers that appear in allowed_numbers. If status_fallback is true, say only that the run did not complete its data checks.
Return JSON with keys preheader, hook, cards{market_weather,copilot_readout,flight_plan,turbulence_test}, ps, used_numbers, module_ids_used.`;

export function buildUserPrompt(plan: EditionPlan): string {
    return JSON.stringify({ plan, hook_instruction: HOOKS[plan.hook_pattern], ps_instruction: PS[plan.ps_type], modules: { flight_plan: FLIGHT_PLAN_MODULES[plan.modules.flight_plan], turbulence: plan.modules.turbulence.map((m) => RISK_MODULES[m]) } });
}

/** Safe draft that uses only approved module text and record fields. Used when the model fails or the filter rejects its draft. */
export function deterministicDraft(plan: EditionPlan): DraftSections {
    const fp = FLIGHT_PLAN_MODULES[plan.modules.flight_plan];
    const tt = plan.modules.turbulence.map((m) => RISK_MODULES[m].body).join(' ');
    const failed = plan.status_fallback;
    const hook = failed ? 'No new instruction today. The model run did not complete its data checks. This is not a confirmation that anything is unchanged.' : 'Here is the published status for today, followed by one idea worth understanding.';
    return {
        preheader: failed ? 'The model run did not complete its data checks today.' : 'Published strategy status, one idea and one risk.',
        hook,
        cards: {
            market_weather: 'Market context was not included today.',
            copilot_readout: failed ? 'No readout today because the data checks did not complete.' : 'The status above comes from the published model run. It is a research instruction for the strategy, not advice for your account.',
            flight_plan: fp.title + '. ' + fp.body,
            turbulence_test: tt,
        },
        ps: 'The research record below lists the run, hash and cutoffs behind this issue.',
        used_numbers: [],
        module_ids_used: [plan.modules.flight_plan, ...plan.modules.turbulence],
    };
}

export async function draftWithModel(plan: EditionPlan, call: (system: string, user: string) => Promise<string>): Promise<DraftSections> {
    try {
        const raw = await call(SYSTEM_PROMPT, buildUserPrompt(plan));
        const j = JSON.parse(raw);
        if (!j?.hook || !j?.cards?.flight_plan || !j?.ps) throw new Error('shape');
        return { preheader: String(j.preheader ?? ''), hook: String(j.hook), cards: { market_weather: String(j.cards.market_weather ?? ''), copilot_readout: String(j.cards.copilot_readout ?? ''), flight_plan: String(j.cards.flight_plan), turbulence_test: String(j.cards.turbulence_test ?? '') }, ps: String(j.ps), used_numbers: Array.isArray(j.used_numbers) ? j.used_numbers.map(String) : [], module_ids_used: Array.isArray(j.module_ids_used) ? j.module_ids_used.map(String) : [] };
    } catch {
        return deterministicDraft(plan);
    }
}
