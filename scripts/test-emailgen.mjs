#!/usr/bin/env node
// Tests for the email generator: segments, plan, renderers, filter. Run: node scripts/test-emailgen.mjs
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';
import ts from 'typescript';

const root = process.cwd();
const out = fs.mkdtempSync(path.join(os.tmpdir(), 'eg-'));
const srcDir = path.join(root, 'src/lib/emailgen');
for (const f of fs.readdirSync(srcDir)) {
    const js = ts.transpileModule(fs.readFileSync(path.join(srcDir, f), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
    fs.writeFileSync(path.join(out, f.replace(/\.ts$/, '.js')), js);
}
const req = createRequire(path.join(out, 'x.js'));
const { resolveSegment, mayReceive } = req('./segments.js');
const { buildEditionPlan } = req('./plan.js');
const { renderEdition } = req('./render.js');
const { checkDraft, passed } = req('./filter.js');
const { deterministicDraft, draftWithModel } = req('./drafter.js');

let fail = 0;
const ok = (n, c, d = '') => { if (!c) { fail++; console.log('FAIL', n, d); } else console.log('ok  ', n); };

// segments
ok('seg suppressed', resolveSegment({ unsubscribed: true, confirmed: true }) === 'suppressed');
ok('seg prospect', resolveSegment({ listed_prospect: true }) === 'prospect');
ok('seg unlisted unconfirmed suppressed', resolveSegment({}) === 'suppressed');
ok('seg weekly', resolveSegment({ confirmed: true, cadence: 'weekly' }) === 'free_weekly');
ok('seg plans clicker', resolveSegment({ confirmed: true, cadence: 'weekly', clicked_plans_days_ago: 3 }) === 'plans_clicker');
ok('seg buyer not clicker', resolveSegment({ confirmed: true, has_account: true, clicked_plans_days_ago: 3 }) === 'member');
ok('seg engaged', resolveSegment({ confirmed: true, cadence: 'daily', days_subscribed: 40, clicks_30d: 5 }) === 'engaged_reader');
ok('prospect gets only outreach', mayReceive('prospect', 'outreach_weekly') && !mayReceive('prospect', 'daily_quiet'));
ok('suppressed gets nothing', !mayReceive('suppressed', 'weekly_free'));

const facts = (over = {}) => ({
    run_id: 'run-test', record_hash: 'hash-test',
    defensive: { status: 'VERIFIED', risk_levels: [{ level: 'moderate', text: 'QQQ 85 percent' }], regime: 'BULL' },
    leaps: { status: 'VERIFIED', sentence: 'Position review completed on the LEAPS schedule.' },
    trend: { state: 'above', changed: false }, numbers: ['85'], ...over,
});
const ctx = { unsubscribe_url: '{{one_click_unsubscribe_url}}', preferences_url: '{{preferences_url}}', token_placeholder: '{{token}}', record_lines: { facts_run_id: 'run-test', facts_hash: 'hash-test', defensive_cutoff: 'cutoff', leaps_cutoff: 'cutoff', model_file_hash: 'mh', mapping_version: 'mv', feed: 'feed', corrections: 'none' } };

for (const ed of ['weekly_free', 'outreach_weekly', 'daily_quiet', 'daily_action']) {
    const plan = buildEditionPlan({ edition: ed, segment: ed === 'outreach_weekly' ? 'prospect' : 'free_weekly', facts: facts(), edition_id: 'e1', date_label: 'October 26, 2026', index: 1 });
    const d = deterministicDraft(plan);
    const r = renderEdition(plan, d, ctx);
    const checks = checkDraft(plan, d, r.html);
    ok(ed + ' passes filter', passed(checks), JSON.stringify(checks.filter((c) => !c.pass)));
    ok(ed + ' has text part', r.text.length > 200);
    if (ed === 'outreach_weekly') ok('outreach goal is subscribe', r.html.includes('/newsletter/join?t={{token}}&cadence=daily'));
    if (ed === 'weekly_free') { fs.mkdirSync(path.join(root, 'out'), { recursive: true }); fs.writeFileSync(path.join(root, 'out', ed + '.html'), r.html); }
}

// failed run
{
    const plan = buildEditionPlan({ edition: 'daily_quiet', segment: 'free_daily', facts: facts({ defensive: { status: 'RUN_FAILED', risk_levels: [], regime: null } }), edition_id: 'e2', date_label: 'October 28, 2026', index: 0 });
    const d = deterministicDraft(plan); const r = renderEdition(plan, d, ctx);
    ok('failed run uses fail wording', plan.status_fallback && passed(checkDraft(plan, d, r.html)) && /did not complete its data checks/.test(r.html), JSON.stringify(checkDraft(plan, d, r.html).filter((c) => !c.pass)));
    ok('failed run shows no risk levels', !r.html.includes('risk level:'));
}

// filter catches defects found in review
{
    const plan = buildEditionPlan({ edition: 'weekly_free', segment: 'free_weekly', facts: facts(), edition_id: 'e3', date_label: 'x', index: 0 });
    const bad = ['Sitting still is the most expensive thing a rules-based strategy ever does.', 'Exposure tier: moderate', 'Most newsletters skip this section.', 'It never starts a trade by itself.', 'Model confidence 71 percent', 'The score is 99.'];
    for (const b of bad) {
        const d = deterministicDraft(plan); d.hook = b;
        const r = renderEdition(plan, d, ctx);
        ok('filter rejects: ' + b.slice(0, 36), !passed(checkDraft(plan, d, r.html)));
    }
    const d = deterministicDraft(plan); const r = renderEdition(plan, d, ctx);
    ok('dash filter', !passed(checkDraft(plan, d, r.html + '\u2014')));
    ok('no @bot masthead', !r.html.includes('@bot') && r.html.includes('.bot</span>'));
    ok('study rules listed', r.html.includes('20 seats'));
    ok('buttons rendered', (r.html.match(/border-radius:10px;border:1px solid/g) ?? []).length >= 6);
}
// model failure falls back
{
    const plan = buildEditionPlan({ edition: 'weekly_free', segment: 'free_weekly', facts: facts(), edition_id: 'e4', date_label: 'x', index: 2 });
    const d = await draftWithModel(plan, async () => { throw new Error('down'); });
    ok('drafter falls back on error', d.module_ids_used.length === 3);
    const d2 = await draftWithModel(plan, async () => 'not json');
    ok('drafter falls back on bad json', d2.hook.length > 10);
}
fs.rmSync(out, { recursive: true, force: true });
console.log(fail ? `\n${fail} failed` : '\nall passed');
process.exit(fail ? 1 : 0);
