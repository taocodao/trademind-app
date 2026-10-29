#!/usr/bin/env node
// Renders review samples (never sends). Output: out/sample-*.html and out/sample-*.json. Run: node scripts/render-emailgen-samples.mjs
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';
import ts from 'typescript';

const root = process.cwd();
const out = fs.mkdtempSync(path.join(os.tmpdir(), 'egs-'));
const srcDir = path.join(root, 'src/lib/emailgen');
for (const f of fs.readdirSync(srcDir)) {
    fs.writeFileSync(path.join(out, f.replace(/\.ts$/, '.js')), ts.transpileModule(fs.readFileSync(path.join(srcDir, f), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText);
}
const req = createRequire(path.join(out, 'x.js'));
const { buildEditionPlan } = req('./plan.js');
const { renderEdition } = req('./render.js');
const { checkDraft, passed } = req('./filter.js');
const { FLIGHT_PLAN_MODULES, RISK_MODULES } = req('./modules.js');

const facts = {
    run_id: 'sample from the Oct 28 3:00 PM ET shadow run', record_hash: 'sample, not a published record',
    defensive: { status: 'VERIFIED', regime: 'BULL', risk_levels: [
        { level: 'conservative', text: '25 percent QQQ, 75 percent SGOV' },
        { level: 'moderate', text: '85 percent QQQ, 15 percent SGOV' },
        { level: 'aggressive', text: '100 percent QQQ' } ] },
    leaps: { status: 'VERIFIED', sentence: 'The LEAPS status line is filled from the LEAPS review record in each live issue.' },
    trend: { state: 'above', changed: false },
    numbers: ['28', '25', '75', '85', '15', '100'],
};
const ctx = { unsubscribe_url: 'https://trademind.bot', preferences_url: 'https://trademind.bot', token_placeholder: 'SAMPLE', record_lines: { facts_run_id: facts.run_id, facts_hash: facts.record_hash, defensive_cutoff: '3:00 PM ET', leaps_cutoff: 'LEAPS review schedule', model_file_hash: 'e7770404e8472aae', mapping_version: 'recorded in each live issue', feed: 'Sample built from the shadow run, where the IBKR and Yahoo feeds agreed. The live engine still reads Yahoo bars.', corrections: 'None' } };

const weeklyDraft = (hook, preheader) => ({
    preheader, hook,
    cards: {
        market_weather: 'The Defensive model reads the market as BULL at its October 28 run. Its trend reading, QQQ against its 200 day average, did not change. Price levels are not shown here.',
        copilot_readout: 'Three account risk levels are published. At the conservative level the model holds 25 percent QQQ and 75 percent SGOV. At moderate, 85 percent QQQ and 15 percent SGOV. At aggressive, 100 percent QQQ. These are research allocations for the strategy, not instructions for your account.',
        flight_plan: FLIGHT_PLAN_MODULES.W03.title + '. ' + FLIGHT_PLAN_MODULES.W03.body,
        turbulence_test: RISK_MODULES.R02.body + ' ' + RISK_MODULES.R03.body,
    },
    ps: 'The study program has 20 seats and every application is read by hand.', used_numbers: ['28', '25', '75', '85', '15', '100'], module_ids_used: ['W03', 'R02', 'R03'],
});
const dailyDraft = {
    preheader: 'Trend reading unchanged. One idea, one risk.',
    hook: 'The Defensive model reads BULL and its trend reading did not change.',
    cards: { market_weather: '', copilot_readout: RISK_MODULES.R05.body + ' ' + RISK_MODULES.R04.body, flight_plan: '', turbulence_test: RISK_MODULES.R01.body },
    ps: 'Every daily links to the research record behind it.', used_numbers: [], module_ids_used: ['R05', 'R04', 'R01'],
};
fs.mkdirSync(path.join(root, 'out'), { recursive: true });
let bad = 0;
const cases = [
    ['weekly_free', 'free_weekly', weeklyDraft('The Defensive model reads BULL, and its trend reading has not changed.', 'This week: where the Defensive model stands, how the allocation score is used, and what could go wrong.')],
    ['outreach_weekly', 'prospect', weeklyDraft('A sample of the weekly Flight Plan: where the Defensive model stands and what could go wrong.', 'A sample issue. Subscribe free if it is useful.')],
    ['daily_quiet', 'free_daily', dailyDraft],
];
for (const [ed, seg, draft] of cases) {
    const plan = buildEditionPlan({ edition: ed, segment: seg, facts, edition_id: 'sample-' + ed, date_label: ed.startsWith('daily') ? 'October 28, 2026' : 'Week of October 26, 2026', index: 2 });
    const r = renderEdition(plan, draft, ctx);
    const c = checkDraft(plan, draft, r.html);
    if (!passed(c)) { bad++; console.log('FAIL', ed, JSON.stringify(c.filter((x) => !x.pass))); }
    fs.writeFileSync(path.join(root, 'out', 'sample-' + ed + '.html'), r.html);
    fs.writeFileSync(path.join(root, 'out', 'sample-' + ed + '.json'), JSON.stringify({ subject: r.subject, text: r.text }));
    console.log('rendered', ed);
}
fs.rmSync(out, { recursive: true, force: true });
process.exit(bad ? 1 : 0);
