/**
 * Six-email retail sequence (founding research panel path). Each email has one focus, one primary button and one quiet
 * link, plus the same Explore row that points to the six "Start here" sections and a trademind.bot link.
 * Off unless outreach_settings.copy_prog_start is set. Template labels in outreach_sends: S1 (first email), then
 * S2 to S6 for follow-ups. Steps: 1 (day 0), 2 (day 7), 5 (day 14), 6 (day 21), 7 (day 28), 8 (day 35).
 * Links are the campaign's own tracked redirects, /r/<token>/<kind>?s=<step>.
 */
import { INVITE_TEMPLATES_V5 } from './templates-v5';
import { PARTS, RESULT_H, RESULT_P1, RESULT_P2, LIMITS, OFFER, NOBROKER, COPY, REPLY_LINE, escH } from './copy-v8';
import { IMG as WS_IMG, ALT as WS_ALT, CAP as WS_CAP, P2 as WS_P2 } from './copy-ws';

export const SEQ6_TEMPLATE = 'S1';
/** Sequence steps in order. Step 6 and 7 keep their existing numbers; step 8 (day 35) is new. */
export const SEQ6_STEPS = [1, 2, 5, 6, 7, 8] as const;
export const SEQ6_DAYS: Record<number, number> = { 2: 7, 5: 14, 6: 21, 7: 28, 8: 35 };
export const SEQ6_LABEL: Record<number, string> = { 1: 'S1', 2: 'S2', 5: 'S3', 6: 'S4', 7: 'S5', 8: 'S6' };
/** People whose first email was never delivered well (sent through retired domains) get email 1 as their step 2 re-introduction, labeled S1R. Their later emails use steps 5, 6, 7, 8, 9 for emails 2 to 6. */
export const SEQ6_REINTRO_LABEL = 'S1R';
export const SEQ6_OFFSET_LADDER = [5, 6, 7, 8, 9] as const;
export const seq6Label = (n: number) => `S${n}`;
const N_BY_STEP: Record<number, number> = { 1: 1, 2: 2, 5: 3, 6: 4, 7: 5, 8: 6 };

export type Section = 'brief' | 'strategies' | 'rules' | 'challenge' | 'verify' | 'panel';
export const SECTIONS: { key: Section; code: string; label: string }[] = [
    { key: 'brief', code: 'br', label: 'Weekly brief' },
    { key: 'strategies', code: 'st', label: 'Strategies' },
    { key: 'rules', code: 'ru', label: 'Rules and plans' },
    { key: 'challenge', code: 'ch', label: 'The challenge' },
    { key: 'verify', code: 'vf', label: 'Verify our numbers' },
    { key: 'panel', code: 'pn', label: 'Research panel' },
];
const FOCUS: Record<number, Section> = { 1: 'brief', 2: 'strategies', 3: 'rules', 4: 'challenge', 5: 'verify', 6: 'panel' };

interface Link { label: string; kind: string; extra?: string }
const PRIMARY: Record<number, Link> = {
    1: { label: 'Read the sample issue', kind: 'p' },
    2: { label: 'See how the strategies work', kind: 'st' },
    3: { label: 'See a sample daily briefing', kind: 'x' },
    5: { label: 'Open the verification kit', kind: 'vf' },
    6: { label: 'Apply to the research panel', kind: 'f' },
    4: { label: 'Pick your answer', kind: 'qa' },
};
const QUIET: Record<number, { lead: string; link: Link }> = {
    1: { lead: 'or', link: { label: 'Subscribe free', kind: 's' } },
    2: { lead: 'or', link: { label: 'Read the sample issue', kind: 'p' } },
    3: { lead: 'or', link: { label: 'Subscribe free to the weekly brief', kind: 's' } },
    4: { lead: 'or', link: { label: 'Open the simulated record', kind: 'v' } },
    5: { lead: 'or', link: { label: 'Open the simulated record', kind: 'v' } },
    6: { lead: 'or', link: { label: 'See a sample daily briefing', kind: 'x' } },
};
const SUBJECT: Record<number, string> = {
    1: 'A weekly QQQ brief you can preview',
    2: 'How the two QQQ strategies work',
    3: 'The rules we publish before the market moves',
    4: 'Would you have kept following this?',
    5: 'Check our numbers before you trust them',
    6: 'Help shape TradeMind, free for 30 days',
};
const PRE: Record<number, string> = {
    1: 'In a two-year simulation: about 4.6 times QQQ\u2019s percentage return, with a decline about 36% shallower.',
    2: 'In a two-year simulation: about 4.6 times QQQ\u2019s percentage return, with a decline about 36% shallower.',
    3: 'A sample of the daily briefing, including a day when nothing changes.',
    4: 'A simulation that held no positions for almost 11 months.',
    5: 'Public rules, public data, and credit for what you find.',
    6: 'Free for 30 days, no card, and nothing turns into a paid plan on its own.',
};

/** Headline figures for the box. 229.48 / 49.46 = 4.64 times the percentage return; 1 - 14.59 / 22.88 = 36% shallower. */
export const HIGHLIGHT_TEXT = 'In this two-year simulation, QQQ LEAPS returned about 4.6 times the percentage return of QQQ buy and hold, with a largest decline about 36% shallower.';

const FONT = "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;";
const SPIVA = 'For decades the simple answer has beaten the expert one. Over 15 years, about 9 in 10 professionally managed US large-cap funds trailed the S&P 500 (S&P SPIVA, year-end 2025). That figure is about managed funds. It says nothing about whether TradeMind will do better.';

export interface Seq6Opts {
    token: string; firstName: string | null; baseUrl: string; mailingAddress: string; sigSep: string; useHtml?: boolean;
    /** Sequence step: 1, 2, 5, 6, 7, 8 or 9. Used for the tracking step number and, unless n is given, the email number. */
    step: number;
    /** Email number 1 to 6, when it differs from the step (people who got the re-introduction as email 1). */
    n?: number;
    /** Sections this person has viewed (human confirmed). Used only to choose the quiet link. */
    visited?: string[];
    /** Answer from email 4 (a, b or c), used for the first line of email 5. */
    answer?: string | null;
}

function sectionCode(k: Section) { return SECTIONS.find((s) => s.key === k)!; }

export function renderSeq6(o: Seq6Opts): { subject: string; text: string; html: string | null; unsubUrl: string; n: number } {
    const n = o.n ?? N_BY_STEP[o.step] ?? 1;
    const s = o.step;
    const url = (kind: string, extra = '') => `${o.baseUrl}/r/${o.token}/${kind}?s=${s}${extra}`;
    const unsubUrl = `${o.baseUrl}/u/${o.token}`;
    const first = (o.firstName ?? '').trim();
    const hi = first ? `Hi ${first},` : 'Hi,';
    const focus = FOCUS[n];
    const visited = new Set(o.visited ?? []);

    // Quiet link: the default, unless this person already viewed the focus page. Then the next unseen section.
    let quiet = QUIET[n];
    if (visited.has(focus)) {
        const idx = SECTIONS.findIndex((x) => x.key === focus);
        for (let i = 1; i < SECTIONS.length; i++) {
            const c = SECTIONS[(idx + i) % SECTIONS.length];
            if (!visited.has(c.key)) { quiet = { lead: 'or', link: { label: `See ${c.label.charAt(0).toLowerCase()}${c.label.slice(1)}`, kind: c.code } }; break; }
        }
    }

    // body content per email (plain paragraphs; boxes and extras handled below)
    let paras: string[] = [];
    let heading: string | null = null;
    let showStrip = false;
    let showBox = false;
    let after: string[] = [];
    let list: string[] = [];
    let listIntro: string | null = null;
    let poll = false;
    let chart = false;

    if (n === 1) {
        paras = COPY.A.intro; showStrip = true; showBox = true;
    } else if (n === 2) {
        paras = [
            SPIVA,
            'TradeMind publishes rules for two QQQ strategies. QQQ holds the Nasdaq-100, the heart of high tech.',
            'QQQ LEAPS owns a long-dated QQQ call option, which multiplies QQQ\u2019s moves, and sells covered calls against it to collect premium during temporary pullbacks. It needs options permission.',
            'QQQ Defensive moves among QQQ, QLD, TQQQ and SGOV, including leveraged ETFs, and is built to keep its declines shallow. It needs no options permission.',
        ];
        showBox = true;
    } else if (n === 3) {
        paras = ['Here is how TradeMind works, in four rules.'];
        list = [
            'The rules are written before a signal is published, and each change is time-stamped on a public ledger.',
            'You place every order yourself, in your own account. We never connect to a broker.',
            'Many days the answer is \u201cno change\u201d. That is the model working as designed, not a gap in the service.',
            'The model can be wrong. The sample shows what we would tell you on a day it changes its mind.',
        ];
        after = ['The optional Research plan sends one briefing each market day: the instruction first, then labeled context that is never an extra instruction. Tracking adds a virtual account so you can see how the rules would have performed. Details and prices are on the site.'];
    } else if (n === 4) {
        paras = ['Here is the part of our simulation I would look at first: the long flat stretch at the start.', WS_P2];
        chart = true; poll = true;
        after = ['There is no right answer, and any answer is welcome. Each choice is one click, then one question on our site. This is a simulation, not a real account. The rules were developed with hindsight, options were model-priced, and the later result came in one favorable window for QQQ and semiconductors.'];
    } else if (n === 5) {
        const lead: Record<string, string> = {
            a: 'Since you said you would have waited, here is a way to check the numbers.',
            b: 'You asked for clearer explanations, so here is a way to look inside.',
            c: 'If you would have walked away, a check of the numbers may show why or why not.',
        };
        paras = [
            ...(o.answer && lead[o.answer] ? [lead[o.answer]] : []),
            'A simulation is worth more when someone else can reproduce it. So we are asking you to try.',
            'The verification kit lists the exact rules, the data sources, the dates, and the numbers to match: 229.48% and a 14.59% largest decline for QQQ LEAPS, 49.46% and 22.88% for QQQ buy and hold. These are simulated results, not live trading. Options were model-priced, the rules were developed with hindsight, and it was one favorable period for QQQ and semiconductors. You can recheck the numbers in a spreadsheet or a script.',
        ];
        listIntro = 'Three ways to take part:';
        list = [
            'Reproduce the numbers and tell us if you get different ones.',
            'Name the assumption you think is weakest, and why.',
            'Find an error in the record, the chart, or the wording.',
        ];
        after = ['Anyone who sends a reproducible finding gets credit on a public changelog (with your permission) and a seat in the next research panel group. Credit does not depend on whether your finding is good or bad news for us.'];
    } else {
        paras = [
            'I am building a small research panel of QQQ investors. Members try Research and Tracking free for 30 days and help me test the model.',
        ];
        listIntro = 'What members can do, all optional:';
        list = [
            'Reproduce a published number (verification).',
            'Challenge an assumption or a rule (challenge).',
            'Advise on the model: which scenarios to add, which wording is unclear (advice).',
            'Read a briefing and tell me what was confusing (feedback).',
        ];
        after = [
            'Each completed task earns 30 days of free access, up to six months in total. After the first 30 days you choose: keep going by doing one task a month, or take a founding price with no tasks at all. No card is needed to apply, and nothing turns into a paid plan automatically. You never need to trade, refer anyone, or write a review.',
            'Every TradeMind result shown so far comes from a simulation, not live trading.',
        ];
    }

    const primary = PRIMARY[n];
    const primaryUrl = url(primary.kind);
    const quietUrl = url(quiet.link.kind);
    const exploreItems = SECTIONS.filter((x) => x.key !== focus);
    const homeUrl = url('h');
    const showOffer = n <= 3;

    // plain text
    const T: string[] = [hi, ''];
    for (const p of paras) T.push(p, '');
    if (showStrip) { T.push('Four parts in every issue:', ...PARTS.map(([, nm, d]) => `- ${nm}: ${d}`), `What each issue covers: ${url('i')}`, ''); }
    if (showBox) T.push(RESULT_H.toUpperCase(), HIGHLIGHT_TEXT, '', RESULT_P1, '', RESULT_P2, '', LIMITS, '');
    if (chart) T.push(`[Chart] ${WS_ALT}`, WS_CAP, '');
    if (listIntro) T.push(listIntro);
    if (list.length) { T.push(...list.map((x, i) => (n === 3 ? `${i + 1}. ${x}` : `- ${x}`)), ''); }
    if (poll) {
        T.push('Would you have kept following it?',
            `A. Yes, I would have waited: ${url('qa')}`,
            `B. I would have asked for a clearer explanation first: ${url('qb')}`,
            `C. I would have walked away: ${url('qc')}`, '');
    }
    for (const p of after) T.push(p, '');
    if (!poll) T.push(`${primary.label}: ${primaryUrl}`);
    T.push(`${quiet.lead === 'or' ? 'Or: ' : ''}${quiet.link.label}: ${quietUrl}`, '');
    T.push('Explore:', ...exploreItems.map((x) => `- ${x.label}: ${url(x.code)}`), '');
    T.push('Free weekly newsletter. Unsubscribe any time.');
    if (showOffer) T.push(OFFER);
    T.push('', NOBROKER, '', REPLY_LINE, '', 'Eric Huang', 'Founder, TradeMind', `trademind.bot: ${homeUrl}`, 'Queens, New York', '',
        o.sigSep,
        `You're getting this invite because you subscribed to an investing publication. Unsubscribe or snooze: ${unsubUrl}`,
        `AI Investor Copilot by TradeMind, ${o.mailingAddress}`,
        'Education only, not investment advice. Investing involves risk, including loss.');
    const text = T.join('\n');

    // HTML
    let html: string | null = null;
    if (o.useHtml) {
        const shell = INVITE_TEMPLATES_V5.FU.html as string;
        const startMarker = '<p class="t" style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#e5e7eb;">Hi ';
        const a = shell.indexOf(startMarker);
        const z = shell.indexOf('</td></tr>\n<tr><td class="px t2"');
        if (a < 0 || z < 0) throw new Error('sequence html shell markers not found');
        const head = shell.slice(0, a)
            .replace(/(<div style="display:none;max-height:0;overflow:hidden;opacity:0;">)[^<]*(&#847;)/, `$1${escH(PRE[n])}$2`)
            .replace(/<title>[\s\S]*?<\/title>/, `<title>${escH(SUBJECT[n])}</title>`)
            .replace(/href="https:\/\/trademind\.bot"/g, `href="${homeUrl}"`);
        const tail = shell.slice(z).replace(
            /You(?:’|&rsquo;|')re receiving this invitation because[\s\S]*?Unsubscribe in one click<\/a>\./,
            `You’re getting this invite because you subscribed to an investing publication. <a href="${unsubUrl}" class="t" style="color:#aab4c5;text-decoration:underline;">Unsubscribe or snooze</a>.`
        );
        const P = (t: string, extra = '') => `<p class="t" style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#e5e7eb;${extra}">${escH(t)}</p>`;
        const btnStyle = `display:inline-block;padding:14px 32px;${FONT}font-size:17px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px;`;
        const bigBtn = (u: string, label: string) => `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px 0 12px;"><tr><td style="border-radius:8px;background:#2f6bff;"><a href="${escH(u)}" style="${btnStyle}">${escH(label)}</a></td></tr></table>`;
        const strip = PARTS.map(([k, nm, d]) => `<td width="25%" valign="top" style="padding:12px 6px;${FONT}font-size:12px;line-height:1.4;"><a href="${escH(url('i', `&a=${k}`))}" class="pl" style="display:block;color:#8fb3ff;font-size:13px;font-weight:700;text-decoration:none;">${nm} &rsaquo;</a><span class="t2" style="color:#aab4c5;">${d}</span></td>`).join('');
        const box = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 20px;"><tr><td class="ob" style="padding:16px 18px;background:#1a2540;border-left:4px solid #2f6bff;border-radius:4px;${FONT}">`
            + `<p class="t" style="margin:0 0 10px;font-size:13px;font-weight:800;letter-spacing:.04em;color:#8fb3ff;text-transform:uppercase;">${escH(RESULT_H)}</p>`
            + `<p class="t" style="margin:0 0 12px;font-size:18px;line-height:1.4;font-weight:800;color:#ffffff;">${escH(HIGHLIGHT_TEXT)}</p>`
            + `<p class="t" style="margin:0 0 10px;font-size:15px;line-height:1.55;color:#e5e7eb;">${escH(RESULT_P1)}</p>`
            + `<p class="t" style="margin:0 0 12px;font-size:15px;line-height:1.55;color:#e5e7eb;">${escH(RESULT_P2)}</p>`
            + `<p class="t2" style="margin:0;font-size:14px;line-height:1.55;color:#c3cad8;">${escH(LIMITS)}</p></td></tr></table>`;
        const ul = list.length
            ? (listIntro ? P(listIntro, 'margin-bottom:8px;') : '')
              + `<${n === 3 ? 'ol' : 'ul'} class="t" style="margin:0 0 18px;padding-left:22px;font-size:15px;line-height:1.6;color:#e5e7eb;">${list.map((x) => `<li style="margin-bottom:6px;">${escH(x)}</li>`).join('')}</${n === 3 ? 'ol' : 'ul'}>`
            : '';
        const img = chart
            ? `<p style="margin:0 0 6px;"><img src="${escH(WS_IMG)}" alt="${escH(WS_ALT)}" width="520" style="display:block;width:100%;max-width:520px;height:auto;border-radius:6px;border:0;"></p><p class="t2" style="margin:0 0 18px;font-size:13px;line-height:1.5;color:#aab4c5;">${escH(WS_CAP)}</p>`
            : '';
        const pollHtml = poll
            ? P('Would you have kept following it?', 'font-weight:700;margin-bottom:10px;')
              + [['qa', 'A. Yes, I would have waited'], ['qb', 'B. I would have asked for a clearer explanation first'], ['qc', 'C. I would have walked away']]
                  .map(([k, l]) => `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 8px;"><tr><td style="border-radius:8px;background:#2f6bff;"><a href="${escH(url(k))}" style="display:inline-block;padding:11px 22px;${FONT}font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px;">${escH(l)}</a></td></tr></table>`).join('') + '<div style="height:10px;line-height:10px;">&nbsp;</div>'
            : '';
        const cta = (poll ? '' : bigBtn(primaryUrl, primary.label))
            + `<p class="t" style="margin:${poll ? '14px' : '0'} 0 20px;font-size:15px;color:#e5e7eb;">${quiet.lead} <a href="${escH(quietUrl)}" class="pl" style="color:#8fb3ff;font-weight:600;">${escH(quiet.link.label)}</a></p>`;
        const explore = `<p class="t2" style="margin:0 0 16px;font-size:13px;line-height:1.9;color:#aab4c5;border-top:1px solid #273449;padding-top:12px;">Explore: ${exploreItems.map((x) => `<a href="${escH(url(x.code))}" class="pl" style="color:#8fb3ff;text-decoration:none;white-space:nowrap;">${x.label}</a>`).join(' &nbsp;|&nbsp; ')}</p>`;
        const body = P(hi) + paras.map((p) => P(p)).join('')
            + (showStrip ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 6px;border-top:1px solid #273449;border-bottom:1px solid #273449;"><tr>${strip}</tr></table><p class="t2" style="margin:0 0 18px;font-size:12px;color:#aab4c5;">Tap any part to see what it covers.</p>` : '')
            + (showBox ? box : '') + img + ul + pollHtml
            + after.map((p) => P(p)).join('')
            + cta + explore
            + `<p class="t" style="margin:0 0 6px;font-size:14px;line-height:1.55;color:#e5e7eb;"><b>Free weekly newsletter. Unsubscribe any time.</b></p>`
            + (showOffer ? `<p class="t" style="margin:0 0 16px;font-size:14px;line-height:1.55;color:#e5e7eb;">${escH(OFFER)}</p>` : '')
            + P(NOBROKER, 'font-size:14px;color:#aab4c5;')
            + P(REPLY_LINE, 'font-size:15px;')
            + `<p class="t" style="margin:0 0 4px;font-size:16px;color:#e5e7eb;">Eric Huang</p><p class="t2" style="margin:0 0 4px;font-size:13px;color:#aab4c5;">Founder, TradeMind &middot; <a href="${escH(homeUrl)}" class="pl" style="color:#8fb3ff;">trademind.bot</a></p><p class="t2" style="margin:0 0 24px;font-size:13px;color:#aab4c5;">Queens, New York</p>`;
        html = (head + body + tail).replace(/\{\{mailing_address\}\}/g, escH(o.mailingAddress));
    }
    return { subject: SUBJECT[n], text, html, unsubUrl, n };
}

export { sectionCode };
