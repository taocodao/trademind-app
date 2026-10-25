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

t('preview is 30 days', r.freeAccessEnd(st()) === at(30));
t('partner credit: 2 activities gives 90 days', r.freeAccessEnd(st({ path: 'partner', completed_months: [1, 2] })) === at(90));
t('free time capped at six months', r.freeAccessEnd(st({ path: 'partner', completed_months: [1, 2, 3, 4, 5, 6] })) === at(180));
t('same month counted once', r.freeAccessEnd(st({ path: 'partner', completed_months: [1, 1, 1] })) === at(60));
t('undecided person earns no credit', r.freeAccessEnd(st({ completed_months: [1, 2] })) === at(30));

t('during preview access is Research plus Tracking', r.accessNow(st(), at(10)) === 'research_plus_tracking');
t('doing nothing: access ends as Free Weekly', r.accessNow(st(), at(31)) === 'free_weekly');
t('paid member stays paid', r.accessNow(st({ paid_started_at: at(31) }), at(300)) === 'paid');

t('billing never starts before free access ends', r.billingStart(st({ path: 'founding', completed_months: [1] })) >= r.freeAccessEnd(st({ path: 'founding', completed_months: [1] })));
t('founding at day 10 with no credit bills from day 30', r.billingStart(st({ path: 'founding' })) === at(30));
t('partner who switches keeps earned days', r.billingStart(st({ path: 'founding', completed_months: [1, 2] })) === at(90));

t('founding discounts give exact founding prices',
    ['research', 'tracking'].every((l) => ['month', 'year'].every((i) => r.PRICES[l][i] - r.foundingDiscount(l, i) === r.PRICES[l].founding[i])));
t('founding prices are 19, 34, 190, 340',
    r.PRICES.research.founding.month === 19 && r.PRICES.tracking.founding.month === 34 && r.PRICES.research.founding.year === 190 && r.PRICES.tracking.founding.year === 340);
t('discount amounts are 10, 15, 100, 150', r.foundingDiscount('research', 'month') === 10 && r.foundingDiscount('tracking', 'month') === 15 && r.foundingDiscount('research', 'year') === 100 && r.foundingDiscount('tracking', 'year') === 150);

const keys = (x) => x.map((e) => e.key);
t('welcome email once', keys(r.dueEmails(st(), at(0), new Set())).includes('preview_started') && !keys(r.dueEmails(st(), at(1), new Set(['preview_started']))).includes('preview_started'));
t('day 23 choice reminder for undecided', keys(r.dueEmails(st(), at(23), new Set(['preview_started']))).includes('choice_reminder'));
t('no choice reminder on day 22', !keys(r.dueEmails(st(), at(22), new Set(['preview_started']))).includes('choice_reminder'));
t('no choice reminder once a path is chosen', !keys(r.dueEmails(st({ path: 'partner' }), at(24), new Set(['preview_started']))).includes('choice_reminder'));
t('reminder not repeated', !keys(r.dueEmails(st(), at(24), new Set(['preview_started', 'choice_reminder']))).includes('choice_reminder'));
t('first activity opens day 7', r.activityDue(S, 1) === at(7));
t('activity email for partner on day 7', keys(r.dueEmails(st({ path: 'partner' }), at(7), new Set(['preview_started']))).includes('activity_due_1'));
t('no activity email for undecided', !keys(r.dueEmails(st(), at(7), new Set(['preview_started']))).some((k) => k.startsWith('activity_due')));
t('activity email stops after grace period', !keys(r.dueEmails(st({ path: 'partner' }), at(7 + 15), new Set(['preview_started']))).includes('activity_due_1'));
t('free time ending notice 7 days before', keys(r.dueEmails(st({ path: 'partner' }), at(23), new Set(['preview_started']))).some((k) => k.startsWith('free_time_ending')));
t('founding checkout email not before free access ends', !keys(r.dueEmails(st({ path: 'founding' }), at(29), new Set(['preview_started']))).includes('founding_ready'));
t('founding checkout email at the end', keys(r.dueEmails(st({ path: 'founding' }), at(30), new Set(['preview_started']))).includes('founding_ready'));
t('no founding email once paid', !keys(r.dueEmails(st({ path: 'founding', paid_started_at: at(30) }), at(31), new Set(['preview_started']))).includes('founding_ready'));
t('limits', r.FIRST_GROUP === 30 && r.WAVE_SIZE_MAX === 50 && r.HARD_LIMIT === 200);

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
// Outreach program message
for (const f of ['copy-prog', 'templates-v5']) {
    const src = fs.readFileSync(path.join(process.cwd(), `src/lib/outreach/${f}.ts`), 'utf8');
    fs.writeFileSync(path.join(out, f + '.js'), ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText);
}
const cp = createRequire(path.join(out, 'x.js'))('./copy-prog.js');
const po = { token: 'abcDEF123456', firstName: 'Sam', baseUrl: 'https://trademind.bot', mailingAddress: 'ADDR', sigSep: '-'.repeat(2), useHtml: true };
for (const st of [undefined, 2, 5, 7]) {
    const m = cp.renderProg({ ...po, step: st });
    const all = m.subject + m.text + (m.html || '');
    t(`outreach program step ${st ?? 1}: no banned phrases`, !banned.phrases.some((p) => all.toLowerCase().includes(p)));
    t(`outreach program step ${st ?? 1}: no dashes`, !/[\u2013\u2014]/.test(all) && !m.subject.includes('--'));
    t(`outreach program step ${st ?? 1}: tracked links and unsubscribe`, m.text.includes('/r/abcDEF123456/f') && m.text.includes('/r/abcDEF123456/x') && m.text.includes('/u/abcDEF123456') && !!m.html && m.html.includes('/u/abcDEF123456'));
    t(`outreach program step ${st ?? 1}: address and simulation line`, m.text.includes('ADDR') && /simulation, not live trading/.test(m.text));
}

console.log(fail ? `\n${fail} test(s) failed` : '\nAll tests passed');
process.exit(fail ? 1 : 0);
