import { allPass, runChecks } from './filter';
import { fillPlaceholders, placeholderValues, renderAlertText, renderDailyText, subjectFor, textToHtml, overallStatus } from './templates';
import type { BriefingDraft, FactsRun } from './types';

const SYSTEM = `You write a short market context paragraph (60 to 120 words) for a quantitative research newsletter.
Rules, all mandatory:
- Use only these placeholders for any figure: {{regime}}, {{confidence}}, {{qqq_close}}, {{gates_passed}}, {{gates_total}}. Never type a digit.
- Explain what the model's regime, confidence and gates mean in plain English.
- Do not use the words buy, sell, add, exit, enter, trim or rebalance. Do not tell the reader what to do.
- Do not predict prices. Do not name causes such as the Fed, inflation, earnings or tariffs.
- Say plainly that confidence below the model's threshold is a reason for patience, not a signal.
- No dashes of any kind. No exclamation points. Plain text only.`;

/** Asks the writing model for commentary. Returns null if unavailable; the briefing then goes out status-only. */
export async function draftCommentary(facts: FactsRun): Promise<string | null> {
    const key = process.env.PERPLEXITY_API_KEY;
    if (!key) return null;
    const def = facts.strategies.find((s) => s.strategy === 'TQQQ_TURBOCORE_PRO');
    if (!def?.run_verified) return null;
    try {
        const res = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'sonar',
                temperature: 0.2,
                messages: [
                    { role: 'system', content: SYSTEM },
                    { role: 'user', content: `Facts for today (placeholders stand for the numbers): regime={{regime}}, confidence={{confidence}}, gates passed={{gates_passed}} of {{gates_total}}, status for QQQ Defensive: ${def.status}. Write the paragraph.` },
                ],
            }),
        });
        if (!res.ok) return null;
        const j: any = await res.json();
        const t = String(j?.choices?.[0]?.message?.content ?? '').replace(/\[\d+\]/g, '').trim();
        return t || null;
    } catch {
        return null;
    }
}

export function assemble(facts: FactsRun, kind: 'daily' | 'alert', rawCommentary: string | null): BriefingDraft {
    const vals = placeholderValues(facts);
    const subject = subjectFor(facts, kind);
    const build = (raw: string | null) => {
        const filled = raw ? fillPlaceholders(raw, vals) : null;
        const text = kind === 'alert' ? renderAlertText(facts) : renderDailyText(facts, filled);
        return { text, checks: runChecks({ kind, subject, text, rawCommentary: raw, facts }) };
    };
    let withC = build(kind === 'daily' ? rawCommentary : null);
    let statusOnly = !(kind === 'daily' && rawCommentary);
    let used = kind === 'daily' ? rawCommentary : null;
    if (!allPass(withC.checks) && used) {
        // A failed check only ever holds the commentary: fall back to the status-only version.
        const failed = withC.checks.filter((c) => !c.pass);
        const status = build(null);
        status.checks.push({ name: 'commentary_held', pass: true, detail: `Commentary held: ${failed.map((c) => `${c.name}${c.detail ? ` (${c.detail})` : ''}`).join('; ')}` });
        withC = status; used = null; statusOnly = true;
    }
    // The footer mark stays in the stored text: checks apply only above it, and sending strips it.
    const finalText = withC.text;
    return {
        kind, subject, text: finalText, html: textToHtml(withC.text, subject), commentary: used,
        status_only: statusOnly, checks: withC.checks, pass: allPass(withC.checks.filter((c) => c.name !== 'commentary_held')),
    };
}

export { overallStatus };
