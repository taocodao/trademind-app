#!/usr/bin/env node
// Renders the three newsletter editions as review samples (never sends). Output: out/edition-*.html and .json
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os';
import { createRequire } from 'node:module'; import ts from 'typescript';
const root = process.cwd(); const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ed-'));
function mirror(rel) { const d = path.join(root, rel); for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); const o = path.join(tmp, rel, e.name);
    if (e.isDirectory()) { fs.mkdirSync(o, { recursive: true }); mirror(path.join(rel, e.name)); } else if (e.name.endsWith('.ts')) { fs.mkdirSync(path.dirname(o), { recursive: true }); fs.writeFileSync(o.replace(/\.ts$/, '.js'), ts.transpileModule(fs.readFileSync(p, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText); } } }
mirror('src/lib/newsletter'); mirror('src/lib/outreach');
const req = createRequire(path.join(tmp, 'x.js'));
const { renderNewsletter } = req('./src/lib/newsletter/edition-render.js');
const { ISSUES } = req('./src/lib/newsletter/issues.js');
const lesson = ISSUES.find((i) => i.number === 3);
const base = { sample: true, firstName: 'Eric', baseUrl: 'https://trademind.bot', linkToken: '1.SAMPLEsampleSAMPLEsamp', editionDate: '2026-11-02', unsubscribeUrl: 'https://trademind.bot/newsletter/unsubscribe?token=SAMPLE', preferencesUrl: 'https://trademind.bot/newsletter/preferences?token=SAMPLE', mailingAddress: 'TradeMind, 151-58 24th Rd, Whitestone, NY 11357, United States' };
const ctxW = [
    { headline: 'The Fed held, with two votes for a hike', body: 'The Federal Reserve kept its target range at 3.75% to 4.00% in a 10 to 2 vote. Two members preferred a quarter point increase, and the statement said inflation remains elevated.', sourceName: 'PR Newswire via Finviz', sourceUrl: 'https://finviz.com/news/413292/us-index-futures-turn-to-jobs-data-and-treasurys-refunding-after-fridays-346-nasdaq-100-drop' },
    { headline: 'QQQ had its worst month since March 2025', body: 'QQQ fell 6.66% in October, and the Nasdaq-100 dropped 3.46% on Friday alone as several large technology companies reported results.', sourceName: 'Yahoo Finance', sourceUrl: 'https://finance.yahoo.com/markets/stocks/articles/marking-calendar-until-november-3rd-150424721.html' },
    { headline: 'Rate hike odds are the swing factor', body: 'CME FedWatch pricing showed about a 73% likelihood of a Fed hike after the December meeting. Friday\u2019s jobs report feeds that number.', sourceName: 'Yahoo Finance', sourceUrl: 'https://finance.yahoo.com/markets/stocks/articles/stock-market-today-dow-jones-102928620.html' },
];
const ahead = ['Monday, November 2: Apple and Palantir report after the close.', 'Tuesday, November 3: U.S. midterm elections. AMD reports after the close.', 'Friday, November 6: October jobs report at 8:30 AM ET.', 'Tuesday, November 10: October CPI. Nvidia reports November 17.'];
const ctxD = ctxW.slice(1, 3);
const idea = { title: 'Why a defensive model can lag', body: 'A defensive model holds less exposure when its rules say conditions are weaker. If the market keeps rising anyway, that lower exposure lags. The lag is the cost of the same rule that limits declines.', why: 'Knowing the cost of a rule in advance makes it easier to keep following it.' };
const riskD = 'Instructions are published at fixed times. Acting later in the session means acting on information the model did not have.';
const riskW = 'QLD and TQQQ aim for a multiple of one day of QQQ movement. Over longer periods the result can differ from that multiple, and declines can be deep. After a month like October, a sharp move either way is possible when the jobs report lands.';
const cases = {
    'weekly': { kind: 'weekly', dateLabel: 'Monday, November 2, 2026', hook: 'QQQ had its worst month in over a year. Here is what to watch this week.', preheader: 'The Fed, the midterms and the jobs report, plus one lesson on what LEAPS add.', context: ctxW, weekAhead: ahead, idea, risk: riskW, lesson },
    'daily-free': { kind: 'daily_free', dateLabel: 'Tuesday, November 3, 2026', hook: 'A hard October, and what the next few days hold.', preheader: 'One idea and one risk for today.', context: ctxD, idea, risk: riskD },
    'daily-signals-defensive-change': { kind: 'daily_signals', dateLabel: 'Tuesday, November 3, 2026', hook: 'A change was published for your Defensive account.', preheader: 'Your QQQ Defensive instruction for today.', context: ctxD, idea, risk: riskD,
        account: { strategy: 'QQQ Defensive', label: 'Roth IRA at your brokerage', riskLevel: 'moderate', status: 'CHANGE', lines: ['Move to QQQ 60 percent and SGOV 40 percent.', 'Before: QQQ 85 percent and SGOV 15 percent.'] } },
    'daily-signals-leaps-nochange': { kind: 'daily_signals', dateLabel: 'Tuesday, November 3, 2026', hook: 'No change to your LEAPS position today.', preheader: 'Your QQQ LEAPS status for today.', context: ctxD, idea, risk: riskD,
        account: { strategy: 'QQQ LEAPS', label: 'Brokerage account', status: 'NO_CHANGE', lines: ['Keep your current model position. The next review follows the LEAPS schedule.'] } },
    'daily-signals-failed': { kind: 'daily_signals', dateLabel: 'Tuesday, November 3, 2026', hook: 'No new instruction today.', preheader: 'The model run did not complete its data checks.', context: ctxD, idea, risk: riskD,
        account: { strategy: 'QQQ Defensive', label: 'Roth IRA at your brokerage', riskLevel: 'moderate', status: 'FAILED', lines: [] } },
};
fs.mkdirSync(path.join(root, 'out'), { recursive: true }); let bad = 0;
for (const [name, c] of Object.entries(cases)) {
    const r = renderNewsletter({ ...base, ...c });
    const vis = (r.html + r.text).replace(/<[^>]+>/g, ' ').replace(/https?:\/\/\S+/g, '');
    const probs = [];
    if (/[\u2013\u2014]|--/.test(vis)) probs.push('dash');
    if (/!/.test(r.text.replace(/https?:\/\/\S+/g, ''))) probs.push('exclamation');
    if (/confidence|compound quietly|worst fall shallow|guarantee|probability of profit|exposure tier|protect capital|\btier\b|55\.1|14\.5%/i.test(vis)) probs.push('banned phrase');
    if (!r.html.includes('newsletter/unsubscribe')) probs.push('no unsubscribe');
    if (c.kind !== 'daily_signals' && /Your account/.test(r.html)) probs.push('signal block in free edition');
    if (probs.length) { bad++; console.log('FAIL', name, probs.join(', ')); }
    fs.writeFileSync(path.join(root, 'out', `edition-${name}.html`), r.html); fs.writeFileSync(path.join(root, 'out', `edition-${name}.json`), JSON.stringify({ subject: r.subject, text: r.text }));
    console.log('rendered', name, '|', r.subject, '|', Buffer.byteLength(r.html), 'bytes');
}
fs.rmSync(tmp, { recursive: true, force: true }); process.exit(bad ? 1 : 0);
