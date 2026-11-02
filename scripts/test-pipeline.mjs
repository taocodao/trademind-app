#!/usr/bin/env node
// Tests for the newsletter pipeline: writer validation, account blocks, no leak between editions. Run: node scripts/test-pipeline.mjs
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import Module from 'node:module';
import { createRequire } from 'node:module'; import ts from 'typescript';
const root = process.cwd(); const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pl-'));
function mirror(rel) { const d = path.join(root, rel); for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); const o = path.join(tmp, rel, e.name);
    if (e.isDirectory()) { fs.mkdirSync(o, { recursive: true }); mirror(path.join(rel, e.name)); }
    else if (e.name.endsWith('.ts') || e.name.endsWith('.tsx')) { fs.mkdirSync(path.dirname(o), { recursive: true }); fs.writeFileSync(o.replace(/\.tsx?$/, '.js'), ts.transpileModule(fs.readFileSync(p, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText); }
    else if (e.name.endsWith('.json')) { fs.mkdirSync(path.dirname(o), { recursive: true }); fs.copyFileSync(p, o); } } }
mirror('src/lib'); mirror('src/data');
const stub = path.join(tmp, 'stub-db.js'); fs.writeFileSync(stub, 'module.exports = { query: async () => ({ rows: [], rowCount: 0 }), default: { query: async () => ({ rows: [], rowCount: 0 }) } };');
const orig = Module._resolveFilename;
Module._resolveFilename = function (req, ...a) { if (req === '@/lib/db') return stub; if (req.startsWith('@/')) req = path.join(tmp, 'src', req.slice(2)); return orig.call(this, req, ...a); };
const req = createRequire(path.join(tmp, 'x.js'));
const { validateWritten } = req(path.join(tmp, 'src/lib/newsletter/pipeline/sources.js'));
const { accountBlock } = req(path.join(tmp, 'src/lib/newsletter/pipeline/send.js'));
const { renderNewsletter } = req(path.join(tmp, 'src/lib/newsletter/edition-render.js'));
const { checkEdition } = req(path.join(tmp, 'src/lib/newsletter/pipeline/build.js'));
let fail = 0; const t = (n, c, d = '') => { if (!c) { fail++; console.log('FAIL', n, d); } else console.log('PASS', n); };

const hits = [
    { title: 'Fed holds rates', url: 'https://example.com/a', snippet: 'The Federal Reserve kept its target range at 3.75% to 4.00% in a 10 to 2 vote on October 28. Two members preferred a quarter point increase.', date: '2026-10-29' },
    { title: 'QQQ month', url: 'https://example.org/b', snippet: 'QQQ fell 6.66% in October, its worst month since March 2025. The jobs report is due on November 6.', date: '2026-11-02' },
    { title: 'Week ahead', url: 'https://example.net/c', snippet: 'Apple reports on Monday, November 2. The October jobs report arrives on Friday, November 6.', date: '2026-11-02' },
];
const good = { hook: 'The Fed held and QQQ had a hard October.', preheader: 'What moved and what is next.', items: [
    { headline: 'The Fed held', body: 'The Federal Reserve kept its target range at 3.75% to 4.00% in a 10 to 2 vote, with two members preferring a quarter point increase.', source: 1 },
    { headline: 'A hard month for QQQ', body: 'QQQ fell 6.66% in October, which the source calls its worst month since March 2025, with the jobs report due soon after.', source: 2 }],
    week_ahead: [{ text: 'Friday, November 6: October jobs report.', source: 3 }] };
const v = validateWritten(good, hits);
t('good output has no problems', v.problems.length === 0, v.problems.join('; '));
t('items carry source host', v.context[0].sourceName === 'example.com' && v.context[1].sourceUrl === 'https://example.org/b');
const bad = (mut) => validateWritten(mut(JSON.parse(JSON.stringify(good))), hits).problems.join(' ');
t('invented number rejected', /numbers not in source/.test(bad((g) => { g.items[0].body += ' It was 4.25% before.'; return g; })));
t('wrong source for a number rejected', /numbers not in source/.test(bad((g) => { g.items[0].source = 2; return g; })));
t('unknown source rejected', /not in results/.test(bad((g) => { g.items[1].source = 9; return g; })));
t('price rejected', /price or level/.test(bad((g) => { g.items[1].body += ' It closed at $696.'; return g; })));
t('advice word rejected', /action or advice/.test(bad((g) => { g.items[1].body += ' Readers should sell.'; return g; })));
t('dash rejected', /dash/.test(bad((g) => { g.items[0].headline = 'The Fed held \u2014 again'; return g; })));
t('too few items rejected', /usable items/.test(bad((g) => { g.items = g.items.slice(0, 1); return g; })));

const def = (status, weights, prev) => ({ strategy: 'TQQQ_TURBOCORE_PRO', display_name: 'QQQ Defensive', status, run_verified: status !== 'RUN_FAILED', weights, previous_weights: prev, instructions: [] });
const leaps = (status) => ({ strategy: 'QQQ_LEAPS', display_name: 'QQQ LEAPS', status, run_verified: status !== 'UNVERIFIED', weights: [], previous_weights: [], instructions: [] });
const W = (q, s) => [{ level: 'moderate', items: [{ symbol: 'QQQ', pct: q }, { symbol: 'SGOV', pct: s }] }];
const facts = (d, l) => ({ strategies: [l, d] });
const acct = { name: 'Roth IRA', strategy: 'TQQQ_TURBOCORE_PRO', riskLevel: 'moderate' };
let b = accountBlock(facts(def('CHANGE', W(60, 40), W(85, 15)), leaps('NO_CHANGE')), acct);
t('defensive change shows move and before', b.status === 'CHANGE' && b.lines[0] === 'Move to QQQ 60%, SGOV 40%.' && b.lines[1] === 'Before: QQQ 85%, SGOV 15%.', JSON.stringify(b));
b = accountBlock(facts(def('NO_CHANGE', W(85, 15), W(85, 15)), leaps('NO_CHANGE')), acct);
t('defensive no change keeps position', b.status === 'NO_CHANGE' && /Keep your current model position: QQQ 85%/.test(b.lines[0]));
b = accountBlock(facts(def('RUN_FAILED', [], []), leaps('NO_CHANGE')), acct);
t('failed run uses failed status', b.status === 'FAILED' && b.lines.length === 0);
b = accountBlock(facts(def('NO_CHANGE', W(85, 15), W(85, 15)), leaps('UNVERIFIED')), { name: 'Brokerage', strategy: 'QQQ_LEAPS', riskLevel: null });
t('unverified LEAPS is not called no change', b.status === 'FAILED');
b = accountBlock(facts(def('NO_CHANGE', W(85, 15), W(85, 15)), leaps('NO_CHANGE')), { ...acct, riskLevel: 'aggressive' });
t('unknown risk level never invents weights', /Open your account/.test(b.lines[0]));

// No leak: a free edition has no account block, and a Subscribe card never says whether the strategy changed.
const base = { sample: false, dateLabel: 'Tuesday, November 3, 2026', hook: 'Hook', preheader: 'Pre', context: v.context, weekAhead: [], idea: { title: 'Idea', body: 'Body.', why: 'Why.' }, risk: 'Risk.', firstName: null, baseUrl: 'https://trademind.bot', linkToken: 'T', editionDate: '2026-11-03', unsubscribeUrl: 'https://trademind.bot/u', preferencesUrl: 'https://trademind.bot/p', mailingAddress: 'TradeMind, Whitestone' };
const free = renderNewsletter({ ...base, kind: 'daily_free' });
t('free daily has no account block', !/Your account/.test(free.html + free.text));
const sig = renderNewsletter({ ...base, kind: 'daily_signals', account: accountBlock(facts(def('CHANGE', W(60, 40), W(85, 15)), leaps('CHANGE')), acct) });
const leapsPart = sig.text.split('\n').filter((l) => /LEAPS/i.test(l)).join(' ');
t('LEAPS placeholder for a Defensive reader is generic', /not on your plan/.test(leapsPart) && !/chang|move|position/i.test(leapsPart), leapsPart);
t('signals email has exactly one account block', (sig.html.match(/Your account/g) || []).length === 1);
const chk = checkEdition(free.subject, free.text, free.html, [], { context: v.context });
t('good edition passes checks', chk.every((c) => c.pass), JSON.stringify(chk.filter((c) => !c.pass)));
const dirty = checkEdition('Subject', 'Text with confidence and 55.1% CAGR. TODO unsubscribe', 'unsubscribe', [], { context: v.context });
t('banned and retired claims fail checks', !dirty.every((c) => c.pass));
fs.rmSync(tmp, { recursive: true, force: true }); console.log(fail ? `\n${fail} failed` : '\nAll tests passed'); process.exit(fail ? 1 : 0);
