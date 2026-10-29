/**
 * Seven-email retail sequence, newsletter style (draft, not wired into the sender).
 * Each email has one focus card and asks for one different response. Every email ends with this week's
 * free issue, where the strategy allocation is a locked placeholder for readers without a strategy plan.
 * No email announces a last contact. Links are the campaign's tracked redirects, /r/<token>/<kind>?s=<step>.
 * Steps reuse the existing ladder: 1, 2, 5, 6, 7, 8, 9 (days 0, 7, 14, 21, 28, 35, 42).
 */
import { IMG as WS_IMG, ALT as WS_ALT, CAP as WS_CAP } from './copy-ws';

export const SEQ7_STEPS = [1, 2, 5, 6, 7, 8, 9] as const;
export const SEQ7_DAYS: Record<number, number> = { 1: 0, 2: 7, 5: 14, 6: 21, 7: 28, 8: 35, 9: 42 };
export const SEQ7_N_BY_STEP: Record<number, number> = { 1: 1, 2: 2, 5: 3, 6: 4, 7: 5, 8: 6, 9: 7 };
export const seq7Label = (n: number) => `N${n}`;

export const THEME = 'Control the risk first. Give compounding the time it needs.';
export const THEME_SUB = 'AI-modeled QQQ research for self-directed investors.';

/** Weekly issue facts. Defaults are a labeled sample; the live sender must pass the published record. */
export interface IssueFacts {
    weekLabel: string;
    regime: string;                          // e.g. BULL
    trend: 'above' | 'below' | null;         // QQQ vs its 200 day average
    trendChanged: boolean | null;
    defensive: { level: string; text: string }[];
    leaps: string;
    readout: string;
    sample: boolean;
}
export const SAMPLE_FACTS: IssueFacts = {
    weekLabel: 'Week of October 26, 2026', regime: 'BULL', trend: 'above', trendChanged: false,
    defensive: [
        { level: 'Conservative', text: '25% QQQ, 75% SGOV' },
        { level: 'Moderate', text: '85% QQQ, 15% SGOV' },
        { level: 'Aggressive', text: '100% QQQ' },
    ],
    leaps: 'Position held. The next review follows the LEAPS schedule.',
    readout: 'Each risk level has its own published allocation from the October 28 run. The allocation score helps set exposure. It is not a probability of any outcome.',
    sample: true,
};

/** Study rules as published on /founding today. Change here when the page changes. */
export const STUDY_RULES = [
    '20 seats, and every application is read by hand',
    '4 months free, with a virtual account that follows the signals',
    'Three notes a month: a suggestion, a problem you hit in the app, or a question',
    'Each month you do adds 3 more free months on one account, up to a full year',
    'Leave whenever you like and keep the months you earned',
    'No card, and nothing turns into a paid plan on its own',
];

export const MEETING_URL = 'https://calendar.app.google/dKsXK6G3cV3ppbAo7';
export const STUDY_COMPACT = '20 seats to help test TradeMind. Four months free with a virtual account, in exchange for three notes a month. Each month of notes earns three more free months.';
export const STUDY_FULL = {
    title: 'Help test the model, free',
    body: [
        'I\u2019m running a four month study with 20 QQQ investors. You get a virtual account that follows the signals, and I get your notes on what is unclear, missing or wrong.',
        'The deal is simple. Send three notes a month: a suggestion, a problem you hit in the app, or a question. Send them in the monthly survey or by replying to any email. Each month you do, you earn three more free months on one account. Four months of notes earns a full year.',
        'No card. Leave whenever you like and keep the months you have earned. Applications are read by hand.',
    ],
    value: 'At standard prices, each earned month is worth about $30 on QQQ Defensive or $40 on QQQ LEAPS.',
};
export const COOP = {
    title: '30 minutes, your questions first',
    intro: 'I will walk through the rules behind both strategies and the assumptions in the two year simulation, then you tell me what breaks. Critical feedback is the point of the call.',
    more: 'If it is useful, there are two ways to keep going: a research edition written for advisers, with the model\u2019s reading, its rules and its limits, or a standing review of the model where you run your own tests. There is also a longer conversation to be had about how published signals could be followed on a custodian account, with orders placed by your firm. That is a possibility to discuss. TradeMind does not connect to any brokerage today and places no trades.',
};

export const SIM = { leaps: '+229.48%', leapsDd: '14.59%', qqq: '+49.46%', qqqDd: '22.88%', window: 'October 14, 2024 to October 13, 2026' };
export const LIMITS = 'Hypothetical results from a simulation, not a real account. Options were model-priced, the rules were developed with hindsight, and this was one favorable period for QQQ and semiconductors.';
export const NOBROKER = 'You keep your own brokerage account and place every order yourself. TradeMind never connects to a broker and never places trades.';
export const DISCOUNT = 'Free subscribers get 30% off any TradeMind strategy plan.';

interface Focus {
    subject: string; pre: string; pill: string; title: string; body: string[];
    why: string; example?: string;
    primary: { label: string; kind: string }; secondary?: { label: string; kind: string };
}

export const FOCUS: Record<number, Focus> = {
    1: {
        subject: 'One brief a week on QQQ, risk first',
        pre: 'Four parts, about five minutes, the same order every week. This week\u2019s issue is at the bottom.',
        pill: 'The weekly brief', title: 'One brief a week, built around risk',
        body: [
            'If you hold QQQ, or keep almost deciding to, this is one brief a week on what the model sees and what could go wrong. An AI model and a fixed set of rules read the market, and the brief explains what they saw in plain English, risk first.',
            'Every issue has the same four parts: Market weather, Copilot readout, Flight plan and Turbulence test. This week\u2019s issue is below, so you can judge it before you decide anything.',
        ],
        why: 'A loss you planned for is easier to live with than one you did not. Each issue names the risk before it names the idea.',
        example: '\u201cThis week the model reads BULL, which means uptrend, and its reading did not change. The issue below shows what would change it.\u201d',
        primary: { label: 'Subscribe to the free weekly', kind: 'sw' }, secondary: { label: 'Prefer it daily', kind: 'sd' },
    },
    2: {
        subject: 'Lose 20%, need 25% to get back',
        pre: 'A 50% loss needs a 100% gain to recover. That one fact shapes everything we publish.',
        pill: 'Risk first', title: 'Why we limit declines before chasing gains',
        body: [
            'A loss and the gain needed to repair it are not the same size. Lose 20% and you need 25% to get back. Lose 33% and you need 50%. Lose 50% and you need 100%.',
            'In our two-year simulation, the largest decline of the QQQ LEAPS rules was 14.59%, which needs about a 17% gain to recover. QQQ buy and hold fell 22.88% at its worst, which needs about 30%.',
        ],
        why: 'Smaller declines leave more capital working, and they make a plan easier to stick with on a bad day. That is what lets compounding do its work over time.',
        example: '\u201cDown 50% means up 100% just to break even.\u201d',
        primary: { label: 'See the full simulation', kind: 'v' }, secondary: { label: 'Subscribe to the free weekly', kind: 'sw' },
    },
    3: {
        subject: 'Two QQQ strategies, rules written out',
        pre: 'One uses a long-dated QQQ option. One moves among four ETFs. Both publish their rules first.',
        pill: 'The strategies', title: 'QQQ LEAPS and QQQ Defensive',
        body: [
            'QQQ LEAPS owns a long-dated QQQ call option, which magnifies QQQ\u2019s moves, and sells shorter covered calls against it to collect premium. The most the long option can lose is the full amount paid for it. It needs options permission at your broker.',
            'QQQ Defensive moves among QQQ, QLD, TQQQ and SGOV, including leveraged ETFs, and is built to keep its declines shallow. Each account picks a conservative, moderate or aggressive risk level. It needs no options permission.',
        ],
        why: 'A strategy is only useful if you know its rules before you start, including when it does nothing.',
        primary: { label: 'See how the strategies work', kind: 'st' }, secondary: { label: 'See plans and pricing', kind: 'pl' },
    },
    4: {
        subject: 'What our AI model reads, and what it does not do',
        pre: 'Hourly prices, volatility and a few market gauges in. A score that helps set exposure out.',
        pill: 'The AI model', title: 'The model in plain English',
        body: [
            'The Defensive model reads hourly prices for QQQ, QLD, TQQQ and SGOV, a high-yield bond fund, and several measures of market volatility. It was trained on one question: when a simple trend signal fired, did the market reward it within about a month? Its output is an allocation score that helps set how much exposure each risk level holds.',
            'It does not predict prices, it is not a probability of profit, and it never trades. The rules around it are fixed and published, and it runs once each market day.',
        ],
        why: 'An AI model is only trustworthy if you can see what goes in, what comes out and what it is not allowed to do.',
        example: '\u201cNo change today. The model\u2019s reading held, so the published allocation stays as it was.\u201d',
        primary: { label: 'See a sample daily briefing', kind: 'x' }, secondary: { label: 'Subscribe to the free daily', kind: 'sd' },
    },
    5: {
        subject: 'The flat stretch at the start',
        pre: 'Almost 11 months with no positions in a QQQ simulation. Would you have stayed?',
        pill: 'The waiting test', title: 'The flat stretch at the start',
        body: [
            'After one early SMH loss, the simulation held no positions until September 2, 2025, when its QQQ LEAPS entry conditions first passed. On the day it finally entered, the simulated account was down about 5% while QQQ buy and hold was up about 14%. Ten months of looking wrong.',
        ],
        why: 'Rules that wait can look broken for months. The study exists for this. A virtual account shows you, month by month, whether you would keep following rules that look broken.',
        primary: { label: '', kind: '' },
    },
    6: {
        subject: 'Two virtual accounts, losses included',
        pre: 'Two virtual accounts follow the published signals. Every trade and every drop is shown.',
        pill: 'Check our work', title: 'The virtual accounts in the app',
        body: [
            'Since mid October, two virtual accounts have followed the published signals for QQQ LEAPS and QQQ Defensive. The app shows each account\u2019s value, change since start, largest drop and every trade, five days delayed.',
            'They are virtual accounts, not brokerage accounts, and the record is short. Losing stretches are shown as they happened.',
        ],
        why: 'A simulation shows what the rules would have done. The virtual accounts show what the published signals are doing now.',
        primary: { label: 'Open the virtual accounts', kind: 'va' }, secondary: { label: 'See how to check the numbers yourself', kind: 'vf' },
    },
    7: {
        subject: '20 seats to help test TradeMind',
        pre: 'Free access with a virtual account, no card, and nothing turns into a paid plan on its own.',
        pill: 'Study program', title: 'Help test the model, free',
        body: [
            'I am running a small study with QQQ investors. Members follow the signals with a virtual account and tell me what is unclear, what is missing and what they would change.',
        ],
        why: 'You would be one of 20 people deciding what the briefings explain next, what the app fixes first, and what gets cut.',
        primary: { label: 'Apply to the study program', kind: 'f' }, secondary: { label: 'Subscribe to the free weekly', kind: 'sw' },
    },
};

const FOCUS_ICON: Record<number, string> = { 1: '\u{1F4EC}', 2: '\u{1F4C9}', 3: '\u{1F9ED}', 4: '\u{1F916}', 5: '\u23F3', 6: '\u{1F50E}', 7: '\u{1FA91}' };

export interface Seq7Opts {
    token: string; firstName: string | null; baseUrl: string; mailingAddress: string;
    step: number; n?: number; facts?: IssueFacts;
    /** True when the reader already has a plan for the strategy; shows the allocation instead of the placeholder. */
    strategyMember?: boolean;
    /** 'ria' adds the professional cooperation card and the meeting button, and uses an adviser footer. Default retail. */
    audience?: 'retail' | 'ria';
}

export const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const F = "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;";
export const C = { bg: '#0b0f17', card: '#121826', line: '#232c3d', fg: '#f3f5f9', body: '#d5dae3', muted: '#9aa4b5', blue: '#7aa2ff', btn: '#2f6bff', green: '#34d399', greenBg: '#0f2a22', amber: '#f2c14e', lock: '#1a2133' };

export const sp = (h: number) => `<tr><td style="height:${h}px;line-height:${h}px;font-size:0;">&nbsp;</td></tr>`;
export const row = (inner: string) => `<tr><td style="${F}">${inner}</td></tr>`;
export const pill = (t: string, color = C.green, bg = C.greenBg) => {
    // A leading emoji is shown larger than the label so it stays visible.
    const m = /^(\P{ASCII}+?)\s+(.*)$/u.exec(t);
    const icon = m ? `<span style="font-size:18px;line-height:1;letter-spacing:0;vertical-align:middle;">${m[1]}</span>&nbsp;&nbsp;` : '';
    const label = m ? m[2] : t;
    return `<span style="display:inline-block;${F}font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:${color};background:${bg};border:1px solid ${color};border-radius:20px;padding:${m ? '3px 12px 3px 8px' : '4px 10px'};">${icon}<span style="vertical-align:middle;">${esc(label)}</span></span>`;
};
export const P = (t: string, size = 15, color = C.body, extra = '') => `<p style="margin:0 0 12px;${F}font-size:${size}px;line-height:1.65;color:${color};${extra}">${esc(t)}</p>`;

export function btn(url: string, label: string, kind: 'primary' | 'outline' = 'primary', full = false): string {
    const prim = kind === 'primary';
    return `<table role="presentation" cellpadding="0" cellspacing="0" ${full ? 'width="100%"' : ''} style="border-collapse:separate;"><tr><td align="center" bgcolor="${prim ? C.btn : C.card}" style="border-radius:10px;background:${prim ? C.btn : C.card};border:1px solid ${prim ? C.btn : '#3a4a70'};"><a href="${esc(url)}" style="display:block;padding:${prim ? '14px 26px' : '12px 18px'};${F}font-size:${prim ? 16 : 14}px;font-weight:800;color:${prim ? '#ffffff' : C.blue};text-decoration:none;line-height:1.2;">${esc(label)}</a></td></tr></table>`;
}
export function btnPair(a: string, al: string, b: string, bl: string): string {
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td width="50%" style="padding-right:5px;" valign="top">${btn(a, al, 'primary', true)}</td><td width="50%" style="padding-left:5px;" valign="top">${btn(b, bl, 'outline', true)}</td></tr></table>`;
}
export function card(inner: string, accent?: string): string {
    return row(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.card};border:1px solid ${C.line};${accent ? `border-top:3px solid ${accent};` : ''}border-radius:12px;"><tr><td style="padding:18px 20px;${F}">${inner}</td></tr></table>`) + sp(14);
}
export function why(t: string): string { return `<p style="margin:4px 0 12px;${F}font-size:14px;line-height:1.6;color:${C.muted};"><strong style="color:${C.fg};">Why it matters:</strong> ${esc(t)}</p>`; }
export function example(t: string): string { return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-left:3px solid ${C.blue};padding:2px 0 2px 12px;${F}font-size:14px;line-height:1.6;color:${C.body};">Example: ${esc(t)}</td></tr></table>`; }

function recoveryTable(): string {
    const rows = [['Decline', 'Gain needed to recover'], ['20%', '25%'], ['33%', '50%'], ['50%', '100%']];
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 14px;border:1px solid ${C.line};border-radius:8px;">${rows.map((r, i) => `<tr><td style="padding:8px 12px;${F}font-size:14px;${i ? `color:${C.body};border-top:1px solid ${C.line};` : `color:${C.muted};font-weight:700;`}">${r[0]}</td><td align="right" style="padding:8px 12px;${F}font-size:14px;${i ? `color:${C.fg};font-weight:800;border-top:1px solid ${C.line};` : `color:${C.muted};font-weight:700;`}">${r[1]}</td></tr>`).join('')}</table>`;
}
function simTiles(): string {
    const t = (label: string, big: string, small: string, color: string) => `<td width="50%" valign="top" style="padding:0 4px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0f1626;border:1px solid ${C.line};border-radius:10px;"><tr><td style="padding:14px;${F}"><div style="font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:${C.muted};">${label}</div><div style="font-size:26px;font-weight:800;color:${color};padding:4px 0;">${big}</div><div style="font-size:12px;color:${C.muted};">${small}</div></td></tr></table></td>`;
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${t('QQQ LEAPS, simulated', SIM.leaps, `Largest decline ${SIM.leapsDd}`, C.green)}${t('QQQ buy and hold', SIM.qqq, `Largest decline ${SIM.qqqDd}`, C.fg)}</tr></table><p style="margin:10px 4px 0;${F}font-size:12px;line-height:1.55;color:${C.muted};">${esc(SIM.window)}. ${esc(LIMITS)}</p>`;
}
export function statusLine(name: string, text: string, dot = C.green): string {
    return `<tr><td style="padding:10px 0;border-top:1px solid ${C.line};${F}font-size:14px;line-height:1.5;color:${C.fg};"><span style="display:inline-block;width:8px;height:8px;border-radius:4px;background:${dot};margin-right:8px;"></span><strong>${esc(name)}</strong><br><span style="color:${C.muted};padding-left:16px;display:inline-block;">${esc(text)}</span></td></tr>`;
}
export function locked(label: string, url: string, cta: string): string {
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:10px 0 4px;background:${C.lock};border:1px dashed #3a4a70;border-radius:10px;"><tr><td style="padding:14px 16px;${F}"><div style="font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:${C.amber};padding-bottom:6px;">Plan members only</div><div style="font-size:14px;line-height:1.6;color:${C.body};padding-bottom:12px;">${esc(label)}</div>${btn(url, cta, 'outline')}</td></tr></table>`;
}

function weeklyIssue(o: Seq7Opts, url: (k: string, x?: string) => string, full: boolean): string {
    const f = o.facts ?? SAMPLE_FACTS;
    const chips = [['\u2601\uFE0F','Market weather'], ['\u{1F9ED}','Copilot readout'], ['\u2708\uFE0F','Flight plan'], ['\u26A0\uFE0F','Turbulence test']].map(([i, c]) => `<td style="padding:0 6px 6px 0;"><span style="display:inline-block;${F}font-size:12px;font-weight:700;color:${C.fg};border:1px solid ${C.line};border-radius:8px;padding:7px 10px;background:${C.card};">${i}&nbsp;${c}</span></td>`).join('');
    const trend = f.trend ? `QQQ is ${f.trend} its 200 day average${f.trendChanged ? ', changed since the last reading.' : ', unchanged since the last reading.'}` : 'Not included this week.';
    const alloc = o.strategyMember
        ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${f.defensive.map((d) => statusLine(`QQQ Defensive, ${d.level.toLowerCase()} risk level`, d.text)).join('')}${statusLine('QQQ LEAPS', f.leaps)}</table>`
        : locked('This week\u2019s QQQ Defensive allocation for each risk level, and the QQQ LEAPS position status, go to readers with a plan for that strategy. Each plan covers one brokerage account.', url('pl'), 'Subscribe to a strategy');
    const parts = [
        card(`${pill('\u2601\uFE0F Market weather')}<div style="height:10px;"></div><div style="font-size:17px;font-weight:800;color:${C.fg};padding-bottom:8px;">Regime read</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${statusLine('Defensive model regime', f.regime)}${statusLine('Trend reading', trend)}</table>`),
        card(`${pill('\u{1F9ED} Copilot readout')}<div style="height:10px;"></div><div style="font-size:17px;font-weight:800;color:${C.fg};padding-bottom:8px;">What the model indicates</div>${P(f.readout, 14)}${alloc}`),
        card(`${pill('\u2708\uFE0F Flight plan')}<div style="height:10px;"></div><div style="font-size:17px;font-weight:800;color:${C.fg};padding-bottom:8px;">One idea: why a defensive model can lag</div>${P('A defensive model holds less exposure when its rules say conditions are weaker. If the market keeps rising anyway, that lower exposure lags. The lag is the cost of the same rule that limits declines.', 14)}${why('Knowing the cost of a rule in advance makes it easier to keep following it.')}`),
        card(`${pill('\u26A0\uFE0F Turbulence test')}<div style="height:10px;"></div><div style="font-size:17px;font-weight:800;color:${C.fg};padding-bottom:8px;">What could go wrong</div>${P('QLD and TQQQ aim for a multiple of one day of QQQ movement. Over longer periods the result can differ from that multiple, and declines can be deep. LEAPS values in a simulation are model-priced, and live quotes, spreads and fills can differ.', 14)}`),
    ];
    return row(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:1px solid ${C.line};padding-top:22px;${F}"><div style="font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:${C.blue};">This week\u2019s free issue${f.sample ? ' (sample)' : ''}</div><div style="font-size:24px;font-weight:800;color:${C.fg};padding:6px 0 4px;">Flight Plan: <span style="color:${C.blue};">${esc(f.weekLabel)}</span></div><div style="font-size:13px;color:${C.muted};padding-bottom:12px;">About 5 minutes. Four parts, in the same order every week.</div><table role="presentation" cellpadding="0" cellspacing="0"><tr>${chips}</tr></table></td></tr></table>`) + sp(10)
        + (full ? parts.join('') : parts[0] + row(`<div style="${F}font-size:14px;padding:2px 4px 14px;">${tl(url('i'), 'Read this week\u2019s full issue')}</div>`))
        + card(`<div style="font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:${C.blue};padding-bottom:10px;">The two year simulation</div>${simTiles()}<div style="height:12px;"></div><div style="${F}font-size:14px;line-height:1.8;">${tl(url('va'), 'See the virtual accounts')}&nbsp;&nbsp;${tl(url('v'), 'Simulation details')}</div>`);
}

type UrlFn = (k: string, x?: string) => string;
const tl = (u: string, label: string, color = C.blue) => `<a href="${esc(u)}" style="color:${color};text-decoration:underline;font-weight:600;">${esc(label)} &rsaquo;</a>`;
const SECOND: Record<number, [string, string][]> = {
    1: [],
    2: [['v', 'See the simulation details']],
    3: [['st', 'Read the rules for both strategies'], ['sw', 'Subscribe free']],
    4: [['x', 'See a sample daily briefing']],
    5: [['sw', 'Subscribe free']],
    6: [['va', 'Open the virtual accounts']],
    7: [['sw', 'Subscribe free']],
};
const STUDY_LEAD = new Set([3, 5, 7]);

function studyCompact(url: UrlFn): string {
    return row(`<div style="${F}font-size:14px;line-height:1.55;color:${C.body};padding:2px 4px 14px;">${esc(STUDY_COMPACT)} ${tl(url('f'), 'Learn more')}</div>`);
}
function studyFull(url: UrlFn): string {
    return card(`<div style="${F}font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:${C.blue};padding-bottom:6px;">\u{1F393}&nbsp;Study program</div><div style="${F}font-size:20px;font-weight:800;color:${C.fg};padding-bottom:8px;">${esc(STUDY_FULL.title)}</div>${STUDY_FULL.body.map((x) => P(x, 14)).join('')}${btn(url('f'), 'Apply to the study program')}<div style="height:10px;"></div>${P(STUDY_FULL.value, 12, C.muted)}`, C.blue);
}
function coopCard(url: UrlFn): string {
    return card(`<div style="${F}font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:${C.green};padding-bottom:6px;">\u{1F91D}&nbsp;For advisers</div><div style="${F}font-size:20px;font-weight:800;color:${C.fg};padding-bottom:8px;">${esc(COOP.title)}</div>${P(COOP.intro, 14)}${P(COOP.more, 14)}`, C.green);
}

export function renderSeq7(o: Seq7Opts): { subject: string; text: string; html: string; unsubUrl: string; n: number } {
    const n = o.n ?? SEQ7_N_BY_STEP[o.step] ?? 1;
    const f = FOCUS[n];
    const url = (kind: string, extra = '') => `${o.baseUrl}/r/${o.token}/${kind}?s=${o.step}${extra}`;
    const unsubUrl = `${o.baseUrl}/u/${o.token}`;
    const first = (o.firstName ?? '').trim();
    const hi = first ? `Hi ${first},` : 'Hi,';

    // Focus card
    let extra = '';
    if (n === 2) extra = recoveryTable();
    if (n === 5) extra = `<p style="margin:0 0 6px;"><img src="${esc(WS_IMG)}" alt="${esc(WS_ALT)}" width="520" style="display:block;width:100%;max-width:520px;height:auto;border-radius:8px;border:0;"></p><p style="margin:0 0 12px;${F}font-size:12px;color:${C.muted};">${esc(WS_CAP)}</p>`;
    const focusCard = card(`${pill((FOCUS_ICON[n] ?? '') + ' ' + f.pill)}<div style="height:10px;"></div><div style="${F}font-size:20px;font-weight:800;color:${C.fg};line-height:1.3;padding-bottom:10px;">${esc(f.title)}</div>${f.body.map((b) => P(b)).join('')}${extra}${why(f.why)}${f.example ? example(f.example) : ''}`, C.green);

    const ria = o.audience === 'ria';
    const studyLead = STUDY_LEAD.has(n);
    // One primary action per email. Everything else is a quiet text link.
    const primary: [string, string] = ria ? ['mt', 'Book 30 minutes'] : studyLead ? ['f', 'Apply to the study program'] : ['sw', 'Subscribe free'];
    const riaStudyFull = ria && studyLead;
    const seconds = (SECOND[n] ?? []).filter(([k]) => k !== primary[0]);
    if (ria && !seconds.some(([k]) => k === 'sw')) seconds.push(['sw', 'Subscribe free']);
    const secondaryRow = (links: [string, string][]) => links.length ? row(`<div style="${F}font-size:14px;line-height:1.9;padding:4px 4px 14px;">${links.map(([k, l]) => tl(url(k), l)).join('&nbsp;&nbsp;&nbsp;')}</div>`) : '';
    const pollRow = n === 5 ? row(`<div style="${F}font-size:15px;font-weight:800;color:${C.fg};padding:2px 4px 6px;">Would you have kept following it?</div><div style="${F}font-size:14px;line-height:1.9;padding:0 4px 4px;">${[['qa', 'A. Yes, I would have waited'], ['qb', 'B. I would want a clearer explanation first'], ['qc', 'C. I would have walked away']].map(([k, l]) => tl(url(k), l)).join('<br>')}</div><div style="${F}font-size:12px;line-height:1.5;color:${C.muted};padding:4px 4px 14px;">There is no right answer. If you picked C, you are exactly who should test this for free.</div>`) : '';
    const primaryRow = row(btn(url(primary[0]), primary[1])) + (primary[0] === 'sw' ? row(P('Weekly by default. Switch to daily any time.', 13, C.muted)) : '');

    const H: string[] = [];
    H.push(row(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="${F}font-size:18px;font-weight:800;color:${C.fg};"><a href="${esc(url('h'))}" style="color:${C.fg};text-decoration:none;">TradeMind<span style="color:${C.blue};">.bot</span></a></td><td align="right">${pill('Free research', C.blue, '#121a2e')}</td></tr></table>`) + sp(18));
    H.push(row(`<div style="${F}font-size:26px;font-weight:800;line-height:1.25;color:${C.fg};">${esc(THEME.split('.')[0])}. <span style="color:${C.blue};">${esc(THEME.split('.').slice(1).join('.').trim())}</span></div><div style="${F}font-size:13px;color:${C.muted};padding-top:6px;">${esc(THEME_SUB)}</div>`) + sp(20));
    H.push(row(P(hi, 16, C.fg)));
    H.push(row(`<div style="${F}font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:${C.muted};padding:4px 4px 8px;">Explore</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td width="50%" style="padding:4px;">${btn(url('pl'), 'Plans and pricing', 'outline', true)}</td><td width="50%" style="padding:4px;">${btn(url('f'), 'Study program', 'outline', true)}</td></tr><tr><td width="50%" style="padding:4px;">${btn(url('va'), 'Virtual accounts', 'outline', true)}</td><td width="50%" style="padding:4px;">${btn(url('h'), 'trademind.bot', 'outline', true)}</td></tr></table>`) + sp(14));
    if (ria) H.push(riaStudyFull ? studyFull(url) : studyCompact(url));
    if (ria) H.push(focusCard + coopCard(url));
    else if (studyLead) H.push(focusCard + studyFull(url));
    else H.push(focusCard);
    H.push(primaryRow);
    H.push(pollRow + secondaryRow(seconds));
    if (!ria && !studyLead) H.push(studyCompact(url));
    H.push(weeklyIssue(o, url, n === 1));
    H.push(row(P(DISCOUNT + ' ' + NOBROKER, 13, C.muted)));
    H.push(row(P('Reply to this email or write to me at eric@trademind.bot.', 14, C.body)));
    H.push(row(`<p style="margin:0 0 2px;${F}font-size:15px;color:${C.fg};font-weight:700;">Eric Huang</p><p style="margin:0 0 20px;${F}font-size:13px;color:${C.muted};">Founder, TradeMind &middot; Queens, New York</p>`));
    H.push(row(`<div style="border-top:1px solid ${C.line};padding-top:14px;${F}font-size:11px;line-height:1.6;color:${C.muted};">${o.audience === 'ria' ? 'You are getting this note at your business address because your firm is listed as an investment professional.' : 'You are getting this invitation because you subscribed to an investing publication.'} <a href="${esc(unsubUrl)}" style="color:${C.muted};text-decoration:underline;">Unsubscribe or snooze</a>.<br>TradeMind publishes educational research for self-directed investors. It is not personalized investment advice. All performance shown is hypothetical simulation unless labeled as a virtual account. Options and leveraged ETFs involve substantial risk, including loss of the amount invested.<br><br>${esc(o.mailingAddress)}</div>`));

    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"><title>${esc(f.subject)}</title></head><body style="margin:0;padding:0;background:${C.bg};"><div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(f.pre)}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.bg}" style="background:${C.bg};"><tr><td align="center" style="padding:26px 14px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">${H.join('')}</table></td></tr></table></body></html>`;

    // Plain text
    const facts = o.facts ?? SAMPLE_FACTS;
    const T: string[] = [hi, '', `EXPLORE: Plans ${url('pl')} | Study program ${url('f')} | Virtual accounts ${url('va')} | trademind.bot ${url('h')}`, ''];
    if (ria && !studyLead) T.push(`${STUDY_COMPACT} Apply: ${url('f')}`, '');
    T.push(f.title.toUpperCase(), ...f.body, '');
    if (n === 2) T.push('Decline 20%: gain needed 25%', 'Decline 33%: gain needed 50%', 'Decline 50%: gain needed 100%', '');
    T.push(`Why it matters: ${f.why}`, '');
    if (ria) T.push(COOP.title.toUpperCase(), COOP.intro, COOP.more, '');
    if (studyLead) T.push(STUDY_FULL.title.toUpperCase(), ...STUDY_FULL.body, STUDY_FULL.value, '');
    T.push(`${primary[1]}: ${url(primary[0])}`);
    if (primary[0] === 'sw') T.push('Weekly by default. Switch to daily any time.');
    T.push('');
    if (n === 5) T.push('Would you have kept following it?', `A. Yes, I would have waited: ${url('qa')}`, `B. I would want a clearer explanation first: ${url('qb')}`, `C. I would have walked away: ${url('qc')}`, '');
    for (const [k, l] of seconds) T.push(`${l}: ${url(k)}`);
    if (seconds.length) T.push('');
    if (!ria && !studyLead) T.push(`${STUDY_COMPACT} Learn more: ${url('f')}`, '');
    T.push(`THIS WEEK'S FREE ISSUE${facts.sample ? ' (SAMPLE)' : ''}: ${facts.weekLabel}`,
        `Market weather: regime ${facts.regime}. ${facts.trend ? `QQQ is ${facts.trend} its 200 day average.` : ''}`,
        o.strategyMember ? `Copilot readout: ${facts.defensive.map((d) => `${d.level} ${d.text}`).join('; ')}. QQQ LEAPS: ${facts.leaps}` : `Copilot readout: the allocation for each risk level goes to plan members. Subscribe to a strategy: ${url('pl')}`,
        'Flight plan: why a defensive model can lag a rising market.',
        'Turbulence test: leveraged ETFs and model-priced options.',
        `Simulation, ${SIM.window}: QQQ LEAPS ${SIM.leaps} (largest decline ${SIM.leapsDd}) vs QQQ ${SIM.qqq} (${SIM.qqqDd}). ${LIMITS}`,
        `Virtual accounts: ${url('va')}`, `Simulation details: ${url('v')}`, '',
        `Plans and pricing: ${url('pl')}`, `Study program: ${url('f')}`, `trademind.bot: ${url('h')}`, '',
        DISCOUNT, NOBROKER, '', 'Reply to this email or write to me at eric@trademind.bot.', '', 'Eric Huang', 'Founder, TradeMind', '',
        `${o.audience === 'ria' ? 'You are getting this note at your business address because your firm is listed as an investment professional.' : 'You are getting this invitation because you subscribed to an investing publication.'} Unsubscribe or snooze: ${unsubUrl}`,
        o.mailingAddress, 'Educational research, not personalized investment advice. Investing involves risk, including loss.');
    return { subject: f.subject, text: T.join('\n'), html, unsubUrl, n };
}
