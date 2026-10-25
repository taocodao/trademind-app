#!/usr/bin/env node
// Tests for the briefing filter, templates and calendar. Run: node scripts/test-briefing.mjs
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';
import ts from 'typescript';

const root = process.cwd();
const out = fs.mkdtempSync(path.join(os.tmpdir(), 'bt-'));
fs.mkdirSync(path.join(out, 'data'), { recursive: true });
fs.mkdirSync(path.join(out, 'briefing'), { recursive: true });
for (const f of ['banned-phrases.json', 'canonical-record.json']) fs.copyFileSync(path.join(root, 'src/data', f), path.join(out, 'data', f));
for (const f of ['calendar', 'types', 'templates', 'filter', 'assemble']) {
    let src = fs.readFileSync(path.join(root, `src/lib/briefing/${f}.ts`), 'utf8').replace(/'@\/data\//g, "'../data/");
    const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, resolveJsonModule: true, esModuleInterop: true } }).outputText;
    fs.writeFileSync(path.join(out, 'briefing', `${f}.js`), js);
}
fs.writeFileSync(path.join(out, 'package.json'), '{"type":"commonjs"}');
const require = createRequire(path.join(out, 'x.js'));
const { assemble } = require('./briefing/assemble.js');
const cal = require('./briefing/calendar.js');
const { runChecks } = require('./briefing/filter.js');
const T = require('./briefing/templates.js');

let fail = 0;
const t = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  ' + extra}`); if (!ok) fail++; };

const defensive = (over = {}) => ({
    strategy: 'TQQQ_TURBOCORE_PRO', display_name: 'QQQ Defensive', status: 'NO_CHANGE', run_verified: true,
    source_signal_id: 'x', as_of: '2026-10-26T19:01:00Z', regime: 'BULL', confidence_pct: 43, qqq_close: 704.83,
    weights: [{ level: 'moderate', items: [{ symbol: 'QQQ', pct: 85 }, { symbol: 'SGOV', pct: 15 }] }],
    previous_weights_differ: false, instructions: [],
    gates: [{ name: 'Market regime', value: 'BULL' }, { name: '200-day average gate', value: 'passed' }, { name: 'Short-term trend signal', value: 'positive' }], ...over,
});
const leaps = (over = {}) => ({
    strategy: 'QQQ_LEAPS', display_name: 'QQQ LEAPS', status: 'NO_CHANGE', run_verified: true, source_signal_id: null, as_of: null,
    regime: null, confidence_pct: null, qqq_close: null, weights: [], previous_weights_differ: null, instructions: [], gates: [], ...over,
});
const facts = (s = [leaps(), defensive()]) => ({ run_id: 'r', run_date: '2026-10-26', record_type: 'live_model', early_close: false, strategies: s, benchmark: { symbol: 'QQQ', close: 704.83 }, engine_note: '', hash: 'h' });
const GOOD = 'The model reads the market regime as {{regime}} with confidence of {{confidence}}, and {{gates_passed}} of {{gates_total}} gates are satisfied. Confidence below the threshold is a reason for patience, not a signal. Quiet days are normal for a rules based process.';

// Calendar
t('weekend is not a market day', !cal.isMarketDay('2026-10-24'));
t('weekday is a market day', cal.isMarketDay('2026-10-26'));
t('Thanksgiving 2026 closed', !cal.isMarketDay('2026-11-26'));
t('day after Thanksgiving is early close', cal.isEarlyClose('2026-11-27') && cal.isMarketDay('2026-11-27'));
t('early close moves schedule 3 hours earlier', cal.schedule('2026-11-27').run === 12 * 60);
t('previous market day skips weekend', cal.previousMarketDay('2026-10-26') === '2026-10-23');

// Happy path
let d = assemble(facts(), 'daily', GOOD);
t('good commentary passes', d.pass && !d.status_only, JSON.stringify(d.checks.filter((c) => !c.pass)));
t('subject says no change', /No change/.test(d.subject));
t('instruction block is first', d.text.startsWith('MODEL INSTRUCTION'));
t('footer mark kept for sending to strip', d.text.includes('[[FOOTER]]'));

// Failed run is never reported as no change
d = assemble(facts([leaps({ status: 'RUN_FAILED', run_verified: false }), defensive()]), 'daily', GOOD);
t('failed run gives technical delay subject', /Technical delay/.test(d.subject) && !/No change/.test(d.subject));
t('failed run line is not no change', /QQQ LEAPS: Technical delay/.test(d.text));
d = assemble(facts([leaps({ status: 'UNVERIFIED', run_verified: false }), defensive()]), 'daily', GOOD);
t('unverified run is not called no change', !/QQQ LEAPS: No change/.test(d.text) && !/No change/.test(d.subject));

// Forced violations hold commentary only
const held = (raw) => assemble(facts(), 'daily', raw);
let h = held('Confidence is {{confidence}} and the fund could reach 45% soon.');
t('digits in commentary are held', h.status_only && h.commentary === null && h.pass);
h = held('Consider buying here because the regime is {{regime}}.');
t('action words are held', h.status_only && h.commentary === null);
h = held('The market will rise tomorrow given {{regime}} conditions.');
t('price predictions are held', h.status_only);
h = held('Calm because of the Fed and {{regime}} conditions.');
t('invented causes are held', h.status_only);
h = held('This is an autopilot approach for {{regime}} markets.');
t('autopilot is held', h.status_only);
h = held('It could compounds to a lot in {{regime}} markets.');
t('compounds to is held', h.status_only);
h = held('A steady approach \u2014 {{regime}} regime.');
t('em dash is held', h.status_only);
h = held('Only ETFs, built to keep the worst fall shallow, in {{regime}} conditions.');
t('Defensive only-ETFs line is held', h.status_only);
h = held('Imagine $1M after a decade in {{regime}} markets.');
t('million claim is held', h.status_only);
t('held issue still has instruction and status', h.text.startsWith('MODEL INSTRUCTION') && /QQQ Defensive: No change/.test(h.text));

// Number check on final text
const f = facts();
let text = T.renderDailyText(f, null).replace('704.83', '799.99');
let c = runChecks({ kind: 'daily', subject: 'TradeMind | No change | Oct 26', text, rawCommentary: null, facts: f });
t('invented number is blocked', c.find((x) => x.name === 'number_match').pass === false);
text = T.renderDailyText(f, null).replace('Keep your current model position.', 'Keep your position. Backtest total return 229%.');
c = runChecks({ kind: 'daily', subject: 'TradeMind | No change | Oct 26', text, rawCommentary: null, facts: f });
t('unlabeled results figure is blocked', c.find((x) => x.name === 'record_labeling').pass === false);
text = T.renderDailyText(f, null).replace('MODEL INSTRUCTION', 'Hello');
c = runChecks({ kind: 'daily', subject: 'x', text, rawCommentary: null, facts: f });
t('instruction not first is blocked', c.find((x) => x.name === 'length_and_order').pass === false);
text = T.renderDailyText(f, null).split('https://trademind.bot/live-record').join('');
c = runChecks({ kind: 'daily', subject: 'x', text, rawCommentary: null, facts: f });
t('missing ledger link is blocked', c.find((x) => x.name === 'ledger_link').pass === false);

// Alert
const chg = facts([leaps(), defensive({ status: 'CHANGE', previous_weights_differ: true, instructions: ['Moderate level model weights: QQQ 85%, SGOV 15%'] })]);
const a = assemble(chg, 'alert', null);
t('alert passes and is short', a.pass && a.text.split(/\s+/).length < 120, JSON.stringify(a.checks.filter((x) => !x.pass)));
t('alert subject names the strategy', /QQQ Defensive: Strategy change/.test(a.subject));

// Style: generated files contain no dashes
for (const x of [d.text, a.text, a.subject]) if (/[\u2013\u2014]|--/.test(x)) { t('no dashes in output', false); }

console.log(fail ? `\n${fail} test(s) failed` : '\nAll tests passed');
process.exit(fail ? 1 : 0);
