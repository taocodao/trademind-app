#!/usr/bin/env node
// Tests for adviser outreach v2: segments, prompts, automatic checks, fallback, stored body and render. Run: node scripts/test-cxgen.mjs
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import { createRequire } from 'node:module'; import ts from 'typescript';
const root = process.cwd(); const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cxg-'));
for (const f of ['cx-copy', 'cx-gen']) fs.writeFileSync(path.join(tmp, f + '.js'), ts.transpileModule(fs.readFileSync(path.join(root, `src/lib/outreach/${f}.ts`), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText);
const req = createRequire(path.join(tmp, 'x.js'));
const G = req(path.join(tmp, 'cx-gen.js')); const C = req(path.join(tmp, 'cx-copy.js'));
let fail = 0; const t = (n, c, d = '') => { if (!c) { fail++; console.log('FAIL', n, d); } else console.log('PASS', n); };
const base = { token: 'abcdefghij', email: 'a@b.com', firstName: 'Dana', title: 'Founder', firm: 'Birchwood Financial Partners', firmKey: 'birchwood.com', cityState: 'Austin, TX', employees: '12', keywords: 'retirement income', websiteText: 'We help families plan retirement income and manage investments in house for our clients.', linkedinText: '', segment: 'owner', arm: 'B' };
const A = { ...base, arm: 'A' };
t('segment owner', G.segmentOf({ title: 'Managing Partner', employees: '12', firmKey: 'x.com' }) === 'owner');
t('segment vp not owner', G.segmentOf({ title: 'Vice President', employees: '12', firmKey: 'x.com' }) === 'adviser');
t('segment large by size', G.segmentOf({ title: 'Founder', employees: '800', firmKey: 'x.com' }) === 'large_firm');
t('segment large by domain', G.segmentOf({ title: 'Founder', employees: '5', firmKey: 'edwardjones.com' }) === 'large_firm');
t('segment unknown size is adviser', G.segmentOf({ title: 'Founder', employees: '', firmKey: 'x.com' }) === 'adviser');
const end1 = G.subjectEnding(base.token, 'Dana', 1);
t('subject ending is from the list', G.SUBJECT_ENDINGS_1.includes(end1));
const model = (o) => JSON.stringify({ email_id: '1', subject: '', greeting: 'Hi Dana,', body_paragraphs: o.p, facts_used: o.f ?? [], personalization_level: o.l ?? 'website', word_count: 0 });
const p1 = 'When a client asks about retirement income, a second read on QQQ can help.';
const fact = [{ fact: 'retirement income', source_field: 'website_text', snippet: 'We help families plan retirement income' }];
const e1B = model({ p: [p1, G.E1_P2, G.E1_P3, 'Would you be open to reviewing the sample research? [[LINK]]'], f: fact });
let r = G.finishEmail(1, e1B, base, end1, []);
t('good email 1 arm B passes', !!r.email, r.problems.join('; '));
t('email 1 word count in range', r.email && r.email.words >= 70 && r.email.words <= 100, String(r.email?.words));
r = G.finishEmail(1, e1B, A, end1, []);
t('arm A rejects a link', !r.email && r.problems.some((x) => x.includes('arm A')));
const e1A = model({ p: [p1, G.E1_P2, G.E1_P3, G.ctaA(A.token)], f: fact });
r = G.finishEmail(1, e1A, A, end1, []);
t('good email 1 arm A passes', !!r.email, r.problems.join('; '));
r = G.finishEmail(1, model({ p: [p1 + ' This one is guaranteed.', G.E1_P2, G.E1_P3, G.ctaA(A.token)], f: fact }), A, end1, []);
t('banned word caught', !r.email && r.problems.some((x) => x.includes('guarantee')));
r = G.finishEmail(1, model({ p: [p1, G.E1_P2, G.E1_P3, G.ctaA(A.token)], f: [{ fact: 'x', source_field: 'website_text', snippet: 'we run hedge funds' }] }), A, end1, []);
t('invented snippet caught', !r.email && r.problems.some((x) => x.includes('snippet not found')));
r = G.finishEmail(1, model({ p: ['When a client asks about retirement income, a second read on QQQ can help \u2014 really.', G.E1_P2, G.E1_P3, G.ctaA(A.token)], f: fact }), A, end1, []);
t('dash caught', !r.email && r.problems.some((x) => x.includes('dash')));
r = G.finishEmail(1, model({ p: [p1, G.E1_P2, G.E1_P3, 'Open to it? Or not?'], f: fact }), A, end1, []);
t('two questions caught', !r.email && r.problems.some((x) => x.includes('question mark')));
r = G.finishEmail(1, model({ p: [p1 + ' It returned 55% last year.', G.E1_P2, G.E1_P3, G.ctaA(A.token)], f: fact }), A, end1, []);
t('figure caught', !r.email);
r = G.finishEmail(1, 'not json', A, end1, []);
t('bad json caught', !r.email && r.problems[0] === 'not valid JSON');
// email 2
const e2 = (o) => model({ p: o });
r = G.finishEmail(2, e2(['The reason I asked: the drop and the limits matter more than the gain.', '[[SIM_SENTENCE]] [[LIMITS_SENTENCE]]', 'Worth a look at the methodology? [[LINK]]']), base, '', ['x']);
t('good email 2 arm B passes', !!r.email, r.problems.join('; '));
t('email 2 stored body carries the exact fixed text and a link token', r.email && G.storedBody(r.email, 'SIM').includes(G.SIM_SENTENCE + ' ' + G.LIMITS_SENTENCE) && G.storedBody(r.email, 'SIM').includes('{{SIM}}'));
r = G.finishEmail(2, e2(['The reason I asked: the drop and the limits matter more than the gain.', '[[LIMITS_SENTENCE]] [[SIM_SENTENCE]]', 'Worth a look at the methodology? [[LINK]]']), base, '', []);
t('email 2 tokens must be in order', !r.email);
r = G.finishEmail(3, model({ p: ['You do not have to take this on trust.', 'Two virtual accounts have followed the signals since mid October 2026, shown with a five day delay, not real money.', '[[SIM_SENTENCE]] [[LIMITS_SENTENCE]]', 'Open to getting the weekly brief? [[LINK]]'] }), base, G.SUBJECT_ENDING_3, []);
t('sim tokens outside email 2 rejected', !r.email);
r = G.finishEmail(3, model({ p: ['You do not have to take this on trust.', 'Two virtual accounts have followed the signals since mid October 2026, shown with a five day delay. They are not real money.', '[[ML_SENTENCE]]', 'Open to getting the weekly brief? [[LINK]]'] }), base, G.SUBJECT_ENDING_3, []);
t('good email 3 passes', !!r.email, r.problems.join('; '));
r = G.finishEmail(4, model({ p: ['The sample and the weekly brief stay open to advisers if a second read on QQQ helps later.', 'Here they are if useful: [[LINK]] Should I close your file?'] }), base, '', []);
t('good email 4 passes', !!r.email, r.problems.join('; '));
r = G.finishEmail(4, model({ p: ['I will stop writing about this for now.', 'The sample and the weekly brief stay open to advisers if a second read on QQQ helps later.', 'Should I send them, or close your file?'] }), A, '', []);
t('email 4 may not say stop writing', !r.email);
// fallback emails pass the same checks for both arms and every email
for (const arm of ['A', 'B']) for (const id of [1, 2, 3, 4]) {
  const inp = { ...base, arm }; const end = id === 3 ? G.SUBJECT_ENDING_3 : end1; const fb = G.fallbackEmail(id, inp, end);
  const probs = G.checkEmail({ ...fb, level: 'none' }, inp, end, []);
  t(`fallback email ${id} arm ${arm} passes`, probs.length === 0, probs.join('; '));
}
// stored body and render
const fb1 = G.fallbackEmail(1, base, end1); const stored = G.storedBody(fb1, 'ADV');
t('stored body has greeting and one link token', stored.startsWith('Hi Dana,') && (stored.match(/\{\{ADV\}\}/g) || []).length === 1);
const h = C.renderCx({ step: 1, subject: fb1.subject, body: stored }, { token: 'tok1234567', linkBase: 'https://go.vochat.ai', unsubUrl: 'u', mailingAddress: 'ADDR', html: true });
t('v2 render links to the adviser sample on the sending domain', h.html.includes('href="https://go.vochat.ai/r/tok1234567/as?s=1"') && h.text.includes('https://go.vochat.ai/r/tok1234567/as?s=1') && !h.text.includes('Sample page:') && !/trademind\.bot|\{\{/.test(h.html + h.text));
const fbA = G.fallbackEmail(1, A, end1); const hA = C.renderCx({ step: 1, subject: fbA.subject, body: G.storedBody(fbA, 'ADV') }, { token: 'tok1234567', linkBase: 'https://go.vochat.ai', unsubUrl: 'u', mailingAddress: 'ADDR', html: true });
t('arm A render has no link at all', !/https?:\/\//.test(hA.html + hA.text) && !hA.html.includes('<a '));
t('prompts mention the arm rule', G.userPrompt(1, base, [], end1).includes('[[LINK]]') && !G.userPrompt(1, A, [], end1).includes('[[LINK]]'));
console.log(fail ? `${fail} FAILED` : 'ALL PASSED'); process.exit(fail ? 1 : 0);
