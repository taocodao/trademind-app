import canonical from '@/data/canonical-record.json';
import { longDate, shortDate } from './calendar';
import type { FactsRun, StrategyFacts } from './types';

export const FOOTER_MARK = '[[FOOTER]]';
export const PLANS_URL = 'https://trademind.bot/plans';
export const LEDGER_URL = 'https://trademind.bot/live-record';

const DISCLOSURE =
    'Educational research, not investment advice. TradeMind never connects to a brokerage and never places orders. You enter every order yourself. Any results shown on our site are simulated unless labeled otherwise, and simulated results are not live trading.';

export function overallStatus(f: FactsRun): 'CHANGE' | 'NO_CHANGE' | 'TECHNICAL' | 'CHECK' {
    const st = f.strategies.map((s) => s.status);
    if (st.some((x) => x === 'RUN_FAILED' || x === 'DELAYED')) return 'TECHNICAL';
    if (st.some((x) => x === 'CHANGE')) return 'CHANGE';
    if (st.some((x) => x === 'UNVERIFIED')) return 'CHECK';
    return 'NO_CHANGE';
}

/** One plain sentence that opens the instruction block. Built only from statuses. */
export function summaryLine(f: FactsRun): string {
    const o = overallStatus(f);
    if (o === 'TECHNICAL') return "Today's model result is delayed. Take no action until we confirm.";
    if (o === 'CHECK') {
        const names = f.strategies.filter((s) => s.status === 'UNVERIFIED').map((s) => s.display_name).join(' and ');
        return `We could not confirm the status of ${names} today. Take no action on it until we confirm.`;
    }
    if (o === 'NO_CHANGE') return 'Nothing to do today. Both strategies hold their current model positions.';
    const changed = f.strategies.filter((s) => s.status === 'CHANGE').map((s) => s.display_name);
    const same = f.strategies.filter((s) => s.status === 'NO_CHANGE').map((s) => s.display_name);
    return `${changed.join(' and ')} changed ${changed.length > 1 ? 'their' : 'its'} model ${changed.length > 1 ? 'positions' : 'weights'} today.${same.length ? ` ${same.join(' and ')} holds ${same.length > 1 ? 'their' : 'its'} current position.` : ''}`;
}

export function subjectFor(f: FactsRun, kind: 'daily' | 'alert'): string {
    const d = shortDate(f.run_date);
    const o = overallStatus(f);
    if (kind === 'alert') {
        const changed = f.strategies.filter((s) => s.status === 'CHANGE').map((s) => s.display_name);
        return `TradeMind ${changed.join(' and ')}: Strategy change | ${d}`;
    }
    const label = o === 'CHANGE' ? 'Strategy change' : o === 'NO_CHANGE' ? 'No change' : o === 'TECHNICAL' ? 'Technical delay' : 'Status check';
    return `TradeMind | ${label} | ${d}`;
}

function instructionLine(s: StrategyFacts): string {
    switch (s.status) {
        case 'CHANGE':
            return s.instructions.length
                ? `${s.display_name}: Strategy change.\n${s.instructions.map((l) => `  ${l}`).join('\n')}`
                : `${s.display_name}: Strategy change. See the signal in your account for details.`;
        case 'NO_CHANGE':
            return `${s.display_name}: No change. Keep your current model position.`;
        case 'RUN_FAILED':
        case 'DELAYED':
            return `${s.display_name}: Technical delay. Today's model result is not available yet. Take no action until we confirm.`;
        default:
            return `${s.display_name}: Status not confirmed today. Take no action until we confirm.`;
    }
}

function positionLine(s: StrategyFacts): string {
    if (s.strategy === 'TQQQ_TURBOCORE_PRO') {
        if (!s.weights.length || !s.run_verified) return `${s.display_name}: not available today.`;
        return s.weights.map((w) => `${s.display_name}, ${w.level} level: ${w.items.map((i) => `${i.symbol} ${i.pct}%`).join(', ')}`).join('\n');
    }
    return `${s.display_name}: see the public ledger, ${LEDGER_URL}`;
}

export function watchLines(f: FactsRun): string[] {
    const def = f.strategies.find((s) => s.strategy === 'TQQQ_TURBOCORE_PRO');
    const out: string[] = [];
    if (def?.run_verified) {
        for (const g of def.gates) out.push(`${g.name}: ${g.value}`);
        if (def.confidence_pct !== null) out.push(`Model confidence: ${def.confidence_pct}%`);
        if (def.qqq_close !== null) out.push(`QQQ close: ${def.qqq_close}`);
    }
    return out;
}

export const COMMENTARY_PLACEHOLDERS = ['regime', 'confidence', 'qqq_close', 'gates_passed', 'gates_total'] as const;

export function placeholderValues(f: FactsRun): Record<string, string> {
    const def = f.strategies.find((s) => s.strategy === 'TQQQ_TURBOCORE_PRO');
    const gates = def?.gates ?? [];
    const passed = gates.filter((g) => g.value === 'passed' || g.value === 'positive' || /^BULL/.test(g.value)).length;
    return {
        regime: def?.regime ?? 'unknown',
        confidence: def?.confidence_pct != null ? `${def.confidence_pct}%` : 'not available',
        qqq_close: def?.qqq_close != null ? String(def.qqq_close) : 'not available',
        gates_passed: String(passed),
        gates_total: String(gates.length),
    };
}

export function fillPlaceholders(text: string, vals: Record<string, string>): string {
    return text.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in vals ? vals[k] : m));
}

export function renderDailyText(f: FactsRun, commentaryFilled: string | null): string {
    const parts: string[] = [];
    parts.push('MODEL INSTRUCTION');
    parts.push(summaryLine(f));
    parts.push(f.strategies.map(instructionLine).join('\n'));
    parts.push(`Data as of ${longDate(f.run_date)}. The model runs at 3:00 PM Eastern.`);
    parts.push('CURRENT MODEL POSITION');
    parts.push(f.strategies.map(positionLine).join('\n'));
    const watch = watchLines(f);
    if (watch.length) { parts.push('WHAT TO WATCH'); parts.push(watch.map((w) => `- ${w}`).join('\n')); }
    if (commentaryFilled) {
        parts.push('CONTEXT. NOT AN ADDITIONAL INSTRUCTION.');
        parts.push(commentaryFilled);
    }
    parts.push(`Public ledger: ${LEDGER_URL}`);
    parts.push(FOOTER_MARK);
    parts.push(`Want these signals for your own account? Newsletter subscribers pay 30% less. See the plans, or apply to the free study preview: ${PLANS_URL}`);
    parts.push(DISCLOSURE);
    parts.push(`TradeMind, ${canonical.company.mailing_address}`);
    parts.push('Change how often you hear from us or unsubscribe: {{unsubscribe_url}}');
    return parts.join('\n\n');
}

export function renderAlertText(f: FactsRun): string {
    const changed = f.strategies.filter((s) => s.status === 'CHANGE');
    const parts: string[] = ['MODEL INSTRUCTION', summaryLine(f), changed.map(instructionLine).join('\n'), `Data as of ${longDate(f.run_date)}.`, `Full record: ${LEDGER_URL}`, FOOTER_MARK, DISCLOSURE, `TradeMind, ${canonical.company.mailing_address}`, 'Change alerts or unsubscribe: {{unsubscribe_url}}'];
    return parts.join('\n\n');
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Simple, readable HTML built from the plain text (headings are the all-capital lines). */
export function textToHtml(text: string, title: string): string {
    const blocks = text.replace(FOOTER_MARK, '').split(/\n\n+/);
    const html = blocks.map((b) => {
        const t = b.trim();
        if (!t) return '';
        if (/^[A-Z][A-Z .,]+$/.test(t)) return `<h2 style="font-size:13px;letter-spacing:.08em;color:#2f6bff;margin:22px 0 6px;">${esc(t)}</h2>`;
        const lines = esc(t).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#2f6bff;">$1</a>').split('\n').join('<br>');
        return `<p style="margin:0 0 10px;font-size:15px;line-height:1.55;color:#111827;">${lines}</p>`;
    }).join('\n');
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head><body style="margin:0;padding:24px 12px;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;"><div style="max-width:600px;margin:0 auto;background:#ffffff;padding:24px 28px;border-radius:8px;">${html}</div></body></html>`;
}
