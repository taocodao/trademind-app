#!/usr/bin/env node
// Tests for the Consulti adviser outreach copy: hooks, drafts, checker, rendering. Run: node scripts/test-cx.mjs [optional-list.xlsx|csv]
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import { createRequire } from 'node:module'; import ts from 'typescript';
const root = process.cwd(); const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cx-'));
const src = fs.readFileSync(path.join(root, 'src/lib/outreach/cx-copy.ts'), 'utf8');
fs.writeFileSync(path.join(tmp, 'cx-copy.js'), ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText);
const { buildProfile, buildDrafts, renderCx, checkDraft, cleanFirm, cleanFirst, rootDomain } = createRequire(path.join(tmp, 'x.js'))(path.join(tmp, 'cx-copy.js'));
let fail = 0; const t = (n, c, d = '') => { if (!c) { fail++; console.log('FAIL', n, d); } else console.log('PASS', n); };

t('firm suffix removed', cleanFirm('Elliott Wealth Management Services, Llc') === 'Elliott Wealth Management Services');
t('bad first name dropped', cleanFirst('Name') === '' && cleanFirst('none') === '' && cleanFirst('aaron') === 'Aaron');
t('root domain', rootDomain('https://www.elliottwealth.com/about') === 'elliottwealth.com');

const rows = [
  { email: 'ccalandra@elliottwealth.com', first_name: 'Christopher', job_title: 'Managing Partner', company_name: 'Elliott Wealth Management Services, Llc', website: 'http://www.elliottwealth.com', keywords: 'podcast;retirement income planning' },
  { email: 'a@gaborfs.com', first_name: 'Aaron', job_title: 'Vice President - Advisor Development', company_name: 'Gabor Financial Solutions', website: 'https://gaborfs.com', keywords: 'retirement income planning;wealth management' },
  { email: 'b@gaborfs.com', first_name: 'Name', job_title: 'Advisor', company_name: 'GABOR FINANCIAL SOLUTIONS LLC', website: 'https://gaborfs.com', keywords: 'insurance' },
  { email: 'c@gmail.com', first_name: 'Mario', job_title: 'Owner', company_name: 'Rossi Advisors', website: 'https://rossi.com', keywords: '' },
  { email: 'd@other.com', first_name: 'Dee', job_title: 'Founder', company_name: 'Dee Capital', website: 'https://dee.com', keywords: 'investment management' },
];
if (process.argv[2]) {
  const f = process.argv[2];
  if (/\.xlsx$/i.test(f)) { const { readSheet } = await import(path.join(root, 'node_modules/read-excel-file/universal/index.js')); const b = fs.readFileSync(f); const g = await readSheet(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)); const h = g[0]; rows.length = 0; for (const r of g.slice(1)) { const o = {}; h.forEach((k, i) => { o[k] = r[i] == null ? '' : String(r[i]); }); rows.push(o); } }
}
const hooks = {}; let bad = 0;
for (const r of rows) {
  const p = buildProfile(r); const ds = buildDrafts(p, 'abcdefghij'); hooks[p.hookId] = (hooks[p.hookId] || 0) + 1;
  const errs = ds.flatMap((d) => d.errors); if (errs.length) { bad++; console.log('  errors', r.email, errs); }
  for (const d of ds) { const m = renderCx(d, { token: 'abcdefghij', linkBase: 'https://trademind.bot', unsubUrl: 'https://trademind.bot/u/abcdefghij', mailingAddress: 'ADDR' }); if (/\{\{|undefined|[\u2013\u2014]|--/.test(m.text + m.subject)) { bad++; console.log('  render problem', r.email, d.step); } }
}
t('all sample drafts pass the checker', bad === 0, `${bad} problems`);
console.log('hooks', hooks);
const p0 = buildProfile(rows[0]); const d0 = buildDrafts(p0, 'tok1234567');
t('podcast hook used', p0.hookId === 'podcast');
t('E1 has home link and ask', d0[0].body.includes('{{HOME}}') && /\?$/.test(d0[0].body));
t('E2 simulation, E3 va and subscribe, E4 meeting and study', d0[1].body.includes('{{SIM}}') && d0[2].body.includes('{{VA}}') && d0[2].body.includes('{{SUB}}') && d0[3].body.includes('{{CAL}}') && d0[3].body.includes('{{STUDY}}'));
const m = renderCx(d0[3], { token: 'tok1234567', linkBase: 'https://trademind.bot', unsubUrl: 'https://trademind.bot/u/tok1234567', mailingAddress: 'ADDR' }).text;
t('rendered links use tracked kinds', m.includes('/r/tok1234567/cal?s=4') && m.includes('/r/tok1234567/f?s=4') && m.includes('/u/tok1234567'));
t('mismatched email gets generic hook', buildProfile(rows[3]).hookId === 'generic');
t('blank first name greets Hello', buildDrafts(buildProfile(rows[2]), 'x1234567890')[0].body.startsWith('Hello,'));
t('checker catches banned word', checkDraft({ step: 2, subject: 'what can go wrong', body: 'Hi A,\n\nThis is the last note about confidence in the model and what could go wrong in the simulation page today {{SIM}} please tell me whether it looks wrong to you?', words: 30, errors: [] }).length >= 2);
t('checker catches third link', checkDraft({ step: 3, subject: 'two virtual accounts', body: 'Hi A,\n\n{{VA}} {{SUB}} {{HOME}} a b c d e f g h i j k l m n o p q r s t', words: 25, errors: [] }).some((e) => e.includes('links')));
console.log(fail ? `${fail} FAILED` : 'ALL PASSED'); process.exit(fail ? 1 : 0);
