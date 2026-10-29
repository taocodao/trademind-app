import type { Check, DraftSections, EditionPlan } from './types';
import { FIXED_LINKS } from './editions';

const BANNED = [
    'confidence', 'probability of profit', 'protect capital', 'compound quietly', 'worst fall shallow', 'guarantee', 'safe ', 'risk-free', 'no risk',
    'you should buy', 'you should sell', 'beat the market', 'outperform', 'will rise', 'will fall', 'cannot lose',
    // unsupported absolutes and comparisons with other publishers
    'most expensive thing', 'most newsletters', 'ever does', 'never starts a trade', 'never loses', 'always works', 'every other',
    // a model state is not a risk level
    'exposure tier', 'conservative tier', 'moderate tier', 'aggressive tier',
    // only the Defensive label may be public; the old internal name must not leak
    'qqq basic', 'turbocore',
];
const SECOND_PERSON_ORDER = /\b(buy|sell|roll|close|open) (now|today|your)\b/i;
const NUM = /\d[\d,]*(?:\.\d+)?/g;

export function bodyText(d: DraftSections): string {
    return [d.preheader, d.hook, d.cards.market_weather, d.cards.copilot_readout, d.cards.flight_plan, d.cards.turbulence_test, d.ps].join('\n');
}

export function checkDraft(plan: EditionPlan, d: DraftSections, html: string): Check[] {
    const out: Check[] = [];
    const text = bodyText(d);
    const low = text.toLowerCase();
    const words = text.split(/\s+/).filter(Boolean).length;
    out.push({ name: 'length', pass: words >= plan.length_words.min * 0.2 && words <= plan.length_words.max, detail: String(words) });
    const hit = BANNED.filter((b) => low.includes(b));
    out.push({ name: 'banned_phrases', pass: hit.length === 0, detail: hit.join(', ') });
    out.push({ name: 'no_dashes', pass: !/[\u2013\u2014]|--/.test(html), });
    out.push({ name: 'no_exclamation', pass: !/!/.test(text) });
    out.push({ name: 'no_emoji', pass: !/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(html) });
    out.push({ name: 'no_direct_orders', pass: !SECOND_PERSON_ORDER.test(text) });
    const allowed = new Set(plan.allowed_numbers.map((n) => n.replace(/,/g, '')));
    const stray = (text.match(NUM) ?? []).map((n) => n.replace(/,/g, '')).filter((n) => !allowed.has(n) && !d.used_numbers.some((u) => u.replace(/,/g, '') === n));
    out.push({ name: 'numbers_from_record', pass: stray.length === 0, detail: stray.join(', ') });
    const declared = d.used_numbers.filter((n) => !plan.allowed_numbers.includes(n));
    out.push({ name: 'declared_numbers_allowed', pass: declared.length === 0, detail: declared.join(', ') });
    for (const [k, u] of Object.entries(FIXED_LINKS)) out.push({ name: 'link_' + k, pass: html.includes(u) });
    out.push({ name: 'unsubscribe_present', pass: html.includes('{{one_click_unsubscribe_url}}') || html.toLowerCase().includes('unsubscribe') });
    out.push({ name: 'address_present', pass: html.includes('151-58 24th Rd') });
    out.push({ name: 'no_unresolved_braces', pass: !/\{\{(?!token\}\}|one_click_unsubscribe_url\}\}|preferences_url\}\})[^}]*\}\}/.test(html) && !/\bcolor:\{/.test(html) });
    if (plan.status_fallback) {
        const t = html.toLowerCase();
        out.push({ name: 'fallback_wording', pass: t.includes('did not complete its data checks') && !/no change|unchanged|did not move/.test(low.replace('this is not a confirmation that anything is unchanged.', '')) });
    }
    return out;
}
export const passed = (c: Check[]) => c.every((x) => x.pass);
