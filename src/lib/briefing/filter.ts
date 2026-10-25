import rules from '@/data/banned-phrases.json';
import { FOOTER_MARK, LEDGER_URL, overallStatus } from './templates';
import type { Check, FactsRun } from './types';

const ACTION_WORDS = /\b(buy|sell|add|exit|enter|trim|rebalance|short|go long|take profit|consider (buying|selling|adding))\b/i;
const PREDICTION = /\b(will (rise|fall|drop|rally|climb|go up|go down|surge|crash)|expect(s|ed)? (a |the )?(rise|fall|drop|rally)|forecast|price target|should (rise|fall))\b/i;
const INVENTED_CAUSE = /\b(because of|due to|driven by|thanks to|in response to)\b|\b(the fed|fomc|cpi|inflation report|jobs report|earnings season|tariffs?|geopolitic\w*|election)\b/i;
const DASHES = /[\u2013\u2014]|--/;

function numbersIn(text: string): string[] {
    return (text.match(/\d[\d,]*\.?\d*/g) || []).map((n) => n.replace(/,/g, '').replace(/\.$/, ''));
}

function allowedNumbers(f: FactsRun): Set<string> {
    const set = new Set<string>();
    for (const n of numbersIn(JSON.stringify(f))) set.add(n);
    const [y, m, d] = f.run_date.split('-');
    for (const n of [y, String(Number(m)), String(Number(d)), '3', '00', '30', '45']) set.add(n);
    return set;
}

export interface FilterInput {
    kind: 'daily' | 'alert';
    subject: string;
    /** Final text with placeholders filled, including the footer mark. */
    text: string;
    /** Raw AI commentary before placeholders are filled, or null. */
    rawCommentary: string | null;
    facts: FactsRun;
}

export function runChecks(inp: FilterInput): Check[] {
    const checks: Check[] = [];
    const body = inp.text.split(FOOTER_MARK)[0];
    const lower = (inp.subject + '\n' + inp.text).toLowerCase();

    // 1 Number match: every number outside the footer comes from the facts record.
    const allowed = allowedNumbers(inp.facts);
    const strays = [...new Set(numbersIn(inp.subject + '\n' + body).filter((n) => !allowed.has(n)))];
    checks.push({ name: 'number_match', pass: strays.length === 0, detail: strays.length ? `Numbers not in the facts record: ${strays.join(', ')}` : undefined });

    // 2 Commentary rules (raw AI text).
    const raw = inp.rawCommentary;
    if (raw) {
        const probs: string[] = [];
        if (/\d/.test(raw)) probs.push('contains digits (numbers must be placeholders)');
        if (ACTION_WORDS.test(raw)) probs.push('uses an action word');
        if (PREDICTION.test(raw)) probs.push('predicts prices');
        if (INVENTED_CAUSE.test(raw)) probs.push('names a cause not in the facts');
        checks.push({ name: 'commentary_rules', pass: probs.length === 0, detail: probs.join('; ') || undefined });
    }

    // 3 Banned phrases and patterns.
    const hits: string[] = [];
    for (const ph of rules.phrases) if (lower.includes(ph)) hits.push(ph);
    for (const pt of rules.patterns) if (new RegExp(pt.regex, 'i').test(inp.subject + '\n' + inp.text)) hits.push(pt.name);
    checks.push({ name: 'banned_phrases', pass: hits.length === 0, detail: hits.length ? hits.join(', ') : undefined });

    // 4 Dashes.
    checks.push({ name: 'no_dashes', pass: !DASHES.test(inp.subject + '\n' + inp.text) });

    // 5 Record labeling: results talk must say "simulated" nearby.
    const lbl: string[] = [];
    const re = /(total return|cagr|backtest|largest drop)/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(inp.text))) {
        const ctx = inp.text.slice(Math.max(0, m.index - 80), m.index + 80).toLowerCase();
        if (!ctx.includes('simulat')) lbl.push(m[0]);
    }
    checks.push({ name: 'record_labeling', pass: lbl.length === 0, detail: lbl.length ? `Missing "simulated" near: ${lbl.join(', ')}` : undefined });

    // 6 Status integrity.
    const prob: string[] = [];
    const overall = overallStatus(inp.facts);
    if (inp.kind === 'daily' && /no change/i.test(inp.subject) && overall !== 'NO_CHANGE') prob.push('subject says no change but a strategy is not a verified no change');
    for (const s of inp.facts.strategies) {
        const line = body.split('\n').find((l) => l.startsWith(`${s.display_name}:`) && !/model position|ledger|level/i.test(l));
        if (!line) continue;
        if (s.status !== 'NO_CHANGE' && /no change/i.test(line)) prob.push(`${s.display_name} line says no change but status is ${s.status}`);
        if (s.status === 'NO_CHANGE' && !s.run_verified) prob.push(`${s.display_name} no change without a verified run`);
    }
    checks.push({ name: 'status_integrity', pass: prob.length === 0, detail: prob.join('; ') || undefined });

    // 7 Length and order.
    const words = body.split(/\s+/).filter(Boolean).length;
    const max = inp.kind === 'alert' ? 120 : 500;
    const first = body.trimStart().startsWith('MODEL INSTRUCTION');
    checks.push({ name: 'length_and_order', pass: first && words <= max, detail: !first ? 'Instruction block is not first' : words > max ? `${words} words, limit ${max}` : undefined });

    // 8 Links.
    checks.push({ name: 'ledger_link', pass: inp.text.includes(LEDGER_URL) });

    // 9 Footer essentials.
    checks.push({ name: 'footer', pass: inp.text.includes('{{unsubscribe_url}}') && inp.text.includes('Whitestone') });

    return checks;
}

export const allPass = (c: Check[]) => c.every((x) => x.pass);
