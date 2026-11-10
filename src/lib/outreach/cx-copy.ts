/**
 * Custom adviser outreach ("cx", the Consulti list): profile cleaning, hook choice, four-email copy and the rule checker.
 * Pure functions, no database. Variant A (reply first). Hooks come only from the Consulti keywords and job title, never invented.
 *
 * Action ladder: E1 reply for the sample (plus the home page), E2 the simulation record, E3 virtual accounts (plus the free weekly brief),
 * E4 a meeting or a study program seat.
 */
import { createHash } from 'crypto';

export const CX_CAL_URL = 'https://calendar.app.google/kyHxchRY3kzRQaGu9';

export interface CxRaw {
    email: string; first_name?: string; last_name?: string; job_title?: string; company_name?: string;
    company_domain?: string; website?: string; keywords?: string; linkedin_url?: string; city?: string; state?: string;
    employee_count?: string; email_status?: string;
}
export interface CxProfile {
    email: string; firstName: string; firm: string; firmKey: string; title: string; website: string; linkedin: string;
    city: string; state: string; employees: string; keywords: string[]; identityOk: boolean; hookId: string; hook: string;
}
export interface CxDraft { step: 1 | 2 | 3 | 4; subject: string; body: string; words: number; errors: string[] }

const GENERIC_MAIL = /(^|\.)(gmail|yahoo|aol|outlook|hotmail|icloud|msn|live|comcast|verizon|att)\.(com|net)$/;
const BAD_FIRST = new Set(['', 'name', 'none', 'null', 'n/a', 'na', 'unknown', 'info', 'admin', 'office', 'mr', 'mrs', 'ms', 'dr']);

export const rootDomain = (v: string): string => {
    const h = String(v || '').toLowerCase().trim().replace(/^https?:\/\//, '').replace(/^www\./, '').split(/[/?#]/)[0];
    const p = h.split('.');
    return p.length > 2 && !/^(co|com|org|net)$/.test(p[p.length - 2]) ? p.slice(-2).join('.') : h;
};

export function cleanFirm(name: string): string {
    let n = String(name || '').replace(/\s+/g, ' ').trim();
    n = n.replace(/[,]?\s+(llc|l\.l\.c\.|inc\.?|incorporated|corp\.?|corporation|ltd\.?|lp|llp|pllc|co\.?)$/i, '').trim();
    if (n === n.toUpperCase() && n.length > 5) n = n.toLowerCase().replace(/\b[a-z]/g, (m) => m.toUpperCase());
    return n.replace(/\bLlc\b/g, 'LLC').replace(/\bLlp\b/g, 'LLP').replace(/\bLp\b/g, 'LP').replace(/\bAnd\b/g, 'and').replace(/\bD\.a\./g, 'D.A.');
}

export function cleanFirst(v: string): string {
    const f = String(v || '').trim().split(/\s+/)[0].replace(/[^A-Za-z'\-.]/g, '');
    if (BAD_FIRST.has(f.toLowerCase()) || f.length < 2) return '';
    return f.toLowerCase().replace(/(^|[-'])([a-z])/g, (_m, a, b) => a + b.toUpperCase());
}

const OWNER = /(owner|founder|principal|president|managing partner|managing director|chief executive|ceo|partner)/i;
const kwHas = (kws: string[], re: RegExp) => kws.some((k) => re.test(k));

/** Choose the hook: podcast, retirement income, investment management, owner role, firm, generic. Deterministic. */
export function chooseHook(p: { firm: string; title: string; keywords: string[]; identityOk: boolean }): { id: string; hook: string } {
    const lead = ' That is why I have a narrow question about QQQ.';
    const tail = ', which is why I have a narrow question about QQQ.';
    if (kwHas(p.keywords, /podcast/)) return { id: 'podcast', hook: `Your firm's website mentions a podcast, so you already explain markets to clients in plain English.${lead}` };
    if (p.identityOk && p.firm) {
        if (kwHas(p.keywords, /retirement (income|planning|strateg)/)) return { id: 'income', hook: `${p.firm} lists retirement income planning among its services${tail}` };
        if (kwHas(p.keywords, /(investment|portfolio|asset) management|wealth management/)) return { id: 'invest', hook: `${p.firm} lists investment management among its services${tail}` };
        if (OWNER.test(p.title)) return { id: 'owner', hook: `As ${/founder/i.test(p.title) ? 'founder' : /owner/i.test(p.title) ? 'owner' : /president/i.test(p.title) ? 'president' : 'a leader'} of ${p.firm}, you decide what reaches your clients${tail}` };
        return { id: 'firm', hook: `${p.firm} advises clients on investments${tail}` };
    }
    return { id: 'generic', hook: `As a financial professional, you may get questions about QQQ, so I have a narrow question about it.` };
}

export function buildProfile(r: CxRaw): CxProfile {
    const email = String(r.email || '').trim().toLowerCase();
    const emailRoot = rootDomain(email.split('@')[1] || '');
    const siteRoot = rootDomain(r.company_domain || r.website || '');
    const identityOk = !!siteRoot && (GENERIC_MAIL.test(emailRoot) ? false : emailRoot === siteRoot);
    const firm = cleanFirm(r.company_name || '');
    const keywords = String(r.keywords || '').toLowerCase().split(/[,;|]/).map((k) => k.trim()).filter(Boolean);
    const base = { firm, title: String(r.job_title || '').trim(), keywords, identityOk };
    const h = chooseHook(base);
    return {
        email, firstName: cleanFirst(r.first_name || ''), firm, firmKey: siteRoot || emailRoot, title: base.title,
        website: String(r.website || r.company_domain || '').trim(), linkedin: String(r.linkedin_url || '').trim(),
        city: String(r.city || '').trim(), state: String(r.state || '').trim(), employees: String(r.employee_count || '').trim(),
        keywords, identityOk, hookId: h.id, hook: h.hook,
    };
}

const pick = (arr: string[], token: string, salt: string): string =>
    arr[parseInt(createHash('sha256').update(`${token}:${salt}`).digest('hex').slice(0, 8), 16) % arr.length];

const SUBJECTS: Record<number, string[]> = {
    1: ['question on qqq rules', 'a qqq rules question', 'quick qqq question'],
    2: ['what can go wrong', 'the risks plainly', 'where it could fail'],
    3: ['two virtual accounts', 'a record built forward', 'following the signals'],
    4: ['closing the loop', 'thank you for reading', 'two ways to continue'],
};

export const LIMITS_LINE = 'Hypothetical results from a simulation, not a real account. Options were model-priced, the rules were developed with hindsight, and this was one favorable period for QQQ and semiconductors.';

/** Merge tokens in the stored body: {{HOME}} {{SIM}} {{VA}} {{SUB}} {{CAL}} {{STUDY}}. */
export function buildDrafts(p: CxProfile, token: string): CxDraft[] {
    const hi = p.firstName ? `Hi ${p.firstName},` : 'Hello,';
    const bodies: Record<number, string> = {
        1: `${hi}\n\n${p.hook}\n\nI built TradeMind ({{HOME}}), a rules-based QQQ research model. In a two year simulation (October 14, 2024 to October 13, 2026), QQQ LEAPS returned +229.48% against +49.46% for QQQ buy and hold, with a largest decline of 14.59% against 22.88%.\n\n${LIMITS_LINE}\n\nMay I send the five minute research sample, so you can try to break the rules?`,
        2: `${hi}\n\nFollowing up on my note about the QQQ rules. The question I most want answered is what could go wrong. The simulation page sets out the assumptions, the largest drop and the limits: {{SIM}}\n\nTradeMind never connects to a broker and never places trades, so you only read research. Does anything on that page look wrong to you?`,
        3: `${hi}\n\nTwo virtual accounts have followed the signals since mid October 2026, shown with a five day delay: {{VA}}\n\nIf you would rather read along first, the free weekly brief is here: {{SUB}}\n\nWhat would you change about how the accounts are shown?`,
        4: `${hi}\n\nI will stop writing after this note. Two ways to continue if useful.\n\nA 20 minute call, to try to break the rules: {{CAL}}\n\nOne of 20 study program seats, free for four months with a virtual account: {{STUDY}}\n\nThank you for reading.`,
    };
    return ([1, 2, 3, 4] as const).map((step) => {
        const body = bodies[step];
        const d: CxDraft = { step, subject: pick(SUBJECTS[step], token, `s${step}`), body, words: 0, errors: [] };
        d.words = countWords(body);
        d.errors = checkDraft(d);
        return d;
    });
}

/** Words in the body, excluding the greeting line. Link tokens count as one word. */
export function countWords(body: string): number {
    return body.split('\n').slice(2).join(' ').split(/\s+/).filter(Boolean).length;
}

const BANNED = [/confidence/i, /probability of profit/i, /protect capital/i, /compound quietly/i, /\btiers?\b/i, /\bfinal\b/i, /\blast\b/i, /worst fall shallow/i, /exposure tier/i, /55% ?cagr/i, /14\.5%/];
const ALLOWED_FIGURES = new Set(['+229.48%', '+49.46%', '14.59%', '22.88%', '2024', '2026', '14', '13', '20', '5', '4']);

export function checkDraft(d: CxDraft): string[] {
    const e: string[] = [];
    const links = (d.body.match(/\{\{[A-Z]+\}\}/g) || []).length;
    if (links > 2) e.push('more than 2 links');
    const lim: Record<number, [number, number]> = { 1: [70, 120], 2: [20, 80], 3: [20, 80], 4: [15, 60] };
    if (d.words < lim[d.step][0] || d.words > lim[d.step][1]) e.push(`word count ${d.words} outside ${lim[d.step][0]} to ${lim[d.step][1]}`);
    if (!/^[a-z]+( [a-z]+){1,4}$/.test(d.subject)) e.push('subject must be 2 to 5 lowercase words');
    if (/[\u2013\u2014]|--/.test(d.body + d.subject)) e.push('dash character');
    for (const b of BANNED) if (b.test(d.body + ' ' + d.subject)) e.push(`banned phrase ${b}`);
    const pct = d.body.match(/[+-]?\d[\d,.]*%/g) || [];
    for (const f of pct) if (!ALLOWED_FIGURES.has(f)) e.push(`figure not allowed ${f}`);
    if (d.step === 1 && !d.body.includes(LIMITS_LINE)) e.push('limits line missing');
    if (d.step === 1 && !d.body.includes('{{HOME}}')) e.push('home link missing');
    if (d.step === 1 && !/\?\s*$/.test(d.body)) e.push('E1 must end with one question');
    if (/\{\{/.test(d.body.replace(/\{\{(HOME|SIM|VA|SUB|CAL|STUDY)\}\}/g, ''))) e.push('unknown merge token');
    return e;
}

export const CX_FOOTER_LINE = 'You are getting this note at your business address because your firm is listed as an investment professional.';
export const CX_DISCLAIMER = 'TradeMind publishes educational research. It is not personalized investment advice. All performance shown is hypothetical simulation unless labeled as a virtual account. Options and leveraged ETFs involve substantial risk, including loss of the amount invested.';

const KIND: Record<string, string> = { HOME: 'h', SIM: 'v', VA: 'va', SUB: 'sw', CAL: 'cal', STUDY: 'f' };

const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const HTML_WRAP = 'font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#222';
const SMALL = 'font-size:13px;color:#555';
const FOOT = 'font-size:12px;color:#777';

export function renderCx(d: { step: number; subject: string; body: string }, o: { token: string; linkBase: string; unsubUrl: string; mailingAddress: string; linkFree?: boolean; html?: boolean }): { subject: string; text: string; html?: string } {
    if (o.linkFree) {
        const hi = (d.body.match(/^Hi [^,\n]{1,40},/) || ['Hi,'])[0];
        const plain = d.step === 1
            ? `${hi}\n\nI have a narrow question about QQQ. May I send you a five minute research sample?`
            : d.body.replace(/ \(\{\{HOME\}\}\)/g, '').replace(/\{\{[A-Z]+\}\}/g, '');
        return { subject: d.subject, text: `${plain}\n\nEric Huang\nFounder, TradeMind\n\n${CX_FOOTER_LINE} Reply stop and I will not write again.\n${CX_DISCLAIMER}\n\n${o.mailingAddress}` };
    }
    const link = (k: string) => `${o.linkBase}/r/${o.token}/${KIND[k]}?s=${d.step}`;
    if (o.html) {
        // Long custom email, plain text plus HTML. Links sit on the sending domain only. Footer is the short stop line.
        const body = d.body.replace(/ \(\{\{HOME\}\}\)/g, '');
        const paras = body.split('\n\n');
        const tokText = (t: string) => t.replace(/\{\{([A-Z]+)\}\}/g, (_m, k) => (KIND[k] ? link(k) : ''));
        const homeLink = d.body.includes('{{HOME}}') ? link('HOME') : '';
        const stop = `${CX_FOOTER_LINE} Reply stop and I will not write again.`;
        const text = `${paras.map(tokText).join('\n\n')}${homeLink ? `\n\nSample page: ${homeLink}` : ''}\n\nEric Huang\nFounder, TradeMind\n\n${stop}\n${CX_DISCLAIMER}\n\n${o.mailingAddress}`;
        const ph = paras.map((t) => {
            if (t === LIMITS_LINE) return `<p style="${SMALL}">${esc(t)}</p>`;
            let h = esc(t);
            if (homeLink && /five minute research sample/.test(h)) h = h.replace('five minute research sample', `<a href="${esc(homeLink)}">five minute research sample</a>`);
            h = h.replace(/\{\{([A-Z]+)\}\}/g, (_m, k) => (KIND[k] ? `<a href="${esc(link(k))}">${esc(link(k))}</a>` : ''));
            return `<p>${h.replace(/\n/g, '<br>')}</p>`;
        }).join('');
        const html = `<div style="${HTML_WRAP}">${ph}<p>Eric Huang<br>Founder, TradeMind</p><p style="${FOOT}">${esc(stop)}<br>${esc(CX_DISCLAIMER)}<br><br>${esc(o.mailingAddress)}</p></div>`;
        return { subject: d.subject, text, html };
    }
    let body = d.body.replace(/\{\{([A-Z]+)\}\}/g, (_m, k) => (KIND[k] ? link(k) : ''));
    const subLine = d.body.includes('{{SUB}}') ? '' : `Subscribe to the free weekly brief: ${link('SUB')}\n`;
    body += `\n\nEric Huang\nFounder, TradeMind\n\n${subLine}${CX_FOOTER_LINE} Unsubscribe or snooze: ${o.unsubUrl}\n${CX_DISCLAIMER}\n\n${o.mailingAddress}`;
    return { subject: d.subject, text: body };
}
