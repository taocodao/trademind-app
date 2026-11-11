/**
 * Adviser outreach v2 ("cx-gen"): segment choice, the writing prompts, token expansion, the automatic checks and the fixed fallback.
 * Pure functions, no database and no network. The model call is passed in by the runner.
 *
 * Design: four emails. Email 1 is a short offer of the sample (no figures). Email 2 carries the simulation sentence and the limits sentence.
 * Email 3 shows the virtual accounts and the weekly brief. Email 4 is a short close note. Arm A has no link in any email, arm B has one.
 * The model never types the fixed sentences: it writes [[SIM_SENTENCE]], [[LIMITS_SENTENCE]], [[ML_SENTENCE]] and [[LINK]], the script swaps them in.
 */
import { createHash } from 'crypto';
import { LIMITS_LINE } from './cx-copy';

export type Segment = 'owner' | 'adviser' | 'large_firm';
export type Arm = 'A' | 'B';
export type EmailId = 1 | 2 | 3 | 4;

export const SIM_SENTENCE = 'In a two year simulation (October 14, 2024 to October 13, 2026), QQQ LEAPS returned +229.48% against +49.46% for QQQ buy and hold, with a largest decline of 14.59% against 22.88%.';
export const LIMITS_SENTENCE = LIMITS_LINE;
export const ML_SENTENCE = 'It follows fixed rules, and it is also fine tuned and keeps growing and improving with machine learning.';

export const E1_P2 = "I'm Eric. I built TradeMind, a QQQ research model that follows fixed rules. It only publishes research and never connects to a brokerage or places trades.";
export const E1_P3 = 'The five minute research sample shows what the model reads now, why its most recent signal changed, and what would prove it wrong.';
export const FALLBACK_HOOK = 'If a client asks whether QQQ still fits their plan, a second read can help.';

export const SUBJECT_ENDINGS_1 = ['qqq question', 'quick qqq question', 'qqq second read', 'qqq rules question', 'question on qqq', 'qqq risk question', 'nasdaq question', 'qqq research sample', 'second read on qqq'];
export const SUBJECT_ENDING_3 = 'qqq weekly brief';

export interface GenInput {
    token: string; email: string; firstName: string; title: string; firm: string; firmKey: string; cityState: string; employees: string;
    keywords: string; websiteText: string; linkedinText: string; segment: Segment; arm: Arm;
}
export interface FactUsed { fact: string; source_field: string; snippet: string }
export interface GenEmail {
    emailId: EmailId; subject: string; greeting: string; paragraphs: string[]; facts: FactUsed[]; level: string; words: number; source: 'model' | 'fallback'; problems: string[];
}

// ---------- segment ----------

const OWNER_TITLE = /(founder|owner|president|principal|partner|\bceo\b|chief executive|\bcio\b|chief investment)/i;
const NOT_OWNER = /(vice president|\bvp\b|managing director|assistant|associate)/i;
const LARGE_DOMAINS = new Set(['ml.com', 'merrilledge.com', 'morganstanley.com', 'wellsfargo.com', 'wellsfargoadvisors.com', 'edwardjones.com', 'ameriprise.com', 'rjf.com', 'raymondjames.com', 'lpl.com', 'stifel.com', 'rbc.com', 'rbccm.com', 'ubs.com', 'jpmorgan.com', 'jpmorganchase.com', 'chase.com', 'fidelity.com', 'schwab.com', 'transamerica.com', 'nm.com', 'northwesternmutual.com', 'primerica.com', 'lpl.com', 'pnc.com', 'usbank.com', 'truist.com', 'bofa.com', 'bankofamerica.com', 'thrivent.com', 'vanguard.com', 'tdameritrade.com', 'janney.com', 'oppenheimer.com', 'baird.com', 'wellsfargo.net']);

export function segmentOf(p: { title: string; employees: string; firmKey: string }): Segment {
    const emp = /^\d+$/.test(String(p.employees || '').trim()) ? Number(p.employees) : NaN;
    if ((!Number.isNaN(emp) && emp >= 500) || LARGE_DOMAINS.has(String(p.firmKey || '').toLowerCase())) return 'large_firm';
    if (OWNER_TITLE.test(p.title || '') && !NOT_OWNER.test(p.title || '') && !Number.isNaN(emp) && emp < 100) return 'owner';
    return 'adviser';
}

const hashInt = (token: string, salt: string) => parseInt(createHash('sha256').update(`${token}:${salt}`).digest('hex').slice(0, 8), 16);

export function subjectEnding(token: string, firstName: string, emailId: 1 | 3): string {
    if (emailId === 3) return SUBJECT_ENDING_3;
    const pool = SUBJECT_ENDINGS_1.filter((e) => `${firstName}, ${e}`.length <= 36);
    const list = pool.length ? pool : ['qqq question'];
    return list[hashInt(token, 'subj1') % list.length];
}

// ---------- prompts ----------

export const SYSTEM_PROMPT = `You write one short cold email from Eric Huang, Founder, TradeMind, to a US financial adviser. Return one JSON object only.

PRODUCT FACTS (the only product claims allowed)
- TradeMind is a QQQ research model that follows fixed rules. It only publishes research. It never connects to a brokerage or places trades.
- Assets: a free five minute research sample; a simulation page with the assumptions, the largest drop and the limits; two virtual accounts that have followed the signals since mid October 2026, shown with a five day delay; a free weekly research brief.
- Machine learning may be mentioned only by inserting [[ML_SENTENCE]].

TOKENS: copy them exactly. [[LIMITS_SENTENCE]] must directly follow [[SIM_SENTENCE]] in the same paragraph. Never use one without the other.

PERSONAL FACTS
- Use only facts found in the inputs. Each needs an exact snippet copied from one named input field.
- Priority: linkedin_text post about markets, investing or clients; then website_text; then title; then keywords.
- Keywords alone allow only "works in <area>" wording.
- Never guess about clients, holdings, results or opinions. Never say clients own QQQ. Describe situations with "if" or "when".
- No praise. Never write "I saw", "I noticed", "I hope", or "My name is".
- If no usable fact exists, use the fallback hook and set personalization_level to "none".

STYLE
- Simple words a seventh grader knows. Sentences of 20 words or fewer. A line break between every paragraph.
- No hyphens, em dashes, en dashes or double hyphens in your own words.
- No exclamation points, emojis, asterisks, percent signs or dollar signs.
- No digits unless they are copied from an input snippet.
- Banned: confidence, probability of profit, protect capital, compound quietly, tier, final, last, worst fall shallow, guarantee, guaranteed, risk free, advice, recommend, safe, proven, solo founder, checking in, bumping, following up.
- Never suggest connecting a brokerage, placing trades, using this with clients, or results from real accounts.
- One question as the call to action. No signature, footer or opt out line.

OUTPUT
{"email_id":"","subject":"","greeting":"Hi {{first_name}},","body_paragraphs":[],
"facts_used":[{"fact":"","source_field":"","snippet":""}],
"personalization_level":"post|website|title|keywords|none","word_count":0,
"self_check":{"only_input_facts":true,"first_sentence_about_reader":true,"one_question_cta":true,"link_rule_met":true,"tokens_unaltered":true,"no_banned_words":true,"no_forbidden_chars":true,"within_word_range":true}}`;

const SEG_WORDS: Record<Segment, string> = { owner: "your firm's view of QQQ", adviser: 'when you prepare for a client meeting', large_firm: 'for your own reading' };
export const FRAMES = [
    'When a client asks whether QQQ still fits their plan, a second read can help.',
    'When QQQ comes up in a client review, a second read can help.',
    'If a client asks how QQQ would hold up in a sharp drop, a second read can help.',
    'If QQQ comes up before a client meeting, a second read can help.',
    'When a client asks about the Nasdaq, a second read can help.',
];
export const frameFor = (token: string) => FRAMES[hashInt(token, 'frame') % FRAMES.length];
const CTA_A = ['Would you be open to reviewing the sample research?', 'Mind if I send over the sample summary?', 'Worth taking a look at the sample research?'];

export function ctaA(token: string): string { return CTA_A[hashInt(token, 'cta') % CTA_A.length]; }

export function userPrompt(emailId: EmailId, i: GenInput, previous: string[], ending: string): string {
    const head = `first_name=${i.firstName} title=${i.title} firm=${i.firm} city_state=${i.cityState} employees=${i.employees}\nkeywords=${i.keywords}\nwebsite_text=${i.websiteText || '(none)'}\nlinkedin_text=${i.linkedinText || '(none)'}\nsegment=${i.segment} arm=${i.arm}`;
    const prev = previous.length ? `previous_emails=${previous.map((p, k) => `[email ${k + 1}]\n${p}`).join('\n\n')}` : 'previous_emails=(none)';
    if (emailId === 1) {
        const p4 = i.arm === 'A'
            ? `P4 (call to action): exactly this question and nothing else, no link: "${ctaA(i.token)}"`
            : 'P4 (call to action): exactly "Would you be open to reviewing the sample research? [[LINK]]"';
        const seg = i.segment === 'large_firm' ? ' Add to P3 the sentence "This is not meant to replace your firm\'s research."' : '';
        return `EMAIL 1\n${head}\nsubject_ending=${ending}\n\nsubject = "${i.firstName}, ${ending}"\nP1 (context, at most 30 words): one clear fact about what the firm does for clients taken from website_text or linkedin_text, then this second sentence or a close variant: "${frameFor(i.token)}" If there is no such fact (the title and keywords alone do not count), P1 is only the second sentence, facts_used is empty and personalization_level is "none". Never open with "As a <title>". Never quote legal or regulatory disclosure text, fragments, or text about licensing, registration or who offers services. You may use this phrase once if it reads naturally, never twice: "${SEG_WORDS[i.segment]}". Do not repeat any phrase inside P1. A website fact is better than a title fact; use the title only if nothing else is usable.\nP2 (who I am), exactly: "${E1_P2}"\nP3 (offer), exactly: "${E1_P3}"${seg}\n${p4}\nFallback P1 when no usable fact: "${FALLBACK_HOOK}"\nBody total: 70 to 100 words. Never use the words last or final. Use "${i.firstName}" only in the greeting and subject.`;
    }
    if (emailId === 2) {
        const p3 = i.arm === 'A' ? 'Worth a look at the methodology?' : 'Worth a look at the methodology? [[LINK]]';
        return `EMAIL 2 (same thread, business day 3)\nfirst_name=${i.firstName} arm=${i.arm}\n${prev}\nclick_data=none\n\nsubject = "" (the script threads it)\nP1: one sentence starting "The reason I asked:" about judging a model by its drop or limits. At most 12 words.\nP2: exactly "[[SIM_SENTENCE]] [[LIMITS_SENTENCE]]"\nP3: exactly "${p3}"\nDo not repeat any sentence from previous_emails. No new personal facts. Body total under 80 words, so you have about 18 words of your own.`;
    }
    if (emailId === 3) {
        const p4 = i.arm === 'A' ? 'Open to getting the weekly brief?' : 'Open to getting the weekly brief? [[LINK]]';
        return `EMAIL 3 (new subject, business day 6)\nfirst_name=${i.firstName} arm=${i.arm} subject_ending=${ending}\n${prev}\nclick_data=none\n\nsubject = "${i.firstName}, ${ending}"\nP1: one sentence offering a new angle: they do not have to take the simulation on trust. At most 14 words.\nP2: two virtual accounts have followed the signals since mid October 2026, shown with a five day delay. Say they are not real money. At most 25 words.\nP3: exactly "[[ML_SENTENCE]]"\nP4: exactly "${p4}"\nNo simulation figures. Body total under 80 words.`;
    }
    const p3 = i.arm === 'A' ? 'Should I send them, or close your file?' : 'Here they are if useful: [[LINK]] Should I close your file?';
    return `EMAIL 4 (business day 10)\nfirst_name=${i.firstName} arm=${i.arm}\n${prev}\n\nP1: one sentence saying the sample and the weekly brief stay open to advisers if a second read on QQQ helps later. At most 22 words. Do not say you will stop writing.\nP2: exactly "${p3}"\nBody total under 45 words. Never use the words final or last.`;
}

// ---------- fixed fallback ----------

export function fallbackEmail(emailId: EmailId, i: GenInput, ending: string): GenEmail {
    const hi = `Hi ${i.firstName},`;
    const seg = i.segment === 'owner' ? "your firm's view of QQQ" : i.segment === 'large_firm' ? 'your own reading' : 'your own prep';
    let paras: string[] = []; let subject = `${i.firstName}, ${ending}`;
    if (emailId === 1) paras = [`${FALLBACK_HOOK} This note is about ${seg}.`, E1_P2, E1_P3 + (i.segment === 'large_firm' ? " This is not meant to replace your firm's research." : ''), i.arm === 'A' ? ctaA(i.token) : 'Would you be open to reviewing the sample research? [[LINK]]'];
    if (emailId === 2) { paras = ['The reason I asked: the drop and the limits matter more than the gain.', '[[SIM_SENTENCE]] [[LIMITS_SENTENCE]]', i.arm === 'A' ? 'Worth a look at the methodology?' : 'Worth a look at the methodology? [[LINK]]']; subject = ''; }
    if (emailId === 3) paras = ['You do not have to take the simulation on trust.', 'Two virtual accounts have followed the signals since mid October 2026, shown with a five day delay. They are not real money.', '[[ML_SENTENCE]]', i.arm === 'A' ? 'Open to getting the weekly brief?' : 'Open to getting the weekly brief? [[LINK]]'];
    if (emailId === 4) { paras = ['The sample and the weekly brief stay open to advisers if a second read on QQQ helps later.', i.arm === 'A' ? 'Should I send them, or close your file?' : 'Here they are if useful: [[LINK]] Should I close your file?']; subject = ''; }
    const e: GenEmail = { emailId, subject, greeting: hi, paragraphs: paras, facts: [], level: 'none', words: 0, source: 'fallback', problems: [] };
    e.words = bodyWords(e.paragraphs);
    return e;
}

// ---------- token expansion and checks ----------

export function expand(p: string): string {
    return p.replace(/\[\[SIM_SENTENCE\]\]/g, SIM_SENTENCE).replace(/\[\[LIMITS_SENTENCE\]\]/g, LIMITS_SENTENCE).replace(/\[\[ML_SENTENCE\]\]/g, ML_SENTENCE);
}
export function bodyWords(paras: string[]): number {
    return expand(paras.join(' ').replace(/\[\[LINK\]\]/g, '')).split(/\s+/).filter(Boolean).length;
}

const BANNED = ['confidence', 'probability of profit', 'protect capital', 'compound quietly', 'tier', 'tiers', 'final', 'last', 'worst fall shallow', 'guarantee', 'guaranteed', 'risk free', 'advice', 'recommend', 'safe', 'proven', 'solo founder', 'checking in', 'bumping', 'following up', 'exposure tier'];
const WORD_RANGE: Record<EmailId, [number, number]> = { 1: [70, 100], 2: [30, 79], 3: [30, 79], 4: [20, 44] };
const FIXED_TEXT = [SIM_SENTENCE, LIMITS_SENTENCE, ML_SENTENCE];
const norm = (s: string) => s.toLowerCase().replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/\s+/g, ' ').trim();

export function checkEmail(e: { emailId: EmailId; subject: string; greeting: string; paragraphs: string[]; facts: FactUsed[]; level: string }, i: GenInput, ending: string, previous: string[]): string[] {
    const errs: string[] = [];
    const raw = e.paragraphs.join('\n\n');
    const full = expand(raw);
    // Own text: the body with the fixed sentences cut out, so hyphen and digit checks only apply to the model's words.
    let own = raw.replace(/\[\[(SIM_SENTENCE|LIMITS_SENTENCE|ML_SENTENCE|LINK)\]\]/g, '');
    for (const f of [E1_P2, E1_P3]) own = own.split(f).join('');
    const all = `${e.subject}\n${e.greeting}\n${full}`;
    if (!e.paragraphs.length || e.paragraphs.some((p) => !String(p).trim())) errs.push('empty paragraph');
    // words
    const w = bodyWords(e.paragraphs); const [lo, hi] = WORD_RANGE[e.emailId];
    if (w < lo || w > hi) errs.push(`word count ${w} outside ${lo} to ${hi}`);
    // links
    const links = (raw.match(/\[\[LINK\]\]/g) || []).length;
    if (i.arm === 'A' && links) errs.push('arm A must have no link');
    if (i.arm === 'B' && links !== 1) errs.push(`arm B needs exactly one link, found ${links}`);
    if (/https?:|www\.|@|\.com\b|\.ai\b|\.bot\b|\.tv\b/i.test(all)) errs.push('domain, address or url text present');
    // fixed sentences
    const hasSim = raw.includes('[[SIM_SENTENCE]]'), hasLim = raw.includes('[[LIMITS_SENTENCE]]');
    if (e.emailId === 2) { if (!raw.includes('[[SIM_SENTENCE]] [[LIMITS_SENTENCE]]')) errs.push('email 2 needs the simulation and limits tokens together, in order'); }
    else if (hasSim || hasLim) errs.push('simulation or limits tokens only belong in email 2');
    if (/\[\[(?!SIM_SENTENCE|LIMITS_SENTENCE|ML_SENTENCE|LINK)[A-Z_]+\]\]/.test(raw)) errs.push('unknown token');
    if (e.emailId === 1) { if (!e.paragraphs.includes(E1_P2)) errs.push('P2 is not the exact fixed paragraph'); if (!norm(full).includes(norm(E1_P3))) errs.push('P3 offer sentence missing or altered'); }
    if (e.emailId === 3 && !raw.includes('[[ML_SENTENCE]]')) errs.push('email 3 needs the machine learning token');
    if (e.emailId !== 3 && raw.includes('[[ML_SENTENCE]]')) errs.push('machine learning token only belongs in email 3');
    // percentages and digits
    const allowed = new Set(['+229.48%', '+49.46%', '14.59%', '22.88%']);
    for (const p of full.match(/[+-]?\d[\d,.]*%/g) || []) if (!allowed.has(p)) errs.push(`figure not allowed ${p}`);
    if (e.emailId !== 2 && /%/.test(full)) errs.push('percent sign outside email 2');
    if (/[$]/.test(all)) errs.push('dollar sign');
    // characters
    if (/[\u2013\u2014\u2212]|--/.test(all)) errs.push('dash character');
    if (/[-]/.test(own)) errs.push('hyphen in own words');
    if (/[!*]|[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/u.test(all)) errs.push('exclamation, asterisk or emoji');
    // banned words (whole words, any case) on the model's own words and the subject
    const scan = `${e.subject} ${own}`.toLowerCase();
    for (const b of BANNED) if (new RegExp(`(^|[^a-z])${b.replace(/ /g, '\\s+')}([^a-z]|$)`).test(scan)) errs.push(`banned word ${b}`);
    for (const b of ['I saw', 'I noticed', 'I hope', 'My name is']) if (norm(own).includes(b.toLowerCase())) errs.push(`banned phrase ${b}`);
    if (/stop writing|will stop/i.test(full)) errs.push('do not say you will stop writing');
    // question
    const qs = (full.match(/\?/g) || []).length;
    if (qs !== 1) errs.push(`needs exactly one question mark, found ${qs}`);
    // subject
    if (e.emailId === 1 || e.emailId === 3) {
        const want = `${i.firstName}, ${ending}`;
        if (e.subject !== want) errs.push(`subject must be "${want}"`);
    } else if (e.subject) errs.push('threaded emails use no own subject');
    if (e.greeting !== `Hi ${i.firstName},`) errs.push('greeting must be "Hi {first name},"');
    // facts must be exact substrings of the named input field
    const fields: Record<string, string> = { website_text: i.websiteText, linkedin_text: i.linkedinText, title: i.title, keywords: i.keywords, firm: i.firm, city_state: i.cityState, employees: i.employees };
    for (const f of e.facts) {
        const src = fields[f.source_field];
        if (src === undefined) { errs.push(`unknown source_field ${f.source_field}`); continue; }
        if (!f.snippet || !norm(src).includes(norm(f.snippet))) errs.push(`snippet not found in ${f.source_field}: ${String(f.snippet).slice(0, 40)}`);
    }
    // email 1 first paragraph: names and numbers must come from a snippet, the first name, the firm or QQQ
    if (e.emailId === 1 && e.level !== 'none') {
        const p1 = e.paragraphs[0] || ''; const snip = norm(e.facts.map((f) => f.snippet).join(' ')) + ' ' + norm(i.firm) + ' ' + norm(i.firstName);
        if (!e.facts.length) errs.push('personalized opening has no facts_used');
        for (const n of p1.match(/\d[\d,.]*/g) || []) if (!snip.includes(n.toLowerCase())) errs.push(`number in opening not in a snippet: ${n}`);
        const words = p1.split(/(?<=[.?!])\s+/).flatMap((s) => s.split(/\s+/).slice(1));
        for (const wd of words) { const c = wd.replace(/[^A-Za-z']/g, ''); if (/^[A-Z][a-z]+/.test(c) && c !== 'QQQ' && !snip.includes(c.toLowerCase()) && !['If', 'When', 'A', 'The', 'Your', 'Eric', 'TradeMind'].includes(c)) errs.push(`name in opening not in a snippet: ${c}`); }
    }
    if (e.emailId === 1) {
        if (/^as an? /i.test(e.paragraphs[0] || '')) errs.push('do not open with "As a <title>"');
        for (const f of e.facts) if ((f.source_field === 'website_text' || f.source_field === 'linkedin_text') && f.snippet.split(/\s+/).length < 5) errs.push('snippet too short to be a clear fact');
        if (e.level === 'none' && e.facts.length) errs.push('level none must have no facts');
    }
    // repeats
    const prevSentences = new Set(previous.flatMap((p) => expand(p).split(/(?<=[.?!])\s+/).map(norm)).filter((s) => s.length > 25));
    for (const s of full.split(/(?<=[.?!])\s+/).map(norm)) if (s.length > 25 && prevSentences.has(s) && !FIXED_TEXT.some((f) => norm(f).includes(s))) errs.push(`repeated sentence: ${s.slice(0, 40)}`);
    // sentence length
    for (const s of own.split(/(?<=[.?!])\s+/)) if (s.split(/\s+/).filter(Boolean).length > 28) errs.push('sentence too long');
    return errs;
}

/** Parses the model's JSON answer into a GenEmail (unchecked). Returns null when it is not usable JSON. */
export function parseModel(text: string, emailId: EmailId): { subject: string; greeting: string; paragraphs: string[]; facts: FactUsed[]; level: string } | null {
    const t = String(text || '').replace(/```(?:json)?/g, '').trim();
    const a = t.indexOf('{'), b = t.lastIndexOf('}');
    if (a < 0 || b <= a) return null;
    try {
        const j = JSON.parse(t.slice(a, b + 1));
        const paras = Array.isArray(j.body_paragraphs) ? j.body_paragraphs.map((x: unknown) => String(x).trim()).filter(Boolean) : [];
        const facts: FactUsed[] = Array.isArray(j.facts_used) ? j.facts_used.map((f: any) => ({ fact: String(f?.fact ?? ''), source_field: String(f?.source_field ?? ''), snippet: String(f?.snippet ?? '') })).filter((f: FactUsed) => f.snippet) : [];
        void emailId;
        return { subject: String(j.subject ?? '').trim(), greeting: String(j.greeting ?? '').trim(), paragraphs: paras, facts, level: String(j.personalization_level ?? 'none') };
    } catch { return null; }
}

/** Runs one model answer through the checks. */
export function finishEmail(emailId: EmailId, text: string, i: GenInput, ending: string, previous: string[]): { email: GenEmail | null; problems: string[] } {
    const m = parseModel(text, emailId);
    if (!m) return { email: null, problems: ['not valid JSON'] };
    // The script owns the greeting and, for threaded emails, the subject.
    const greeting = `Hi ${i.firstName},`;
    const subject = emailId === 1 || emailId === 3 ? `${i.firstName}, ${ending}` : '';
    const fixed = { ...m, greeting, subject };
    const problems = checkEmail({ emailId, ...fixed }, i, ending, previous);
    const email: GenEmail = { emailId, subject, greeting, paragraphs: m.paragraphs, facts: m.facts, level: m.level, words: bodyWords(m.paragraphs), source: 'model', problems };
    return { email: problems.length ? null : email, problems };
}

/** Final stored text for one email: tokens swapped, links become merge tokens that renderCx turns into tracked links on the sending domain. */
export function storedBody(e: GenEmail, linkToken: 'ADV' | 'SIM' | 'SUB'): string {
    const body = expand(e.paragraphs.join('\n\n')).replace(/\[\[LINK\]\]/g, `{{${linkToken}}}`);
    return `${e.greeting}\n\n${body}`;
}
export const LINK_TOKEN: Record<EmailId, 'ADV' | 'SIM' | 'SUB'> = { 1: 'ADV', 2: 'SIM', 3: 'SUB', 4: 'ADV' };

/** Plain text of a stored body without any link, used as the "previous email" context. */
export const previousText = (stored: string) => stored.replace(/\{\{[A-Z]+\}\}/g, '').replace(/[ \t]+\n/g, '\n').trim();

export const LARGE_SEQUENCE: EmailId[] = [1, 4];
