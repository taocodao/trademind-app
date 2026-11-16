/**
 * Adviser outreach v5 ("seq" = 'v5'): one sequence, no A/B arms, links to open pages, click triggered follow ups.
 *
 * The model never writes a whole email. It reads the firm's own website text and returns five small pieces of JSON
 * (a fact sentence with the exact snippet it came from, one of four fixed struggle lines, a rapport choice, and two short
 * openings). Everything else is fixed text. Every piece is checked here, and a piece that fails is dropped and replaced
 * by fixed text, so an email can always be assembled and always passes the rules.
 *
 * Pure functions, no database, no network. Nothing here connects to a brokerage.
 */
import { SIM_SENTENCE, LIMITS_SENTENCE, subjectEnding, type Segment } from './cx-gen';

// ---------- fixed text (approved copy) ----------

export const V5_WHO = "I'm Eric, a retail investor in Queens. I wanted returns well above holding QQQ, so I built TradeMind, a rules based research model that uses AI and machine learning. It only publishes research and never connects to a brokerage or places trades.";
export const V5_OPEN = 'The simulation is open, with its method, limits and data on one page, so you can try to break it. The same page has a one page checklist of five benchmarks for a QQQ client plan.';
export const V5_OPEN_LARGE = " It is not meant to replace your firm's research.";
export const V5_STRUGGLE: Record<number, string> = {
    1: 'When a client brings a headline about QQQ, you need something you can show.',
    2: 'A client question about QQQ needs more than an opinion.',
    3: 'Rules that look fine in good years are hard to judge until you see the bad one.',
    4: 'A tested rule set is easier to discuss than a forecast.',
};
export const V5_RAPPORT: Record<string, string> = {
    queens: 'I am in Queens, so New York firms are close to home.',
    ai: 'I build with AI and machine learning myself.',
};
export const V5_PAGE_LINE = 'Here is the page:';
export const V5_STUDY_LINE = 'If you want to test it yourself, one of 20 study seats is free for four months:';
export const V5_CALL_LINE = 'If it is easier to talk it through, you can book 20 minutes to try to break the rules:';
export const V5_DEFAULT_E2 = 'Here is how the simulation compares with plain buy and hold QQQ.';
export const V5_DEFAULT_E3 = 'One more way in, if a page is not your format.';

/** Click triggered follow ups: the step they are sent as (outreach_sends.step) and their stored link token. */
export const V5_FOLLOW = {
    page: { step: 45, token: 'CK' },
    sim: { step: 46, token: 'VD' },
    study: { step: 47, token: 'STUDY' },
    sub: { step: 48, token: 'JN' },
} as const;
export type FollowKind = keyof typeof V5_FOLLOW;
export const FOLLOW_BODY: Record<FollowKind, string> = {
    page: 'The five benchmarks are also on a single printable page: {{CK}}\n\nIf a question stays open after you read them, the page has a button to book 20 minutes.',
    sim: 'The data files and method notes for the simulation are listed here: {{VD}}\n\nIf you find a weak spot, I would like to hear it.',
    study: 'The study has 20 seats. It is free for four months, and each monthly review you finish earns three more free months, up to twelve.\n\nDetails and the short application: {{STUDY}}',
    sub: 'The weekly brief is free, and subscribers get 30% off the first year of a strategy subscription when they buy within 90 days of confirming.\n\nSubscribe here: {{JN}}',
};

// ---------- data shapes ----------

export interface V5Input { token: string; firstName: string; firm: string; cityState: string; state: string; segment: Segment }
/** Stored in cx_profile.enrich. Everything here already passed validateEnrich. */
export interface Enrich {
    fact_sentence: string; fact_snippet: string; fact_url: string;
    struggle_id: 1 | 2 | 3 | 4; rapport: 'none' | 'queens' | 'ai';
    email_2_opening: string; email_3_opening: string; tone: string;
    researched_at: string; dropped: string[];
}
export interface V5Draft { step: 1 | 2 | 3; subject: string; body: string; words: number; errors: string[] }

const BANNED = ['confidence', 'probability of profit', 'protect capital', 'compound quietly', 'tier', 'tiers', 'final', 'last', 'worst fall shallow', 'guarantee', 'guaranteed', 'risk free', 'advice', 'recommend', 'safe', 'proven', 'solo founder', 'checking in', 'bumping', 'following up', 'exposure tier', 'purchased', 'outreach'];
const CLAIM_WORDS = ['fiduciary', 'independent', 'fee only', 'fee based', 'award', 'awards', 'ranked', 'best', 'top', 'largest', 'certified', 'cfp', 'cfa', 'years', 'decades', 'veteran', 'specialist', 'expert', 'experts'];
const norm = (s: string) => String(s || '').toLowerCase().replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/\s+/g, ' ').trim();
const wc = (s: string) => s.split(/\s+/).filter(Boolean).length;
const scan = (s: string, list: string[]): string[] => list.filter((b) => new RegExp(`(^|[^a-z])${b.replace(/ /g, '\\s+')}([^a-z]|$)`).test(s.toLowerCase()));

/** Hyphens between letters become spaces ("fee-only" to "fee only"). Dashes and other odd marks are left so the checks reject them. */
export const cleanModelText = (s: string): string => String(s ?? '').replace(/\s+/g, ' ').replace(/([A-Za-z])-([A-Za-z])/g, '$1 $2').replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').trim();

const addPeriod = (s: string): string => (s && !/[.!?]$/.test(s) ? `${s}.` : s);

/** Problems with one model written sentence. Names, numbers and claim words must be in the snippet, the firm name or the first name. */
function sentenceProblems(s: string, o: { min: number; max: number; allow: string; claims?: boolean }, label: string): string[] {
    const errs: string[] = [];
    const n = wc(s);
    if (n < o.min || n > o.max) errs.push(`${label}: ${n} words, need ${o.min} to ${o.max}`);
    if (/[\u2013\u2014\u2212]|--|-/.test(s)) errs.push(`${label}: dash or hyphen`);
    if (/[!*?]|[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/u.test(s)) errs.push(`${label}: exclamation, question mark, asterisk or emoji`);
    if (/https?:|www\.|@|\.com\b|\.ai\b|\.bot\b|\.tv\b/i.test(s)) errs.push(`${label}: url or address`);
    if (/[$%]/.test(s)) errs.push(`${label}: dollar or percent sign`);
    for (const b of scan(s, BANNED)) errs.push(`${label}: banned word ${b}`);
    for (const b of ['I saw', 'I noticed', 'I hope', 'My name is', 'my last', 'earlier note', 'as I mentioned']) if (norm(s).includes(b.toLowerCase())) errs.push(`${label}: banned phrase ${b}`);
    const allow = norm(o.allow);
    for (const m of s.match(/\d[\d,.]*/g) || []) if (!allow.includes(m.toLowerCase())) errs.push(`${label}: number not in the source ${m}`);
    if (o.claims !== false) for (const c of scan(s, CLAIM_WORDS)) if (!allow.includes(c)) errs.push(`${label}: claim word not in the source ${c}`);
    const words = s.split(/(?<=[.])\s+/).flatMap((x) => x.split(/\s+/).slice(1));
    for (const wd of words) {
        const c = wd.replace(/[^A-Za-z']/g, '');
        if (/^[A-Z][a-z]+/.test(c) && !['QQQ', 'TradeMind'].includes(c) && !allow.includes(c.toLowerCase())) errs.push(`${label}: name not in the source ${c}`);
    }
    return errs;
}

/**
 * Checks the model's raw JSON against the firm's website text. Returns a clean Enrich. A piece that fails is dropped
 * (the fact sentence disappears, the openings become fixed text, rapport becomes none), never repaired by guessing.
 */
export function validateEnrich(raw: unknown, ctx: { firstName: string; firm: string; state: string; siteText: string; siteUrls?: string[] }): { enrich: Enrich; problems: string[] } {
    const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const problems: string[] = []; const dropped: string[] = [];
    const site = norm(ctx.siteText);
    const base = `${ctx.firm} ${ctx.firstName}`;
    // fact sentence
    let fact = addPeriod(cleanModelText(String(r.fact_sentence ?? ''))); const snip = cleanModelText(String(r.fact_snippet ?? ''));
    let url = String(r.fact_url ?? '').trim();
    if (fact) {
        const errs = sentenceProblems(fact, { min: 6, max: 26, allow: `${snip} ${base}` }, 'fact');
        if (!snip || wc(snip) < 5) errs.push('fact: snippet missing or under 5 words');
        else if (!site.includes(norm(snip))) errs.push('fact: snippet is not in the website text');
        if (!/[.]$/.test(fact)) errs.push('fact: must end with a period');
        if (/\b(Eric|TradeMind)\b/.test(fact)) errs.push('fact: must be about the firm');
        if (ctx.siteUrls && url && !ctx.siteUrls.includes(url)) url = ctx.siteUrls[0] ?? '';
        if (errs.length) { problems.push(...errs); fact = ''; dropped.push('fact'); }
    }
    // struggle line: one of the four fixed lines
    let sid = Number(r.struggle_id); if (![1, 2, 3, 4].includes(sid)) { sid = 1; problems.push('struggle_id not 1 to 4, used 1'); }
    // rapport: a fixed sentence chosen by the model, only if it can be shown
    let rap = String(r.rapport ?? 'none').toLowerCase(); const rsnip = cleanModelText(String(r.rapport_snippet ?? ''));
    if (rap === 'queens') { if (!/^(ny|new york)$/i.test(ctx.state.trim())) { rap = 'none'; problems.push('rapport queens needs a New York firm'); dropped.push('rapport'); } }
    else if (rap === 'ai') {
        const re = /(artificial intelligence|machine learning|\bAI\b|technology|fintech)/i;
        if (!rsnip || !site.includes(norm(rsnip)) || !re.test(rsnip)) { problems.push(`rapport ${rap} has no matching snippet`); rap = 'none'; dropped.push('rapport'); }
    } else rap = 'none';
    // openings
    const open = (key: string, min: number, max: number, dflt: string): string => {
        const s = addPeriod(cleanModelText(String(r[key] ?? ''))); if (!s) return dflt;
        const errs = sentenceProblems(s, { min, max, allow: `${snip} ${base}`, claims: false }, key);
        if (/\b(simulation|returned|buy and hold|checklist|study|seat|book|minutes)\b/i.test(s)) errs.push(`${key}: repeats fixed text topics`);
        if (!/[.]$/.test(s)) errs.push(`${key}: must end with a period`);
        if (errs.length) { problems.push(...errs); dropped.push(key); return dflt; }
        return s;
    };
    const e2 = open('email_2_opening', 6, 22, V5_DEFAULT_E2); const e3 = open('email_3_opening', 4, 16, V5_DEFAULT_E3);
    return {
        enrich: { fact_sentence: fact, fact_snippet: fact ? snip : '', fact_url: fact ? url : '', struggle_id: sid as 1 | 2 | 3 | 4, rapport: rap as Enrich['rapport'], email_2_opening: e2, email_3_opening: e3, tone: String(r.tone ?? '').slice(0, 40), researched_at: new Date().toISOString(), dropped },
        problems,
    };
}

// ---------- assembly ----------

const greeting = (firstName: string) => (firstName ? `Hi ${firstName},` : 'Hello,');

/** Builds the stored drafts (merge tokens left in place). Large firms get email 1 only. */
export function buildV5(i: V5Input, e: Enrich | null): V5Draft[] {
    const hi = greeting(i.firstName);
    const struggle = V5_STRUGGLE[e?.struggle_id ?? 1];
    const p1 = [e?.fact_sentence, struggle].filter(Boolean).join(' ');
    const rap = e && e.rapport !== 'none' ? ` ${V5_RAPPORT[e.rapport]}` : '';
    const p3 = V5_OPEN + (i.segment === 'large_firm' ? V5_OPEN_LARGE : '');
    const bodies: Record<number, string> = {
        1: `${hi}\n\n${p1}\n\n${V5_WHO}${rap}\n\n${p3}\n\n${V5_PAGE_LINE} {{ADV}}`,
        2: `${hi}\n\n${e?.email_2_opening || V5_DEFAULT_E2}\n\n${SIM_SENTENCE} ${LIMITS_SENTENCE}\n\n${V5_STUDY_LINE} {{STUDY}}`,
        3: `${hi}\n\n${e?.email_3_opening || V5_DEFAULT_E3} ${V5_CALL_LINE} {{CAL}}`,
    };
    const steps: (1 | 2 | 3)[] = i.segment === 'large_firm' ? [1] : [1, 2, 3];
    return steps.map((step) => {
        const d: V5Draft = { step, subject: step === 1 ? `${i.firstName ? i.firstName + ', ' : ''}${subjectEnding(i.token, i.firstName, 1)}` : '', body: bodies[step], words: 0, errors: [] };
        d.words = v5Words(d.body); d.errors = checkV5(d, i);
        return d;
    });
}

/** The body for a click follow up, built at send time from fixed text. */
export function followBody(kind: FollowKind, firstName: string): string { return `${greeting(firstName)}\n\n${FOLLOW_BODY[kind]}`; }

/** Words after the greeting line. A link token counts as one word. */
export function v5Words(body: string): number { return wc(body.split('\n').slice(2).join(' ')); }

const RANGE: Record<string, [number, number]> = { 1: [80, 135], 2: [70, 115], 3: [20, 55], page: [15, 50], sim: [15, 50], study: [15, 55], sub: [15, 50] };
const TOKEN: Record<string, string> = { 1: 'ADV', 2: 'STUDY', 3: 'CAL', page: 'CK', sim: 'VD', study: 'STUDY', sub: 'JN' };
const ALLOWED_PCT = new Set(['+229.48%', '+49.46%', '14.59%', '22.88%', '30%']);

/** Rule checks on a stored body. An empty list means the email may be sent. */
export function checkV5(d: { step: number | string; subject?: string; body: string }, i?: V5Input): string[] {
    const errs: string[] = []; const key = String(d.step); const body = d.body;
    const words = v5Words(body); const [lo, hi] = RANGE[key] ?? [15, 130];
    if (words < lo || words > hi) errs.push(`word count ${words} outside ${lo} to ${hi}`);
    const toks = body.match(/\{\{[A-Z]+\}\}/g) || [];
    if (toks.length !== 1 || toks[0] !== `{{${TOKEN[key]}}}`) errs.push(`needs exactly one {{${TOKEN[key]}}} link, found ${toks.join(' ') || 'none'}`);
    if (!body.startsWith(i ? greeting(i.firstName) : 'Hi ') && !/^(Hi [A-Za-z'.]+|Hello),/.test(body)) errs.push('greeting missing');
    if (/https?:|www\.|@/i.test(body)) errs.push('url or address text in body');
    const own = [V5_WHO, V5_OPEN, V5_STUDY_LINE, V5_CALL_LINE, SIM_SENTENCE, LIMITS_SENTENCE, ...Object.values(FOLLOW_BODY).flatMap((x) => x.split('\n\n'))].reduce((a, f) => a.split(f).join(''), body.split('\n').slice(2).join('\n'));
    if (/[\u2013\u2014\u2212]|--/.test(body) || /-/.test(own)) errs.push('dash or hyphen');
    if (/[!*]|[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/u.test(body + (d.subject ?? ''))) errs.push('exclamation, asterisk or emoji');
    if ((body.match(/\?/g) || []).length > 1) errs.push('more than one question mark');
    for (const b of scan(`${d.subject ?? ''} ${own}`, BANNED)) errs.push(`banned word ${b}`);
    for (const p of body.match(/[+-]?\d[\d,.]*%/g) || []) if (!ALLOWED_PCT.has(p)) errs.push(`figure not allowed ${p}`);
    if (key !== '2' && /\+229\.48%/.test(body)) errs.push('figures only belong in email 2');
    if (/[$]/.test(body)) errs.push('dollar sign');
    if (key === '1') {
        if (!body.includes(V5_WHO)) errs.push('who paragraph altered');
        if (!body.includes(V5_OPEN)) errs.push('open paragraph altered');
        if (!Object.values(V5_STRUGGLE).some((s) => body.includes(s))) errs.push('struggle line missing');
        if (d.subject !== undefined && i && !d.subject) errs.push('subject missing');
        if (d.subject && /[A-Z]{2}/.test(d.subject.replace(/^[^,]+,\s*/, ''))) errs.push('subject must be lowercase after the name');
    }
    if (key === '2') { if (!body.includes(`${SIM_SENTENCE} ${LIMITS_SENTENCE}`)) errs.push('simulation sentence must be followed directly by the limits sentence'); if (!body.includes(V5_STUDY_LINE)) errs.push('study line altered'); }
    if (key === '3' && !body.includes(V5_CALL_LINE)) errs.push('call line altered');
    for (const k of ['page', 'sim', 'study', 'sub'] as FollowKind[]) if (key === k && !body.includes(FOLLOW_BODY[k].split('\n')[0].replace(/ \{\{[A-Z]+\}\}$/, ''))) errs.push('follow up text altered');
    return errs;
}

// ---------- which follow up a set of clicks earns ----------

/** link_type values recorded by /r/[token]/[kind] mapped to the area they show interest in. Calls and subscribes need no follow up. */
export const CLICK_AREA: Record<string, 'page' | 'sim' | 'study'> = {
    adviser_sample: 'page', checklist: 'page',
    record: 'sim', sim_data: 'sim', virtual_accounts: 'sim',
    apply: 'study',
};
/** Given the human clicked link types (latest last), the follow up to send, or null. Two or more different areas earn the subscribe note. */
export function followFor(linkTypes: string[], already: FollowKind[]): FollowKind | null {
    const areas = linkTypes.map((t) => CLICK_AREA[t]).filter(Boolean);
    if (!areas.length) return null;
    const distinct = [...new Set(areas)];
    const pick: FollowKind = distinct.length >= 2 ? 'sub' : (distinct[0] as FollowKind);
    return already.includes(pick) ? null : pick;
}

// ---------- the prompt ----------

export const V5_SYSTEM = `You help write one short email from Eric to a US financial adviser. Eric is a retail investor in Queens who wanted returns well above holding QQQ and built TradeMind, a rules based research model that uses AI and machine learning. You do NOT write the email. You return ONE JSON object with a few small pieces, using ONLY the website text you are given. Return JSON only, no other words.

Fields:
- fact_sentence: one plain sentence, 8 to 24 words, stating one specific fact about the firm that the website text says. Start with the firm's short name or "Your firm". Use only names, numbers and claims that appear in the snippet. No praise words, no awards or rankings, no years of experience, no hyphens, no dashes, no question marks. Prefer what the firm does for clients or who it serves over office locations, dates or news. Use an empty string if the text gives no clear fact.
- fact_snippet: the exact words copied from the website text that support the fact, at least 5 words, character for character. Empty string if there is no fact.
- fact_url: the page address the snippet came from, as given.
- struggle_id: 1, 2, 3 or 4, the line that fits this firm's clients best.
  1 = a client brings a headline about QQQ (firms that talk to clients about markets, news, podcasts or newsletters)
  2 = a client question about QQQ needs more than an opinion (firms that stress planning, process or education)
  3 = rules that look fine in good years are hard to judge until the bad one (firms that stress retirement, income, risk or preservation)
  4 = a tested rule set is easier to discuss than a forecast (firms that stress discipline, evidence or research)
- rapport: "queens" only if the firm is in New York. "ai" only if the website text itself talks about technology, AI or machine learning. Otherwise "none".
- rapport_snippet: exact words from the website text that justify "ai". Empty string otherwise.
- email_2_opening: one sentence, 8 to 20 words, that frames the size of a drop before the gains, for this firm's typical client (for example near retirement, a business owner, a family). Plain words, no numbers. Do not mention a simulation, figures, a study, a checklist or a call.
- email_3_opening: one sentence, 4 to 14 words, a soft lead in to offering a call. Vary the wording. No question mark.
- tone: formal, neutral or casual, judged from how the website is written.

Rules: plain English, short sentences, no hyphens or dashes anywhere, no exclamation marks, no question marks, no emojis. Never mention advice, guarantees, safety or any return figure. Never claim anything about the firm that is not in the website text.
Example of the JSON shape: {"fact_sentence":"","fact_snippet":"","fact_url":"","struggle_id":1,"rapport":"none","rapport_snippet":"","email_2_opening":"","email_3_opening":"","tone":"neutral"}`;

export function v5UserPrompt(i: { firstName: string; firm: string; title: string; cityState: string; state: string; employees: string; keywords: string }, site: { text: string; urls: string[] }): string {
    return `Adviser: ${i.firstName}, ${i.title || 'title unknown'}, ${i.firm}. Location: ${i.cityState || 'unknown'}. Staff: ${i.employees || 'unknown'}.
Firm keywords from a list (not website text, do not quote them as facts): ${i.keywords.slice(0, 300)}
Website pages read: ${site.urls.join(' ; ') || 'none'}
Website text (the only source for facts, snippets and rapport):
"""
${site.text.slice(0, 6000) || '(no website text could be read)'}
"""
Return the JSON object now.`;
}
