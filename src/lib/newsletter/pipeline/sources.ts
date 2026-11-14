/**
 * Public narrative path. Perplexity Search finds sources; the writer (Agent API, no tools) turns only those
 * snippets into short items. Every figure in the output must appear in the snippets, every source must be one that
 * was returned, and the wording rules are checked in code. The writer never receives strategy or account fields.
 */
import rules from '@/data/banned-phrases.json';
import { agentText } from '@/lib/briefing/assemble';
import type { ContextItem } from '../edition-render';

export interface SearchHit { title: string; url: string; snippet: string; date: string | null }

const HEADERS = () => ({ Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`, 'Content-Type': 'application/json' });

export async function searchSources(queries: string[], opts: { maxResults?: number; recency?: 'day' | 'week' | 'month'; domainsDeny?: string[] } = {}): Promise<SearchHit[]> {
    if (!process.env.PERPLEXITY_API_KEY) return [];
    try {
        const res = await fetch('https://api.perplexity.ai/search', {
            method: 'POST', headers: HEADERS(),
            body: JSON.stringify({
                query: queries.slice(0, 5), max_results: opts.maxResults ?? 8, max_tokens_per_page: 1200, country: 'US',
                search_recency_filter: opts.recency ?? 'week',
                ...(opts.domainsDeny?.length ? { search_domain_filter: opts.domainsDeny.map((d) => `-${d}`) } : {}),
            }),
        });
        if (!res.ok) return [];
        const j: any = await res.json();
        // Multi-query responses may nest results per query; flatten either shape and drop duplicates.
        const flat: any[] = Array.isArray(j?.results) ? j.results.flatMap((r: any) => (Array.isArray(r) ? r : [r])) : [];
        const seen = new Set<string>(); const out: SearchHit[] = [];
        for (const r of flat) {
            const url = String(r?.url ?? ''); if (!url || seen.has(url)) continue; seen.add(url);
            out.push({ title: String(r?.title ?? ''), url, snippet: String(r?.snippet ?? '').slice(0, 2500), date: r?.date ? String(r.date) : null });
        }
        return out;
    } catch { return []; }
}

const SYSTEM = `You write short market context items for a QQQ research newsletter. You are given numbered sources. Use only facts stated in them.
Return only JSON: {"hook": string, "preheader": string, "items": [{"headline": string, "body": string, "source": number}], "week_ahead": [{"text": string, "source": number}], "tie_in": {"text": string, "source": number}}.
Rules, all mandatory:
- 3 items, each body 20 to 45 words, plain statements of what happened or what is scheduled. "source" is the number of the one source that states it.
- week_ahead: 0 to 4 scheduled events (earnings, data releases, meetings) with dates, each stated in a source.
- tie_in: one or two plain sentences, 20 to 45 words, that say why a week like this one is a reason to keep a written, repeatable investing process. It must rest on one fact in one source, and it must not advise or predict.
- hook: one plain sentence under 16 words about the main item. preheader: under 14 words.
- Any number you write must appear in that source. Never write prices, index levels or dollar amounts. Percent moves are allowed only if the source states them.
- Do not predict, advise, or say what a reader should do. Do not use the words buy, sell, add, exit, enter, trim, rebalance. Do not say a move was caused by something unless the source says so.
- No dashes of any kind, no exclamation points, no emojis. Plain text.`;

export interface Written { hook: string; preheader: string; context: ContextItem[]; weekAhead: string[]; tieIn: string; problems: string[] }

const nums = (s: string) => (s.match(/\d[\d,]*\.?\d*/g) || []).map((n) => n.replace(/,/g, '').replace(/\.$/, ''));
const ACTION = /\b(buy|sell|add|exit|enter|trim|rebalance|should|must)\b/i;
const PRICE = /\$\s?\d|\bindex level\b|\b\d{1,3},\d{3}(\.\d+)?\b/;
const DASH = /[\u2013\u2014]|--/;
const hostName = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return 'source'; } };

export function validateWritten(raw: any, hits: SearchHit[]): Written {
    const problems: string[] = [];
    const items: ContextItem[] = []; const ahead: string[] = [];
    const check = (label: string, text: string, src: number) => {
        const hit = hits[src - 1];
        if (!hit) { problems.push(`${label}: source ${src} not in results`); return false; }
        const hay = new Set(nums(hit.snippet + ' ' + hit.title));
        const stray = nums(text).filter((n) => !hay.has(n));
        if (stray.length) problems.push(`${label}: numbers not in source: ${stray.join(', ')}`);
        if (PRICE.test(text)) problems.push(`${label}: price or level`);
        if (ACTION.test(text)) problems.push(`${label}: action or advice word`);
        if (DASH.test(text) || /!/.test(text)) problems.push(`${label}: dash or exclamation`);
        const low = text.toLowerCase();
        for (const ph of rules.phrases) if (low.includes(ph)) problems.push(`${label}: banned phrase ${ph}`);
        return true;
    };
    for (const [k, it] of (Array.isArray(raw?.items) ? raw.items : []).entries()) {
        const src = Number(it?.source); const headline = String(it?.headline ?? '').trim(); const body = String(it?.body ?? '').trim();
        if (!headline || !body) { problems.push(`item ${k + 1}: empty`); continue; }
        const words = body.split(/\s+/).length; if (words < 12 || words > 60) problems.push(`item ${k + 1}: ${words} words`);
        if (check(`item ${k + 1}`, `${headline} ${body}`, src)) items.push({ headline, body, sourceName: hostName(hits[src - 1].url), sourceUrl: hits[src - 1].url });
    }
    for (const [k, it] of (Array.isArray(raw?.week_ahead) ? raw.week_ahead : []).entries()) {
        const text = String(it?.text ?? '').trim(); if (!text) continue;
        if (check(`week ahead ${k + 1}`, text, Number(it?.source))) ahead.push(text);
    }
    let tieIn = '';
    if (raw?.tie_in?.text) { tieIn = String(raw.tie_in.text).trim(); check('tie in', tieIn, Number(raw.tie_in.source)); }
    const hook = String(raw?.hook ?? '').trim(); const preheader = String(raw?.preheader ?? '').trim();
    if (!hook) problems.push('hook missing');
    for (const [l, t] of [['hook', hook], ['preheader', preheader]] as const) {
        if (DASH.test(t) || /!/.test(t) || ACTION.test(t) || PRICE.test(t)) problems.push(`${l}: wording rule`);
        const hay = new Set(nums(hits.map((h) => h.snippet + ' ' + h.title).join(' ')));
        const stray = nums(t).filter((n) => !hay.has(n)); if (stray.length) problems.push(`${l}: numbers not in sources`);
    }
    if (items.length < 2) problems.push(`only ${items.length} usable items`);
    return { hook, preheader, context: items, weekAhead: ahead, tieIn, problems };
}

export async function writeFromSources(hits: SearchHit[], dateLabel: string, kind: 'weekly' | 'daily'): Promise<Written | null> {
    if (!process.env.PERPLEXITY_API_KEY || !hits.length) return null;
    const src = hits.slice(0, 10).map((h, i) => `[${i + 1}] ${h.title} (${h.date ?? 'undated'})\n${h.snippet}`).join('\n\n');
    try {
        const res = await fetch('https://api.perplexity.ai/v1/agent', {
            method: 'POST', headers: HEADERS(),
            body: JSON.stringify({
                model: process.env.NEWSLETTER_WRITER_MODEL || 'perplexity/sonar', instructions: SYSTEM, max_output_tokens: 1200,
                input: `Edition: ${kind}, ${dateLabel}. ${kind === 'weekly' ? 'Cover the week just ended and the week ahead.' : 'Cover what matters for today.'}\n\nSources:\n${src}`,
            }),
        });
        if (!res.ok) return null;
        const text = agentText(await res.json()).replace(/^```(?:json)?|```$/gm, '').trim();
        const raw = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
        return validateWritten(raw, hits.slice(0, 10));
    } catch { return null; }
}
