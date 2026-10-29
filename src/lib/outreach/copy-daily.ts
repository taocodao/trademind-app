/**
 * Free daily brief, newsletter style (draft, not wired into any sender; no daily send stream exists yet).
 * Two views of the same issue: a reader with no strategy plan sees a locked placeholder for the strategy statuses,
 * a reader with a strategy account sees their own account card and that strategy's status (no risk level for now). Same four parts every day.
 */
import { esc, F, C, sp, row, pill, P, btn, btnPair, card, why, statusLine, locked, DISCOUNT, NOBROKER } from './copy-seq7';

export interface DailyAccount {
    label: string;            // e.g. Roth IRA at your brokerage
    strategy: string;         // QQQ Defensive or QQQ LEAPS
}
export interface DailyFacts {
    dateLabel: string; runLabel: string; regime: string;
    trend: 'above' | 'below' | null; trendChanged: boolean | null;
    /** Overall result of the day's model run. FAILED shows the fixed no-instruction wording and nothing else. */
    status: 'NO_CHANGE' | 'CHANGE' | 'FAILED';
    /** What each strategy did today, in plain words, keyed by the strategy display name. */
    strategyStatus: Record<string, string>;
    ideaTitle: string; idea: string; ideaWhy: string;
    risk: string;
    sample: boolean;
}
export const SAMPLE_DAILY: DailyFacts = {
    dateLabel: 'Wednesday, October 28, 2026', runLabel: 'the October 28 3:00 PM ET model run', regime: 'BULL', trend: 'above', trendChanged: false,
    status: 'NO_CHANGE',
    strategyStatus: {
        'QQQ Defensive': 'No change to the published instruction today.',
        'QQQ LEAPS': 'Position held. The next review follows the LEAPS schedule.',
    },
    ideaTitle: 'Why a defensive model can lag',
    idea: 'A defensive model holds less exposure when its rules say conditions are weaker. If the market keeps rising anyway, that lower exposure lags. The lag is the cost of the same rule that limits declines.',
    ideaWhy: 'Knowing the cost of a rule in advance makes it easier to keep following it.',
    risk: 'Instructions are published at fixed times. Acting later in the session means acting on information the model did not have.',
    sample: true,
};
export const SAMPLE_ACCOUNT: DailyAccount = { label: 'Roth IRA at your brokerage', strategy: 'QQQ Defensive' };
export const FAILED_RUN = 'No new instruction today. The model run did not complete its data checks. This is not a confirmation that anything is unchanged.';

export interface DailyOpts {
    /** Signed per-subscriber link token from makeDailyLinkToken (src/lib/newsletter/daily-link.ts). */
    linkToken: string; firstName: string | null; baseUrl: string; mailingAddress: string;
    /** Per-subscriber unsubscribe URL, from makeUnsubscribeToken. */
    unsubscribeUrl: string;
    /** The subscriber's account id, so the account button opens that account. */
    accountId?: number | null;
    /** Edition date, YYYY-MM-DD, recorded with each click. */
    editionDate: string;
    facts?: DailyFacts; account?: DailyAccount | null;
}

const ICON = { weather: '\u2601\uFE0F', readout: '\u{1F9ED}', plan: '\u2708\uFE0F', turb: '\u26A0\uFE0F', acct: '\u{1F464}' };
const title = (t: string) => `<div style="font-size:17px;font-weight:800;color:${C.fg};padding-bottom:8px;">${esc(t)}</div>`;
const gap = '<div style="height:10px;"></div>';

export function renderDaily(o: DailyOpts): { subject: string; text: string; html: string; unsubUrl: string } {
    const f = o.facts ?? SAMPLE_DAILY;
    const a = o.account ?? null;
    const b = o.baseUrl;
    const unsubUrl = o.unsubscribeUrl;
    const link = (kind: string, extra = '') => `${b}/d/${o.linkToken}/${kind}?e=${o.editionDate}${extra}`;
    const plansUrl = link('pl');
    const acctUrl = link('acct', o.accountId ? `&a=${o.accountId}` : '');
    const vaUrl = link('va', a ? '' : '&d=1');
    const simUrl = link('sim');
    const weeklyUrl = link('wk');
    const homeUrl = link('h');
    const hi = (o.firstName ?? '').trim() ? `Hi ${(o.firstName ?? '').trim()},` : 'Hi,';
    const failed = f.status === 'FAILED';
    const myStatus = a ? (failed ? FAILED_RUN : f.strategyStatus[a.strategy] ?? 'Open your account to see today\u2019s published status.') : '';
    const trend = f.trend ? `QQQ is ${f.trend} its 200 day average${f.trendChanged ? ', changed since the last reading.' : ', unchanged since the last reading.'}` : null;
    const oneLine = failed ? FAILED_RUN
        : f.status === 'CHANGE' ? `The Defensive model reads ${f.regime}, and at least one strategy published a change today.`
        : `The Defensive model reads ${f.regime}${f.trend ? f.trendChanged ? ' and its trend reading changed.' : ' and its trend reading did not change.' : ', with no change published today.'}`;
    const subject = failed ? 'Daily brief: no new instruction today'
        : a ? `Your ${a.strategy} account: ${f.status === 'CHANGE' ? 'a change was published' : 'no change today'}`
        : f.status === 'NO_CHANGE' ? 'Daily: no change, and why' : 'Daily: a change was published, and why';

    const chipDefs: Array<[string, string, string, string]> = [
        [ICON.weather, 'Market weather', vaUrl, 'See the live record'],
        [ICON.readout, 'Copilot readout', a ? acctUrl : plansUrl, a ? 'Open your account' : 'See the plans'],
        [ICON.plan, 'Flight plan', simUrl, 'How it is tested'],
        [ICON.turb, 'Turbulence test', weeklyUrl, 'Read the weekly brief'],
    ];
    const chips = chipDefs
        .map(([i, c, u, d]) => `<td valign="top" style="padding:0 6px 6px 0;"><a href="${esc(u)}" style="text-decoration:none;display:block;"><span style="display:inline-block;${F}font-size:12px;font-weight:700;color:${C.fg};border:1px solid ${C.blue};border-radius:8px;padding:6px 10px;background:${C.card};"><span style="font-size:18px;line-height:1;vertical-align:middle;">${i}</span>&nbsp;<span style="vertical-align:middle;">${c}</span></span><span style="display:block;${F}font-size:11px;color:${C.blue};padding:3px 0 0 2px;text-decoration:underline;">${d} &rsaquo;</span></a></td>`).join('');

    const acctCard = a ? card(`${pill(ICON.acct + ' Your account', C.blue, '#121a2e')}${gap}${title(a.strategy)}<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${statusLine(a.label, myStatus, failed ? C.amber : C.green)}</table><div style="height:12px;"></div>${btn(acctUrl, 'Open your virtual account')}`, C.blue) : '';

    const readout = a
        ? P(`Your account follows ${a.strategy}. Today\u2019s published status for it: ${myStatus} Open your account to see the full instruction.`, 14)
        : `${P('The model publishes a status for each strategy every day. It is research, not an instruction for your account.', 14)}${locked('Today\u2019s QQQ Defensive and QQQ LEAPS statuses go to readers with a plan for that strategy. Each plan covers one brokerage account.', plansUrl, 'Subscribe to a strategy')}`;

    const weatherRows = `${statusLine('Defensive model regime', f.regime)}${trend ? statusLine('Trend reading', trend) : ''}`;
    const parts = failed
        ? [acctCard, card(`${pill(ICON.turb + ' Data check')}${gap}${title('No new instruction today')}${P(FAILED_RUN, 14)}`, C.amber)].join('')
        : [
            acctCard,
            card(`${pill(ICON.weather + ' Market weather')}${gap}${title('Regime read')}<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${weatherRows}</table>`),
            card(`${pill(ICON.readout + ' Copilot readout')}${gap}${title('What the model indicates')}${readout}`),
            card(`${pill(ICON.plan + ' Flight plan')}${gap}${title('One idea: ' + f.ideaTitle.charAt(0).toLowerCase() + f.ideaTitle.slice(1))}${P(f.idea, 14)}${why(f.ideaWhy)}`),
            card(`${pill(ICON.turb + ' Turbulence test')}${gap}${title('What could go wrong today')}${P(f.risk, 14)}`),
        ].join('');

    const cta = a
        ? card(`<div style="${F}font-size:16px;font-weight:800;color:${C.fg};padding-bottom:6px;">Check the record</div>${P('The virtual accounts show every published signal, losses included, with a short delay.', 14, C.muted)}${btnPair(vaUrl, 'See the virtual accounts', simUrl, 'Simulation details')}`)
        : card(`<div style="${F}font-size:16px;font-weight:800;color:${C.fg};padding-bottom:6px;">See the full readout for your account</div>${P('A strategy plan adds your account card, the published instruction for your strategy and a virtual account that follows the signals. ' + DISCOUNT, 14, C.muted)}${btnPair(plansUrl, 'Subscribe to a strategy', vaUrl, 'See the virtual accounts')}`, C.green);

    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"><title>${esc(subject)}</title></head><body style="margin:0;padding:0;background:${C.bg};"><div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(oneLine)}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.bg}" style="background:${C.bg};"><tr><td align="center" style="padding:26px 14px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">`
        + row(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="${F}font-size:18px;font-weight:800;color:${C.fg};"><a href="${esc(homeUrl)}" style="color:${C.fg};text-decoration:none;">TradeMind<span style="color:${C.blue};">.bot</span></a><div style="font-size:11px;font-weight:600;padding-top:2px;"><a href="${esc(homeUrl)}" style="color:${C.blue};text-decoration:underline;">Visit TradeMind.bot &rsaquo;</a></div></td><td align="right">${pill('\u2600\uFE0F Daily brief', C.blue, '#121a2e')}</td></tr></table>`) + sp(18)
        + row(`<div style="${F}font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:${C.blue};">${esc(f.dateLabel)}${f.sample ? ' (sample)' : ''}</div><div style="${F}font-size:26px;font-weight:800;line-height:1.25;color:${C.fg};padding:6px 0 4px;">Daily Flight Plan${failed ? '' : `: <span style="color:${C.blue};">${esc(f.regime)}</span>`}</div><div style="${F}font-size:14px;color:${C.body};padding-bottom:6px;">${esc(oneLine)}</div><div style="${F}font-size:13px;color:${C.muted};padding-bottom:12px;">About 2 minutes. Based on ${esc(f.runLabel)}.</div><table role="presentation" cellpadding="0" cellspacing="0"><tr>${chips}</tr></table>`) + sp(14)
        + row(P(hi, 16, C.fg))
        + parts + cta
        + row(P(NOBROKER, 13, C.muted))
        + row(`<p style="margin:0 0 12px;${F}font-size:13px;line-height:1.65;color:${C.muted};">Prefer one email a week? <a href="${esc(weeklyUrl)}" style="color:${C.blue};">Switch to the weekly brief</a>. Reply to this email or write to me at eric@trademind.bot.</p>`)
        + row(`<p style="margin:0 0 2px;${F}font-size:15px;color:${C.fg};font-weight:700;">Eric Huang</p><p style="margin:0 0 20px;${F}font-size:13px;color:${C.muted};">Founder, TradeMind &middot; Queens, New York</p>`)
        + row(`<div style="border-top:1px solid ${C.line};padding-top:14px;${F}font-size:11px;line-height:1.6;color:${C.muted};">You are getting this because you subscribed to the free TradeMind daily brief. <a href="${esc(unsubUrl)}" style="color:${C.muted};text-decoration:underline;">Unsubscribe or snooze</a>.<br>TradeMind publishes educational research for self-directed investors. It is not personalized investment advice. Options and leveraged ETFs involve substantial risk, including loss of the amount invested.<br><br>${esc(o.mailingAddress)}</div>`)
        + '</table></td></tr></table></body></html>';

    const T = [hi, '', `DAILY FLIGHT PLAN${failed ? '' : `: ${f.regime}`}${f.sample ? ' (SAMPLE)' : ''}`, f.dateLabel, oneLine, '',
        ...(a ? [`YOUR ACCOUNT: ${a.strategy} (${a.label})`, myStatus, `Open your virtual account: ${acctUrl}`, ''] : []),
        ...(failed ? [] : [
            `MARKET WEATHER: regime ${f.regime}.${trend ? ' ' + trend : ''}`,
            a ? `COPILOT READOUT: your account follows ${a.strategy}. Open your account for the full published instruction.` : `COPILOT READOUT: the status for each strategy goes to plan members. Subscribe to a strategy: ${plansUrl}`,
            `FLIGHT PLAN: ${f.ideaTitle}. ${f.idea}`, `Why it matters: ${f.ideaWhy}`,
            `TURBULENCE TEST: ${f.risk}`, '']),
        `Virtual accounts: ${vaUrl}`, ...(a ? [`Simulation details: ${simUrl}`] : [`Subscribe to a strategy: ${plansUrl}`, DISCOUNT]), '',
        NOBROKER, `Switch to the weekly brief: ${weeklyUrl}`, '', 'Eric Huang', 'Founder, TradeMind', '',
        `Unsubscribe or snooze: ${unsubUrl}`, o.mailingAddress, 'Educational research, not personalized investment advice. Investing involves risk, including loss.'];
    return { subject, text: T.join('\n'), html, unsubUrl };
}
