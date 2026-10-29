#!/usr/bin/env node
// Tests for the founding program rules. Run: node scripts/test-program.mjs
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';
import ts from 'typescript';

const out = fs.mkdtempSync(path.join(os.tmpdir(), 'pt-'));
const src = fs.readFileSync(path.join(process.cwd(), 'src/lib/program/rules.ts'), 'utf8');
fs.writeFileSync(path.join(out, 'rules.js'), ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText);
const r = createRequire(path.join(out, 'x.js'))('./rules.js');

let fail = 0;
const t = (n, ok, x = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${ok ? '' : '  ' + x}`); if (!ok) fail++; };
const S = '2026-11-02T14:00:00.000Z';
const at = (d) => r.addDays(S, d);
const st = (o = {}) => ({ started_at: S, completed_months: [], path: 'undecided', founding_selected_at: null, paid_started_at: null, ...o });

t('study is 4 months (120 days)', r.freeAccessEnd(st()) === at(120));
t('one survey earns 3 months', r.freeAccessEnd(st({ completed_months: [1] })) === at(210));
t('two surveys earn 6 months', r.freeAccessEnd(st({ completed_months: [1, 2] })) === at(300));
t('four surveys earn 12 months, 16 months in total', r.freeAccessEnd(st({ completed_months: [1, 2, 3, 4] })) === at(480));
t('credit capped at four surveys', r.freeAccessEnd(st({ completed_months: [1, 2, 3, 4, 5, 6] })) === at(480));
t('same survey counted once', r.freeAccessEnd(st({ completed_months: [1, 1, 1] })) === at(210));
t('leave after 2 months with 2 surveys: 2 months plus 6 months', r.freeAccessEnd(st({ left_at: at(60), completed_months: [1, 2] })) === at(60 + 180));
t('leaving never extends the study past 4 months', r.freeAccessEnd(st({ left_at: at(300), completed_months: [1] })) === at(210));
t('three feedback items pass a month', r.countFeedback(['a real suggestion', 'an issue I hit', 'a question here']) === 3);
t('short or empty items do not count', r.countFeedback(['ok', '', 'a real suggestion']) === 1);
t('reward values', r.rewardUsd('defensive') === 90 && r.rewardUsd('leaps') === 120 && r.rewardUsd('defensive', 4) === 360 && r.rewardUsd('leaps', 4) === 480);
t('seats are 20', r.FIRST_GROUP === 20 && r.WAVE_SIZE_MAX === 20 && r.HARD_LIMIT === 20);

t('during the preview access is open', r.accessNow(st(), at(10)) === 'research_plus_tracking');
t('doing nothing: access ends, no charge', r.accessNow(st(), at(121)) === 'free_weekly');
t('paid member stays paid', r.accessNow(st({ paid_started_at: at(31) }), at(300)) === 'paid');

const keys = (x) => x.map((e) => e.key);
t('welcome email once', keys(r.dueEmails(st(), at(0), new Set())).includes('preview_started') && !keys(r.dueEmails(st(), at(1), new Set(['preview_started']))).includes('preview_started'));
t('first survey opens day 23', r.activityDue(S, 1) === at(23));
t('fourth survey opens day 113', r.activityDue(S, 4) === at(113));
t('survey email on day 23 for everyone not stepped away', keys(r.dueEmails(st(), at(23), new Set(['preview_started']))).includes('activity_due_1'));
t('no activity email after stepping away', !keys(r.dueEmails(st({ path: 'free' }), at(23), new Set(['preview_started']))).some((k) => k.startsWith('activity_due')));
t('activity email stops after grace period', !keys(r.dueEmails(st(), at(23 + 15), new Set(['preview_started']))).includes('activity_due_1'));
t('no fifth survey', !keys(r.dueEmails(st({ completed_months: [1, 2, 3, 4] }), at(150), new Set(['preview_started']))).includes('activity_due_5'));
t('free time ending notice 7 days before', keys(r.dueEmails(st(), at(115), new Set(['preview_started']))).some((k) => k.startsWith('free_time_ending')));
t('no ending notice once paid', !keys(r.dueEmails(st({ paid_started_at: at(20) }), at(115), new Set(['preview_started']))).some((k) => k.startsWith('free_time_ending')));
t('no founding or choice emails any more', !keys(r.dueEmails(st({ path: 'founding' }), at(30), new Set())).some((k) => k === 'founding_ready' || k === 'choice_reminder'));

// Invite copy
const ic = fs.readFileSync(path.join(process.cwd(), 'src/lib/program/invite-copy.ts'), 'utf8');
fs.writeFileSync(path.join(out, 'invite.js'), ts.transpileModule(ic, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText);
const inv = createRequire(path.join(out, 'x.js'))('./invite.js');
const inp = { firstName: 'Sam', applyUrl: 'https://trademind.bot/founding?source=invite', sampleUrl: 'https://trademind.bot/founding/sample', unsubscribeUrl: 'https://trademind.bot/newsletter/unsubscribe?token=x', address: 'ADDR' };
const itxt = inv.inviteText(inp), ihtml = inv.inviteHtml(inp);
const banned = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src/data/banned-phrases.json'), 'utf8'));
t('invite text has no banned phrases', !banned.phrases.some((p) => (itxt + inv.INVITE_SUBJECT).toLowerCase().includes(p)));
t('invite has no dashes', !/[\u2013\u2014]|--/.test(itxt + ihtml + inv.INVITE_SUBJECT));
t('invite says no card and no automatic charge', /No card is needed/.test(itxt) && /Nothing turns into a paid plan automatically/.test(itxt));
t('invite states simulation and own orders', /simulation, not live trading/.test(itxt) && /You place every order yourself/.test(itxt));
t('invite has unsubscribe and address', itxt.includes(inp.unsubscribeUrl) && itxt.includes('ADDR') && ihtml.includes(inp.unsubscribeUrl));
t('invite greets by name or there', /^Hi Sam,/.test(itxt) && /^Hi there,/.test(inv.inviteText({ ...inp, firstName: null })));
// Outreach six-email sequence
for (const f of ['copy-seq6', 'copy-v8', 'copy-ws', 'templates-v5']) {
    const src = fs.readFileSync(path.join(process.cwd(), `src/lib/outreach/${f}.ts`), 'utf8');
    fs.writeFileSync(path.join(out, f + '.js'), ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText);
}
const sq = createRequire(path.join(out, 'x.js'))('./copy-seq6.js');
const so = { token: 'abcdef2345', firstName: 'Sam', baseUrl: 'https://trademind.bot', mailingAddress: 'ADDR', sigSep: '-'.repeat(2), useHtml: true };
const patterns = banned.patterns.map((p) => new RegExp(p.regex, 'i'));
const kinds = { 1: 'p', 2: 'st', 5: 'x', 6: 'qa', 7: 'vf', 8: 'f' };
for (const st of [1, 2, 5, 6, 7, 8]) {
    const m = sq.renderSeq6({ ...so, step: st });
    const all = m.subject + m.text + (m.html || '');
    const lab = `sequence step ${st}`;
    t(`${lab}: no banned phrases or patterns`, !banned.phrases.some((p) => all.toLowerCase().includes(p)) && !patterns.some((r) => r.test(all)));
    t(`${lab}: no dashes`, !/[\u2013\u2014]/.test(all) && !m.subject.includes('--'));
    t(`${lab}: primary tracked link`, m.text.includes(`/r/abcdef2345/${kinds[st]}?s=${st}`) && !!m.html && m.html.includes(`/r/abcdef2345/${kinds[st]}?s=${st}`));
    t(`${lab}: unsubscribe, address, no-broker line`, m.text.includes('/u/abcdef2345') && m.text.includes('ADDR') && /never connects to your broker/.test(m.text) && m.html.includes('/u/abcdef2345'));
    t(`${lab}: trademind.bot link in text and html`, m.text.includes('trademind.bot: https://trademind.bot/r/abcdef2345/h?s=' + st) && />trademind\.bot<\/a>/.test(m.html));
    t(`${lab}: explore row has five other sections`, (m.text.match(/\/r\/abcdef2345\/(br|st|ru|ch|vf|pn)\?/g) || []).length >= 5);
    t(`${lab}: does not say it is the last email`, !/last (email|note|message)|final (email|note)|never (write|email) again/i.test(all));
    t(`${lab}: offer line only in emails 1 to 3`, (st <= 5 && st !== 5 && st !== 6 ? true : true) && (/30% off/.test(m.text) === [1, 2, 5].includes(st)));
}
t('sequence: emails 1 and 2 lead with the 4.6 times and 36% shallower highlight', [1, 2].every((st) => { const x = sq.renderSeq6({ ...so, step: st }); return /two-year simulation, QQQ LEAPS returned about 4\.6 times the percentage return/.test(x.text) && /about 36% shallower/.test(x.html); }));
const m2 = sq.renderSeq6({ ...so, step: 2, visited: ['strategies'] });
t('sequence: quiet link moves to next unseen section after a visit', m2.text.includes('/r/abcdef2345/ru?s=2') && m2.text.indexOf('See rules and plans') > 0);
const mo = sq.renderSeq6({ ...so, step: 5, n: 2 });
t('sequence: re-introduced contacts get email 2 content on step 5', /QQQ LEAPS owns a long-dated/.test(mo.text) && mo.text.includes('/r/abcdef2345/st?s=5'));
const m7 = sq.renderSeq6({ ...so, step: 7, answer: 'c' });
t('sequence: email 5 first line follows the challenge answer', /walked away/.test(m7.text) && /^Hi Sam,\n\nIf you would have walked away/.test(m7.text));
const m6 = sq.renderSeq6({ ...so, step: 6 });
t('sequence: email 4 has three answer links', ['qa', 'qb', 'qc'].every((k) => m6.text.includes(`/r/abcdef2345/${k}?s=6`)));
t('sequence: figures shown with simulation limits', [7, 1, 2].every((st) => { const x = sq.renderSeq6({ ...so, step: st }).text; return /229\.48%/.test(x) ? /simulat/i.test(x) && /hindsight/.test(x) : true; }));

console.log(fail ? `\n${fail} test(s) failed` : '\nAll tests passed');
process.exit(fail ? 1 : 0);
