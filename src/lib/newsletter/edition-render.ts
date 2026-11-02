/**
 * Three newsletter editions on one layout: weekly free, daily free (no signals), daily with signals.
 * The public blocks (context, idea, risk, lesson) never carry strategy fields. Signal blocks are rendered per
 * recipient from AccountBlock records. A strategy the reader has no account for shows a generic Subscribe card
 * that does not say whether that strategy changed.
 */
import { esc, F, C, sp, row, pill, P, btn, card, why, statusLine, SIM, LIMITS, NOBROKER, DISCOUNT } from '../outreach/copy-seq7';
import type { NewsletterIssue } from './issues';

export type EditionKind = 'weekly' | 'daily_free' | 'daily_signals';
export type StrategyName = 'QQQ Defensive' | 'QQQ LEAPS';

export const FAILED_RUN = 'No new instruction today. The model run did not complete its data checks. This is not a confirmation that anything is unchanged.';

export interface ContextItem { headline: string; body: string; sourceName: string; sourceUrl: string }
export interface AccountBlock {
    strategy: StrategyName;
    label: string;               // for example "Roth IRA at your brokerage"
    riskLevel?: string;          // Defensive only
    status: 'NO_CHANGE' | 'CHANGE' | 'FAILED';
    /** Instruction lines taken only from signal fields. */
    lines: string[];
}
export interface EditionInput {
    kind: EditionKind;
    sample: boolean;
    dateLabel: string;
    hook: string;
    preheader: string;
    context: ContextItem[];
    weekAhead?: string[];
    idea: { title: string; body: string; why: string };
    risk: string;
    lesson?: NewsletterIssue;
    /** Optional short note under the greeting, for example the first Monday edition. */
    note?: string;
    /** Present for daily_signals. One email covers one account. */
    account?: AccountBlock;
    firstName: string | null;
    baseUrl: string;
    linkToken: string;
    editionDate: string;
    unsubscribeUrl: string;
    preferencesUrl: string;
    mailingAddress: string;
}

const SUBS: Record<StrategyName, string> = { 'QQQ Defensive': 'QQQ Defensive', 'QQQ LEAPS': 'QQQ LEAPS' };
const gap = '<div style="height:10px;"></div>';
const title = (t: string) => `<div style="font-size:17px;font-weight:800;color:${C.fg};padding-bottom:8px;">${esc(t)}</div>`;
const tl = (u: string, label: string) => `<a href="${esc(u)}" style="color:${C.blue};text-decoration:underline;font-weight:600;">${esc(label)} &rsaquo;</a>`;

/** Minimal markdown for the library issues: ## headings, - bullets, **bold**, paragraphs. */
function md(body: string, maxSections: number): { intro: string[]; sections: { h: string; items: string[]; bullets: boolean }[] } {
    const lines = body.split('\n');
    const intro: string[] = []; const sections: { h: string; items: string[]; bullets: boolean }[] = [];
    let cur: { h: string; items: string[]; bullets: boolean } | null = null;
    for (const raw of lines) {
        const l = raw.trim(); if (!l) continue;
        if (l.startsWith('## ')) { if (sections.length >= maxSections) break; cur = { h: l.slice(3), items: [], bullets: false }; sections.push(cur); continue; }
        const isB = l.startsWith('- ');
        const t = isB ? l.slice(2) : l;
        if (!cur) { intro.push(t); continue; }
        if (isB) cur.bullets = true;
        cur.items.push(t);
    }
    return { intro, sections };
}
const bold = (s: string) => esc(s).replace(/\*\*(.+?)\*\*/g, `<strong style="color:${C.fg};">$1</strong>`);
const plain = (s: string) => s.replace(/\*\*(.+?)\*\*/g, '$1');

function lessonCard(issue: NewsletterIssue, url: string): { html: string; text: string } {
    const m = md(issue.body, 2);
    const secHtml = m.sections.map((s) => `<div style="${F}font-size:15px;font-weight:800;color:${C.fg};padding:6px 0 6px;">${esc(s.h)}</div>` + (s.bullets
        ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${s.items.map((i) => `<tr><td style="padding:2px 0;${F}font-size:14px;line-height:1.6;color:${C.body};">&bull;&nbsp; ${bold(i)}</td></tr>`).join('')}</table>`
        : s.items.map((i) => `<p style="margin:0 0 10px;${F}font-size:14px;line-height:1.65;color:${C.body};">${bold(i)}</p>`).join(''))).join('');
    const html = card(`${pill('\u{1F4D8} The lesson')}${gap}${title(issue.title)}<p style="margin:0 0 10px;${F}font-size:14px;line-height:1.65;color:${C.muted};">${esc(issue.subtitle)}</p>${m.intro.slice(0, 1).map((i) => P(plain(i), 14)).join('')}${secHtml}<div style="height:6px;"></div>${tl(url, `Read the full issue (${issue.readTime})`)}`);
    const text = [`THE LESSON: ${issue.title}`, issue.subtitle, ...m.intro.slice(0, 1).map(plain), ...m.sections.flatMap((s) => [s.h, ...s.items.map((i) => `${s.bullets ? '- ' : ''}${plain(i)}`)]), `Read the full issue: ${url}`].join('\n');
    return { html, text };
}

function contextCard(items: ContextItem[], heading: string): { html: string; text: string } {
    const li = items.map((i) => `<tr><td style="padding:10px 0;border-top:1px solid ${C.line};${F}"><div style="font-size:14px;font-weight:700;color:${C.fg};padding-bottom:3px;">${esc(i.headline)}</div><div style="font-size:14px;line-height:1.6;color:${C.body};">${esc(i.body)}</div><div style="font-size:12px;color:${C.muted};padding-top:3px;">Source: <a href="${esc(i.sourceUrl)}" style="color:${C.blue};">${esc(i.sourceName)}</a></div></td></tr>`).join('');
    const html = card(`${pill('\u2601\uFE0F Market weather')}${gap}${title(heading)}<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${li}</table>`);
    const text = ['MARKET WEATHER: ' + heading, ...items.map((i) => `- ${i.headline}. ${i.body} (Source: ${i.sourceName}, ${i.sourceUrl})`)].join('\n');
    return { html, text };
}

export function renderNewsletter(o: EditionInput): { subject: string; html: string; text: string } {
    const b = o.baseUrl;
    const link = (k: string, x = '') => `${b}/d/${o.linkToken}/${k}?e=${o.editionDate}${x}`;
    const plansUrl = link('pl'), dailyUrl = link('wk'), weeklyUrl = link('wk'), vaUrl = link('va'), simUrl = link('sim'), homeUrl = link('h');
    const hi = (o.firstName ?? '').trim() ? `Hi ${(o.firstName ?? '').trim()},` : 'Hi,';
    const a = o.account;
    const badge = o.kind === 'weekly' ? 'Weekly' : o.kind === 'daily_free' ? 'Daily' : 'Daily with signals';
    const blocks: string[] = []; const T: string[] = [];

    // 1. Signals or the Subscribe placeholder. Always one block per strategy, same position every day.
    const placeholder = (s: StrategyName) => card(`${pill('\u{1F512} ' + s, C.amber, '#2a2312')}${gap}${title(`${s}: not on your plan`)}${P(o.kind === 'daily_signals' ? 'Subscribe to get this strategy\u2019s published status in your daily email.' : 'Daily status for this strategy goes to subscribers of its plan.', 14)}${btn(plansUrl, `Subscribe to ${s}`, 'outline')}<div style="height:6px;"></div><p style="margin:6px 0 0;${F}font-size:12px;color:${C.muted};">${esc(DISCOUNT)}</p>`, C.amber);
    const placeholderText = (s: StrategyName) => `${s.toUpperCase()}: not on your plan. Subscribe to get its published status in your daily email: ${plansUrl}`;
    let deferred: StrategyName[] = [];
    const other: StrategyName | null = a ? (a.strategy === 'QQQ Defensive' ? 'QQQ LEAPS' : 'QQQ Defensive') : null;

    if (o.kind === 'daily_signals' && a) {
        const failed = a.status === 'FAILED';
        const headline = failed ? FAILED_RUN : a.status === 'CHANGE' ? 'A change was published for this account.' : 'No change. Keep your current model position.';
        const lineRows = failed ? '' : a.lines.map((l) => `<tr><td style="padding:3px 0;${F}font-size:15px;line-height:1.6;color:${C.fg};">${esc(l)}</td></tr>`).join('');
        blocks.push(card(`${pill('\u{1F464} Your account', failed ? C.amber : C.green, failed ? '#2a2312' : C.greenBg)}${gap}${title(`${a.strategy}${a.riskLevel ? `, ${a.riskLevel} risk level` : ''}`)}<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${statusLine(a.label, headline, failed ? C.amber : a.status === 'CHANGE' ? C.blue : C.green)}</table>${lineRows ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">${lineRows}</table>` : ''}<p style="margin:10px 0 0;${F}font-size:13px;line-height:1.6;color:${C.muted};">${esc(NOBROKER)}</p>`, failed ? C.amber : C.green));
        T.push(`YOUR ACCOUNT: ${a.strategy}${a.riskLevel ? `, ${a.riskLevel} risk level` : ''} (${a.label})`, headline, ...(failed ? [] : a.lines), NOBROKER, '');
        if (other) { blocks.push(placeholder(other)); T.push(placeholderText(other), ''); }
    } else {
        // Free editions: both strategies show the same generic card.
        // They sit after the market context so the opening is content, and above the lesson and the call to action.
        deferred = ['QQQ Defensive', 'QQQ LEAPS'] as StrategyName[];
    }

    // 2. Public blocks.
    const ctx = contextCard(o.context, o.kind === 'weekly' ? 'What moved the week, and what is next' : 'What is in the news');
    blocks.push(ctx.html); T.push(ctx.text, '');
    for (const s of deferred) { blocks.push(placeholder(s)); T.push(placeholderText(s), ''); }
    if (o.kind === 'weekly' && o.weekAhead?.length) {
        blocks.push(card(`${pill('\u{1F5D3}\uFE0F Week ahead')}${gap}${title('Dates that can move QQQ')}<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${o.weekAhead.map((w) => `<tr><td style="padding:3px 0;${F}font-size:14px;line-height:1.6;color:${C.body};">&bull;&nbsp; ${esc(w)}</td></tr>`).join('')}</table>`));
        T.push('WEEK AHEAD', ...o.weekAhead.map((w) => `- ${w}`), '');
    }
    blocks.push(card(`${pill('\u2708\uFE0F Flight plan')}${gap}${title('One idea: ' + o.idea.title.charAt(0).toLowerCase() + o.idea.title.slice(1))}${P(o.idea.body, 14)}${why(o.idea.why)}`));
    T.push(`FLIGHT PLAN: ${o.idea.title}. ${o.idea.body}`, `Why it matters: ${o.idea.why}`, '');
    if (o.lesson) {
        const l = lessonCard(o.lesson, `${b}/newsletter/issues/${o.lesson.publishDate}-${o.lesson.slug}`);
        blocks.push(l.html); T.push(l.text, '');
    }
    blocks.push(card(`${pill('\u26A0\uFE0F Turbulence test')}${gap}${title(o.kind === 'weekly' ? 'What could go wrong this week' : 'What could go wrong today')}${P(o.risk, 14)}`));
    T.push(`TURBULENCE TEST: ${o.risk}`, '');
    if (o.kind === 'weekly') {
        const t = (label: string, big: string, small: string, color: string) => `<td width="50%" valign="top" style="padding:0 4px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0f1626;border:1px solid ${C.line};border-radius:10px;"><tr><td style="padding:14px;${F}"><div style="font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:${C.muted};">${label}</div><div style="font-size:26px;font-weight:800;color:${color};padding:4px 0;">${big}</div><div style="font-size:13px;color:${C.muted};">${small}</div></td></tr></table></td>`;
        blocks.push(card(`<div style="font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:${C.blue};padding-bottom:10px;">The two year simulation</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${t('QQQ LEAPS, simulated', SIM.leaps, `Largest decline ${SIM.leapsDd}`, C.green)}${t('QQQ buy and hold', SIM.qqq, `Largest decline ${SIM.qqqDd}`, C.fg)}</tr></table><p style="margin:10px 4px 0;${F}font-size:12px;line-height:1.55;color:${C.muted};">${esc(SIM.window)}. ${esc(LIMITS)}</p><div style="height:10px;"></div>${tl(vaUrl, 'See the virtual accounts')}&nbsp;&nbsp;${tl(simUrl, 'Simulation details')}`));
        T.push(`THE TWO YEAR SIMULATION: QQQ LEAPS ${SIM.leaps} with a largest decline of ${SIM.leapsDd}; QQQ buy and hold ${SIM.qqq} with ${SIM.qqqDd}. ${SIM.window}. ${LIMITS}`, `Virtual accounts: ${vaUrl}`, '');
    }

    // 3. Call to action.
    const cta = o.kind === 'weekly'
        ? card(`<div style="${F}font-size:16px;font-weight:800;color:${C.fg};padding-bottom:6px;">Want it every weekday?</div>${P('The daily email is free. It adds one short idea and one risk each trading day, and shows each strategy\u2019s status if you have a plan for it.', 14, C.muted)}${btn(dailyUrl, 'Switch to the free daily')}`)
        : o.kind === 'daily_free'
            ? card(`<div style="${F}font-size:16px;font-weight:800;color:${C.fg};padding-bottom:6px;">Get a strategy\u2019s status for your own account</div>${P('A plan adds the published instruction for one strategy and one brokerage account to this email.', 14, C.muted)}${btn(plansUrl, 'See the plans')}`)
            : card(`<div style="${F}font-size:16px;font-weight:800;color:${C.fg};padding-bottom:6px;">Check the record</div>${P('The virtual accounts show every published signal, losses included, with a short delay.', 14, C.muted)}${btn(vaUrl, 'See the virtual accounts', 'outline')}`);
    blocks.push(cta);
    T.push(o.kind === 'weekly' ? `Switch to the free daily: ${dailyUrl}` : o.kind === 'daily_free' ? `See the plans: ${plansUrl}` : `Virtual accounts: ${vaUrl}`, '');

    const subject = o.kind === 'weekly' ? `Flight Plan: week of ${o.dateLabel.replace(/^[A-Za-z]+, /, '').replace(/, \d{4}$/, '')}`
        : o.kind === 'daily_free' ? 'TradeMind daily: ' + o.hook.replace(/\.$/, '')
        : a?.status === 'FAILED' ? 'Daily: no new instruction today'
        : `Your ${a?.strategy} account: ${a?.status === 'CHANGE' ? 'a change was published' : 'no change today'}`;

    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"><title>${esc(subject)}</title></head><body style="margin:0;padding:0;background:${C.bg};"><div style="display:none;max-height:0;overflow:hidden;color:${C.bg};">${esc(o.preheader)}</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};"><tr><td align="center" style="padding:24px 14px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">`
        + row(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="${F}font-size:18px;font-weight:800;color:${C.fg};"><a href="${esc(homeUrl)}" style="color:${C.fg};text-decoration:none;">TradeMind<span style="color:${C.blue};">.bot</span></a></td><td align="right"><span style="display:inline-block;${F}font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:${C.blue};border:1px solid #3a4a70;border-radius:20px;padding:5px 11px;">${badge}</span></td></tr></table>`) + sp(20)
        + row(`<div style="${F}font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:${C.blue};">${esc(o.dateLabel)}${o.sample ? ' (sample)' : ''}</div><div style="${F}font-size:${o.kind === 'weekly' ? 28 : 25}px;font-weight:800;line-height:1.25;color:${C.fg};padding:8px 0 16px;">${esc(o.hook)}</div>`)
        + row(P(hi, 16, C.fg)) + (o.note ? row(P(o.note, 14, C.muted)) : '') + blocks.join('')
        + row(`<p style="margin:0 0 12px;${F}font-size:13px;line-height:1.65;color:${C.muted};">${o.kind === 'weekly' ? '' : `Prefer one email a week? <a href="${esc(weeklyUrl)}" style="color:${C.blue};">Switch to the weekly brief</a>. `}Reply to this email or write to me at eric@trademind.bot.</p>`)
        + row(`<p style="margin:0 0 2px;${F}font-size:15px;color:${C.fg};font-weight:700;">Eric Huang</p><p style="margin:0 0 20px;${F}font-size:13px;color:${C.muted};">Founder, TradeMind &middot; Queens, New York</p>`)
        + row(`<div style="border-top:1px solid ${C.line};padding-top:14px;${F}font-size:11px;line-height:1.6;color:${C.muted};">You are getting this because you subscribed to the free TradeMind ${o.kind === 'weekly' ? 'weekly' : 'daily'} brief. <a href="${esc(o.unsubscribeUrl)}" style="color:${C.muted};">Unsubscribe</a> &middot; <a href="${esc(o.preferencesUrl)}" style="color:${C.muted};">Preferences</a><br>${esc(o.mailingAddress)}<br>Educational research, not personalized investment advice. Investing involves risk, including loss. Simulated results are not live trading.</div>`)
        + '</table></td></tr></table></body></html>';
    const text = [hi, ...(o.note ? ['', o.note] : []), '', `${badge.toUpperCase()}: ${o.dateLabel}${o.sample ? ' (SAMPLE)' : ''}`, o.hook, '', ...T, 'Eric Huang', 'Founder, TradeMind', '', `Unsubscribe: ${o.unsubscribeUrl}`, `Preferences: ${o.preferencesUrl}`, o.mailingAddress, 'Educational research, not personalized investment advice. Investing involves risk, including loss.'].join('\n');
    return { subject, html, text };
}
