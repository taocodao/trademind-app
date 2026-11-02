import { allPass, runChecks } from './filter';
import { fillPlaceholders, placeholderValues, renderAlertText, renderDailyText, subjectFor, textToHtml, overallStatus } from './templates';
import type { BriefingDraft, FactsRun } from './types';

const SYSTEM = `You write a short market context paragraph (60 to 120 words) for a quantitative research newsletter.
Rules, all mandatory:
- Use only these placeholders for any figure: {{regime}}. Never type a digit.
- Explain in plain English what the model's regime label means. Do not mention confidence, probabilities, scores, gates or price levels.
- Do not use the words buy, sell, add, exit, enter, trim or rebalance. Do not tell the reader what to do.
- Do not predict prices. Do not name causes such as the Fed, inflation, earnings or tariffs.
- No dashes of any kind. No exclamation points. Plain text only.`;

/** Reads the text from an Agent API response (output array of message items), with a flat output_text fallback. */
export function agentText(j: any): string {
    if (typeof j?.output_text === 'string') return j.output_text;
    const parts: string[] = [];
    for (const item of Array.isArray(j?.output) ? j.output : []) {
        if (item?.type !== 'message') continue;
        for (const c of Array.isArray(item.content) ? item.content : []) if (c?.type === 'output_text' && typeof c.text === 'string') parts.push(c.text);
    }
    return parts.join('\n');
}

const clean = (t: string) => t.replace(/\[\d+\]/g, '').trim();

/**
 * Asks the writing model for commentary. Returns null if unavailable; the briefing then goes out status-only.
 * Uses the Agent API with no tools (the model sees only the facts below and cannot search). If that call fails,
 * the older chat completions call is tried once so a model name change cannot silence the briefing.
 */
export async function draftCommentary(facts: FactsRun): Promise<string | null> {
    const key = process.env.PERPLEXITY_API_KEY;
    if (!key) return null;
    const def = facts.strategies.find((s) => s.strategy === 'TQQQ_TURBOCORE_PRO');
    if (!def?.run_verified) return null;
    const user = `Facts for today (placeholders stand for the numbers): regime={{regime}}, status for QQQ Defensive: ${def.status}. Write the paragraph.`;
    const headers = { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
    try {
        const res = await fetch('https://api.perplexity.ai/v1/agent', {
            method: 'POST', headers,
            body: JSON.stringify({ model: process.env.NEWSLETTER_WRITER_MODEL || 'perplexity/sonar', instructions: SYSTEM, input: user, max_output_tokens: 400 }),
        });
        if (res.ok) { const t = clean(agentText(await res.json())); if (t) return t; }
    } catch { /* fall through to the older call */ }
    try {
        const res = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST', headers,
            body: JSON.stringify({ model: 'sonar', temperature: 0.2, messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: user }] }),
        });
        if (!res.ok) return null;
        const j: any = await res.json();
        return clean(String(j?.choices?.[0]?.message?.content ?? '')) || null;
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
