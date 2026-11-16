#!/usr/bin/env node
// Tests for adviser outreach v5: fixed text, enrichment checks, assembly, follow up choice. Run: node scripts/test-cxv5.mjs
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import { createRequire } from 'node:module'; import ts from 'typescript';
const root = process.cwd(); const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cx5-'));
for (const f of ['cx-copy', 'cx-gen', 'cx-v5']) fs.writeFileSync(path.join(tmp, f + '.js'), ts.transpileModule(fs.readFileSync(path.join(root, `src/lib/outreach/${f}.ts`), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText);
const V = createRequire(path.join(tmp, 'x.js'))(path.join(tmp, 'cx-v5.js'));
let fail = 0; const t = (n, c, d = '') => { if (!c) { fail++; console.log('FAIL', n, d); } else console.log('PASS', n); };
const inp = { token: 'abcdefghij', firstName: 'Dana', firm: 'Birchwood Financial Partners', cityState: 'Austin, TX', state: 'TX', segment: 'adviser' };
const site = 'Birchwood Financial Partners helps individual investors and families plan retirement income. We use AI to plan and we use fee only planning and a long term approach to portfolio design for clients.';
const good = { fact_sentence: 'Birchwood helps individual investors and families plan retirement income.', fact_snippet: 'helps individual investors and families plan retirement income', fact_url: 'https://birchwood.com/', struggle_id: 2, rapport: 'ai', rapport_snippet: 'we use AI to plan', email_2_opening: 'For a family near retirement, the size of the drop matters more than the gain.', email_3_opening: 'One more way in, if a page is not your format.', tone: 'neutral' };
const ctx = { firstName: 'Dana', firm: 'Birchwood Financial Partners', state: 'TX', siteText: site };

// fixed fallback
for (const seg of ['owner', 'adviser', 'large_firm']) {
    const ds = V.buildV5({ ...inp, segment: seg }, null);
    t(`fallback ${seg} passes all checks`, ds.every((d) => !d.errors.length), JSON.stringify(ds.map((d) => d.errors)));
    t(`fallback ${seg} email count`, ds.length === (seg === 'large_firm' ? 1 : 3));
}
// good enrichment
let r = V.validateEnrich(good, ctx);
t('good enrichment keeps everything', !r.enrich.dropped.length && r.enrich.fact_sentence === good.fact_sentence && r.enrich.rapport === 'ai' && r.enrich.struggle_id === 2, JSON.stringify(r));
let ds = V.buildV5(inp, r.enrich);
t('enriched drafts pass checks', ds.every((d) => !d.errors.length), JSON.stringify(ds.map((d) => d.errors)));
t('E1 in word range', ds[0].words >= 80 && ds[0].words <= 135, String(ds[0].words));
t('E1 has fact, struggle, who, rapport, open, one link', ds[0].body.includes(good.fact_sentence) && ds[0].body.includes(V.V5_STRUGGLE[2]) && ds[0].body.includes(V.V5_WHO) && ds[0].body.includes(V.V5_RAPPORT.ai) && ds[0].body.includes('{{ADV}}'));
t('E2 limits sentence directly after simulation sentence', ds[1].body.includes(V.V5_DEFAULT_E2 ? '229.48% against +49.46% for QQQ buy and hold, with a largest decline of 14.59% against 22.88%. Hypothetical results from a simulation'  : ''));
t('E2 and E3 words', ds[1].words >= 70 && ds[1].words <= 115 && ds[2].words >= 20 && ds[2].words <= 55, `${ds[1].words} ${ds[2].words}`);
t('subject starts with first name', /^Dana, [a-z ]+$/.test(ds[0].subject), ds[0].subject);
// bad enrichment is dropped, not repaired
r = V.validateEnrich({ ...good, fact_snippet: 'we run hedge funds for billionaires today' }, ctx);
t('invented snippet drops the fact', r.enrich.fact_sentence === '' && r.enrich.dropped.includes('fact'));
r = V.validateEnrich({ ...good, fact_sentence: 'Birchwood has won awards for helping individual investors and families plan retirement.' }, ctx);
t('claim word not in source drops the fact', r.enrich.fact_sentence === '', JSON.stringify(r.problems));
r = V.validateEnrich({ ...good, fact_sentence: 'Birchwood helps individual investors and families plan retirement income \u2014 every day.' }, ctx);
t('em dash drops the fact', r.enrich.fact_sentence === '');
r = V.validateEnrich({ ...good, fact_sentence: 'Birchwood uses fee-only planning for individual investors and families.', fact_snippet: 'We use fee only planning and a long term approach' }, ctx);
t('hyphen between letters is cleaned to a space', r.enrich.fact_sentence === 'Birchwood uses fee only planning for individual investors and families.', JSON.stringify(r));
r = V.validateEnrich({ ...good, fact_sentence: 'Birchwood serves 4000 clients with a team in Denver.' }, ctx);
t('number and name not in source drop the fact', r.enrich.fact_sentence === '');
r = V.validateEnrich({ ...good, rapport: 'queens' }, ctx);
t('queens rapport needs a New York firm', r.enrich.rapport === 'none');
r = V.validateEnrich({ ...good, rapport: 'queens' }, { ...ctx, state: 'NY' });
t('queens rapport allowed for NY', r.enrich.rapport === 'queens');
r = V.validateEnrich({ ...good, rapport: 'ai', rapport_snippet: 'we build with AI everywhere' }, ctx);
t('ai rapport without a real snippet is dropped', r.enrich.rapport === 'none');
r = V.validateEnrich({ ...good, email_2_opening: 'The simulation returned a lot more than QQQ.' }, ctx);
t('opening that repeats fixed topics falls back', r.enrich.email_2_opening === V.V5_DEFAULT_E2);
r = V.validateEnrich({ ...good, email_3_opening: 'Would a call help?' }, ctx);
t('opening with a question mark falls back', r.enrich.email_3_opening === V.V5_DEFAULT_E3);
r = V.validateEnrich({ ...good, struggle_id: 9 }, ctx);
t('bad struggle id becomes 1', r.enrich.struggle_id === 1);
r = V.validateEnrich('not an object', ctx);
t('garbage input still gives a safe enrich', r.enrich.fact_sentence === '' && V.buildV5(inp, r.enrich).every((d) => !d.errors.length));
// checks on stored bodies
t('check catches a second link', V.checkV5({ step: 1, subject: 'Dana, qqq question', body: ds[0].body + ' {{CAL}}' }, inp).length > 0);
t('check catches altered who paragraph', V.checkV5({ step: 1, subject: 'Dana, qqq question', body: ds[0].body.replace('retail investor', 'investor') }, inp).length > 0);
t('check catches a figure outside email 2', V.checkV5({ step: 3, subject: '', body: 'Hi Dana,\n\nOne more way in. ' + V.V5_CALL_LINE + ' {{CAL}} It is up 229.48%.' }, inp).length > 0);
t('check catches a banned word', V.checkV5({ step: 3, subject: '', body: 'Hi Dana,\n\nThis is a safe way in. ' + V.V5_CALL_LINE + ' {{CAL}}' }, inp).length > 0);
t('hyphenated first name is allowed in the greeting', V.checkV5({ step: 3, subject: '', body: 'Hi Mary-Beth,\n\n' + V.V5_DEFAULT_E3 + ' ' + V.V5_CALL_LINE + ' {{CAL}}' }, { ...inp, firstName: 'Mary-Beth' }).length === 0);
// follow ups
for (const k of Object.keys(V.V5_FOLLOW)) {
    const b = V.followBody(k, 'Dana'); const e = V.checkV5({ step: k, body: b }, inp);
    t(`follow up ${k} passes checks`, !e.length, e.join('; ') + ' ' + V.v5Words(b));
    t(`follow up ${k} has its link token`, b.includes(`{{${V.V5_FOLLOW[k].token}}}`));
}
t('follow up steps are 45 to 48', Object.values(V.V5_FOLLOW).map((x) => x.step).join() === '45,46,47,48');
t('page click earns the checklist note', V.followFor(['adviser_sample'], []) === 'page');
t('record click earns the data note', V.followFor(['record'], []) === 'sim');
t('apply click earns the study note', V.followFor(['apply'], []) === 'study');
t('two areas earn the subscribe note', V.followFor(['adviser_sample', 'apply'], []) === 'sub');
t('meeting click earns nothing', V.followFor(['meeting'], []) === null);
t('same follow up is not repeated', V.followFor(['adviser_sample'], ['page']) === null);
console.log(fail ? `${fail} FAILED` : 'ALL PASSED'); process.exit(fail ? 1 : 0);
