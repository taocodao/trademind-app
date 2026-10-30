/**
 * Adviser outreach, five emails: show the product, show the evidence, choose the use, IRA account questions, a defined next step.
 * Every email carries Subscribe and Book 20 minutes. Emails 1 and 2 lead with Subscribe, emails 3 to 5 lead with Book 20 minutes.
 * No brokerage connection and no automated execution is offered. Simulation numbers and the limits text are kept exactly as approved.
 */
import { esc, F, C, row, sp, P, btnPair, card, pill, SIM, LIMITS, NOBROKER, SAMPLE_FACTS, STAGE_EMAIL1 } from './copy-seq7';

export const RIA_STEPS = [21, 22, 23, 24, 25] as const;
export const RIA_DAYS = [0, 5, 12, 21, 32];

export interface RiaOpts { token: string; firstName: string | null; baseUrl: string; mailingAddress: string; n: number; step?: number }

interface Block { kind: 'p' | 'h' | 'link' | 'excerpt' | 'record'; text?: string; label?: string; anchor?: string }
interface Email { subject: string; pre: string; title: string; blocks: Block[] }

const p = (text: string): Block => ({ kind: 'p', text });
const h = (text: string): Block => ({ kind: 'h', text });
const link = (label: string, anchor: string): Block => ({ kind: 'link', label, anchor });

export const RIA_EMAILS: Record<number, Email> = {
    1: {
        subject: 'A QQQ research sample your clients could read',
        pre: 'The weekly and daily issues, plus the same facts explained for different client contexts.',
        title: 'See the product, not a pitch',
        blocks: [
            p('Rather than send you a general partnership pitch, here is the product itself.'),
            p('TradeMind publishes rules-based QQQ research in four sections: market weather, copilot readout, flight plan and turbulence test.'),
            { kind: 'excerpt' },
            p('A typical quiet-day issue separates the unchanged model status from the explanation below it. It does not create a new instruction merely to fill the page.'),
            link('View the weekly and daily samples', 'sample'),
            p('The page also shows how the same facts can be explained for different client contexts. The numbers, model status and limitations do not change.'),
            p('You can subscribe for your own reading, or book 20 minutes to discuss internal research or client-ready publishing.'),
        ],
    },
    2: {
        subject: 'The record behind the sample',
        pre: 'A simulation, a short forward record, and the limits, all in one place.',
        title: 'Inspect the evidence',
        blocks: [
            p('The main limitation is straightforward: TradeMind\u2019s historical results are simulated, and the forward virtual account record is short. We do not present either as audited client results.'),
            { kind: 'record' },
            link('Inspect the method, simulation and virtual records', 'record'),
            p('The record page includes the stated assumptions, the limitations and the changes. Losing stretches remain visible.'),
            p('If you are evaluating the research, which evidence gap matters most to you? Reply with one line and I will answer it.'),
        ],
    },
    3: {
        subject: 'Research for you, or research for your clients?',
        pre: 'Two different things we could discuss. A 20 minute conversation decides whether either is useful.',
        title: 'Choose the use',
        blocks: [
            p('There are two different products we could discuss.'),
            h('Internal research'),
            p('You read the publication and evaluate it within your own process.'),
            h('Client-ready publishing'),
            p('Your firm receives a defined edition and chooses which explanation fits the conversation. Branding, revisions and distribution rights would be agreed separately.'),
            link('See one worked client-ready example', 'client'),
            p('We are not assuming every firm needs both. A 20 minute conversation should establish whether either replaces work you already do.'),
        ],
    },
    4: {
        subject: 'The account questions belong beside the strategy',
        pre: 'An IRA sample that puts the account questions next to the research.',
        title: 'The IRA workflow',
        blocks: [
            p('Our IRA sample puts the account questions beside the research.'),
            p('QQQ Defensive includes leveraged ETFs. QQQ LEAPS combines a long-dated call with shorter-dated written calls. The exact options structure and the account permissions need checking with the custodian.'),
            link('View the IRA sample', 'ira'),
            p('TradeMind does not connect to accounts or place orders. The sample is meant to make the research easier to inspect. It does not imply that either strategy fits every IRA.'),
            p('If this is relevant to your practice, we can review the sample and your intended use in 20 minutes.'),
        ],
    },
    5: {
        subject: 'Would a short product review be useful?',
        pre: 'Inspect one issue, discuss the use, and decide on a practical next step.',
        title: 'A defined next step',
        blocks: [
            p('This is the fifth note in this introduction, so here is the plain version of what the conversation would be.'),
            p('In 20 minutes, we inspect one issue, discuss internal research or client-ready publishing, and decide whether there is a practical next step.'),
            link('See the one-page overview and the 20 minute agenda', 'overview'),
            p('If model delivery is the eventual interest, the first discussion would be about a standard update file that your firm reviews and acts on. We do not offer brokerage connectivity or automated execution.'),
            p('You can also simply subscribe and evaluate the research over time.'),
        ],
    },
};

export function renderRia(o: RiaOpts): { subject: string; text: string; html: string; unsubUrl: string; n: number } {
    const n = Math.min(Math.max(o.n, 1), 5);
    const e = RIA_EMAILS[n];
    const step = o.step ?? 20 + n;
    const url = (kind: string, extra = '') => `${o.baseUrl}/r/${o.token}/${kind}?s=${step}${extra}`;
    const unsubUrl = `${o.baseUrl}/u/${o.token}`;
    const first = (o.firstName ?? '').trim();
    const hi = first ? `Hi ${first},` : 'Hi,';
    const subscribe = url('sw'), book = url('mt');
    const subscribeFirst = n <= 2;
    const anchorUrl = (a: string) => url('as', `&a=${a}`);

    const q = SAMPLE_FACTS;
    const excerptHtml = card(`<div style="${F}font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:${C.blue};padding-bottom:8px;">From a quiet-day issue</div>`
        + `<p style="margin:0 0 8px;${F}font-size:14px;line-height:1.6;color:${C.body};"><strong style="color:${C.fg};">Market weather.</strong> The model reads ${esc(q.regime)}, which means uptrend, and its reading did not change.</p>`
        + `<p style="margin:0 0 8px;${F}font-size:14px;line-height:1.6;color:${C.body};"><strong style="color:${C.fg};">Copilot readout.</strong> No change today. The published allocation stays as it was.</p>`
        + `<p style="margin:0;${F}font-size:14px;line-height:1.6;color:${C.body};"><strong style="color:${C.fg};">Turbulence test.</strong> Leveraged ETFs and model-priced options can lose money quickly. The issue says what would change the reading.</p>`, C.blue);
    const recordHtml = card(`<div style="${F}font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:${C.blue};padding-bottom:8px;">The two year simulation</div>`
        + `<p style="margin:0 0 8px;${F}font-size:14px;line-height:1.6;color:${C.body};">${esc(SIM.window)}: QQQ LEAPS ${esc(SIM.leaps)} with a largest decline of ${esc(SIM.leapsDd)}. QQQ buy and hold ${esc(SIM.qqq)} with a largest decline of ${esc(SIM.qqqDd)}.</p>`
        + `<p style="margin:0;${F}font-size:13px;line-height:1.6;color:${C.muted};">${esc(LIMITS)}</p>`, C.blue);

    const H: string[] = [];
    H.push(row(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="${F}font-size:18px;font-weight:800;color:${C.fg};"><a href="${esc(url('h'))}" style="color:${C.fg};text-decoration:none;">TradeMind<span style="color:${C.blue};">.bot</span></a></td><td align="right">${pill('Research for advisers', C.blue, '#121a2e')}</td></tr></table>`) + sp(18));
    H.push(row(`<div style="${F}font-size:26px;font-weight:800;line-height:1.25;color:${C.fg};">${esc(e.title)}</div>`) + sp(16));
    H.push(row(P(hi, 16, C.fg)));
    for (const b of e.blocks) {
        if (b.kind === 'p') H.push(row(P(b.text!)));
        else if (b.kind === 'h') H.push(row(`<p style="margin:6px 0 4px;${F}font-size:15px;font-weight:800;color:${C.fg};">${esc(b.text!)}</p>`));
        else if (b.kind === 'link') H.push(row(`<p style="margin:0 0 14px;${F}font-size:15px;"><a href="${esc(anchorUrl(b.anchor!))}" style="color:${C.blue};text-decoration:underline;font-weight:700;">${esc(b.label!)} &rsaquo;</a></p>`));
        else if (b.kind === 'excerpt') H.push(excerptHtml);
        else if (b.kind === 'record') H.push(recordHtml);
    }
    H.push(row(subscribeFirst ? btnPair(subscribe, 'Subscribe', book, 'Book 20 minutes') : btnPair(book, 'Book 20 minutes', subscribe, 'Subscribe')) + sp(10));
    H.push(row(P(NOBROKER, 13, C.muted)));
    H.push(row(P('Reply to this email or write to me at eric@trademind.bot.', 14, C.body)));
    H.push(row(`<p style="margin:0 0 2px;${F}font-size:15px;color:${C.fg};font-weight:700;">Eric Huang</p><p style="margin:0 0 20px;${F}font-size:13px;color:${C.muted};">Founder, TradeMind &middot; Rules-based QQQ research</p>`));
    H.push(row(`<div style="border-top:1px solid ${C.line};padding-top:14px;${F}font-size:11px;line-height:1.6;color:${C.muted};"><a href="${esc(subscribe)}" style="color:${C.fg};font-weight:700;text-decoration:underline;">Subscribe to the free weekly brief</a><br>You are getting this note at your business address because your firm is listed as an investment professional. <a href="${esc(unsubUrl)}" style="color:${C.muted};text-decoration:underline;">Unsubscribe or snooze</a>.<br>TradeMind publishes educational research. It is not personalized investment advice. All performance shown is hypothetical simulation unless labeled as a virtual account. Options and leveraged ETFs involve substantial risk, including loss of the amount invested.<br><br>${esc(o.mailingAddress)}</div>`));

    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"><title>${esc(e.subject)}</title></head><body style="margin:0;padding:0;background:${C.bg};"><div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(e.pre)}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.bg}" style="background:${C.bg};"><tr><td align="center" style="padding:26px 14px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">${H.join('')}</table></td></tr></table></body></html>`;

    const T: string[] = [hi, '', e.title.toUpperCase(), ''];
    for (const b of e.blocks) {
        if (b.kind === 'p') T.push(b.text!, '');
        else if (b.kind === 'h') T.push(b.text!.toUpperCase());
        else if (b.kind === 'link') T.push(`${b.label}: ${anchorUrl(b.anchor!)}`, '');
        else if (b.kind === 'excerpt') T.push('FROM A QUIET-DAY ISSUE', `Market weather. The model reads ${q.regime}, which means uptrend, and its reading did not change.`, 'Copilot readout. No change today. The published allocation stays as it was.', 'Turbulence test. Leveraged ETFs and model-priced options can lose money quickly. The issue says what would change the reading.', '');
        else if (b.kind === 'record') T.push(`The two year simulation, ${SIM.window}: QQQ LEAPS ${SIM.leaps} with a largest decline of ${SIM.leapsDd}. QQQ buy and hold ${SIM.qqq} with a largest decline of ${SIM.qqqDd}.`, LIMITS, '');
    }
    T.push(...(subscribeFirst ? [`Subscribe: ${subscribe}`, `Book 20 minutes: ${book}`] : [`Book 20 minutes: ${book}`, `Subscribe: ${subscribe}`]), '', NOBROKER, '', 'Eric Huang', 'Founder, TradeMind', '', `Subscribe to the free weekly brief: ${subscribe}`, `Unsubscribe or snooze: ${unsubUrl}`, o.mailingAddress);
    return { subject: e.subject, text: T.join('\n'), html, unsubUrl, n };
}

/** Retail IRA email (sample only, not wired to the sender): there is no IRA field on the retail list. */
export const RETAIL_IRA = {
    subject: 'Before following a strategy in a retirement account',
    pre: 'See the research, the model boundaries, and the questions to ask your broker.',
};
export function renderRetailIra(o: { token: string; firstName: string | null; baseUrl: string; mailingAddress: string; step?: number; stage?: string | null }): { subject: string; text: string; html: string } {
    const step = o.step ?? 21;
    const url = (kind: string) => `${o.baseUrl}/r/${o.token}/${kind}?s=${step}`;
    const unsubUrl = `${o.baseUrl}/u/${o.token}`;
    const hi = o.firstName?.trim() ? `Hi ${o.firstName.trim()},` : 'Hi,';
    const st = o.stage && (STAGE_EMAIL1 as Record<string, unknown>)[o.stage] ? o.stage : null;
    const open = 'If an IRA is part of your investing plan, the account\u2019s features matter as much as the strategy description.';
    const H: string[] = [];
    H.push(row(`<div style="${F}font-size:18px;font-weight:800;color:${C.fg};padding-bottom:16px;">TradeMind<span style="color:${C.blue};">.bot</span></div>`));
    H.push(row(`<div style="${F}font-size:26px;font-weight:800;line-height:1.25;color:${C.fg};">${esc(RETAIL_IRA.subject)}</div>`) + sp(16));
    H.push(row(P(hi, 16, C.fg)), row(P(open)));
    H.push(card(`<div style="${F}font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:${C.blue};padding-bottom:8px;">Four parts, every issue</div>`
        + ['Market weather: the conditions being monitored.', 'Copilot readout: what the model indicates.', 'Flight plan: the published process and current stance.', 'Turbulence test: risks, limitations, and ways the process can disappoint.'].map((t) => P(t, 14)).join(''), C.blue));
    H.push(row(`<p style="margin:0 0 14px;${F}font-size:15px;"><a href="${esc(url('x'))}" style="color:${C.blue};text-decoration:underline;font-weight:700;">Read a complete sample brief &rsaquo;</a></p>`));
    H.push(card(`<div style="${F}font-size:15px;font-weight:800;color:${C.fg};padding-bottom:8px;">Two different strategies</div>`
        + P('QQQ Defensive allocates among QQQ, QLD, TQQQ and SGOV. It includes leveraged ETFs and does not require options permission.', 14)
        + P('QQQ LEAPS uses a long-dated QQQ call and shorter-dated written calls. The exact structure requires the relevant broker permissions. Do not assume that permission to buy calls also permits every short-call structure.', 14)));
    H.push(card(`<div style="${F}font-size:15px;font-weight:800;color:${C.fg};padding-bottom:8px;">Questions to check with your broker</div>`
        + P('What positions does your broker permit in this account? How are the option legs treated? What happens at expiration or assignment? What costs and account restrictions apply?', 14)));
    H.push(row(P('TradeMind does not connect to your broker or place orders. A virtual account is not confirmation that your broker executed a trade. The free weekly brief is a way to inspect the research before considering a paid account.')));
    H.push(row(btnPair(url('sw'), 'Subscribe', url('x'), 'View the sample') + sp(10)));
    H.push(row(P(`${SIM.window}: QQQ LEAPS ${SIM.leaps} with a largest decline of ${SIM.leapsDd}; QQQ buy and hold ${SIM.qqq} with ${SIM.qqqDd}. ${LIMITS}`, 12, C.muted)));
    H.push(row(`<div style="border-top:1px solid ${C.line};padding-top:14px;${F}font-size:11px;line-height:1.6;color:${C.muted};">Eric Huang, TradeMind. <a href="${esc(unsubUrl)}" style="color:${C.muted};text-decoration:underline;">Stop these emails</a>.<br>${esc(NOBROKER)}<br><br>${esc(o.mailingAddress)}</div>`));
    void st;
    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><title>${esc(RETAIL_IRA.subject)}</title></head><body style="margin:0;padding:0;background:${C.bg};"><div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(RETAIL_IRA.pre)}</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.bg}" style="background:${C.bg};"><tr><td align="center" style="padding:26px 14px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">${H.join('')}</table></td></tr></table></body></html>`;
    const text = [hi, '', open, '', 'Four parts, every issue: market weather, copilot readout, flight plan, turbulence test.', `Read a complete sample brief: ${url('x')}`, '', 'QQQ Defensive allocates among QQQ, QLD, TQQQ and SGOV. It includes leveraged ETFs and does not require options permission.', 'QQQ LEAPS uses a long-dated QQQ call and shorter-dated written calls. The exact structure requires the relevant broker permissions.', '', 'Questions to check with your broker: what positions does it permit in this account, how are the option legs treated, what happens at expiration or assignment, and what costs and restrictions apply?', '', 'TradeMind does not connect to your broker or place orders.', '', `Subscribe: ${url('sw')}`, `View the sample: ${url('x')}`, '', `${SIM.window}: QQQ LEAPS ${SIM.leaps}, largest decline ${SIM.leapsDd}; QQQ buy and hold ${SIM.qqq}, largest decline ${SIM.qqqDd}.`, LIMITS, '', 'Eric Huang, TradeMind', `Stop these emails: ${unsubUrl}`, o.mailingAddress].join('\n');
    return { subject: RETAIL_IRA.subject, text, html };
}
