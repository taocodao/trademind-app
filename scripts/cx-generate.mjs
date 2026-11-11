#!/usr/bin/env node
// Builds writing prompts for the adviser outreach v2 emails, and validates the model answers.
// usage: node scripts/cx-generate.mjs prompts <email 1-4> <selection.json> <site.json> <dir>
//        node scripts/cx-generate.mjs finish  <email 1-4> <selection.json> <site.json> <dir> [retry]
// Files in <dir>: p<N>.jsonl (prompts), o<N>.jsonl (model answers), r<N>.jsonl / ro<N>.jsonl (retry prompts and answers), d<N>.json (results).
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import { createRequire } from 'node:module'; import ts from 'typescript';
const root = process.cwd(); const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cxs-'));
for (const f of ['cx-copy', 'cx-gen']) fs.writeFileSync(path.join(tmp, f + '.js'), ts.transpileModule(fs.readFileSync(path.join(root, `src/lib/outreach/${f}.ts`), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText);
const G = createRequire(path.join(tmp, 'x.js'))(path.join(tmp, 'cx-gen.js'));
const [mode, eidS, selF, siteF, dir, retry] = process.argv.slice(2); const eid = Number(eidS);
const sel = JSON.parse(fs.readFileSync(selF, 'utf8')); const site = JSON.parse(fs.readFileSync(siteF, 'utf8'));
const rd = (f) => (fs.existsSync(path.join(dir, f)) ? fs.readFileSync(path.join(dir, f), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
const wr = (f, rows) => fs.writeFileSync(path.join(dir, f), rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
const cap = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const inputOf = (r) => ({ token: r.token, email: r.email, firstName: cap(r.first_name).replace(/^./, (c) => c.toUpperCase()), title: cap(r.title), firm: cap(r.firm), firmKey: r.firm_key, cityState: [r.city, r.state].filter(Boolean).join(', '), employees: String(r.employees || ''), keywords: cap(r.keywords).split(';').slice(0, 10).join('; '), websiteText: cap(site[r.token] || ''), linkedinText: '', segment: r.segment, arm: r.arm });
const ending = (i, id) => (id === 2 || id === 4 ? '' : G.subjectEnding(i.token, i.firstName, id));
const prior = (token) => { const out = []; for (let k = 1; k < eid; k++) { const d = rd(`d${k}.json`).find((x) => x.token === token); if (d) out.push(G.previousText(d.body)); } return out; };

if (mode === 'prompts') {
    const rows = [];
    for (const r of sel) {
        const i = inputOf(r);
        if (eid === 2 && i.segment === 'large_firm') continue;
        if ((eid === 2 || eid === 3) && i.segment === 'large_firm') continue;
        rows.push({ id: r.token, system: G.SYSTEM_PROMPT, user: G.userPrompt(eid, i, prior(r.token), ending(i, eid)) });
    }
    wr(`p${eid}.jsonl`, rows); console.log(rows.length, 'prompts');
} else {
    const prompts = rd(`p${eid}.jsonl`); const outs = new Map(rd(`o${eid}.jsonl`).map((o) => [o.id, o.text]));
    if (retry) for (const o of rd(`ro${eid}.jsonl`)) outs.set(o.id, o.text);
    const results = []; const redo = []; const stats = { model: 0, fallback: 0, retried: 0 };
    for (const p of prompts) {
        const r = sel.find((x) => x.token === p.id); const i = inputOf(r); const end = ending(i, eid); const prev = prior(p.id);
        const fin = G.finishEmail(eid, outs.get(p.id) || '', i, end, prev);
        if (fin.email) { results.push({ token: p.id, source: 'model', problems: [], email: fin.email }); stats.model++; continue; }
        if (!retry) { redo.push({ id: p.id, system: p.system, user: `${p.user}\n\nYour previous answer failed these automatic checks. Fix every one and return the JSON again:\n- ${fin.problems.join('\n- ')}\nPrevious answer:\n${outs.get(p.id) || ''}` }); stats.retried++; continue; }
        const fb = G.fallbackEmail(eid, i, end); fb.problems = fin.problems; results.push({ token: p.id, source: 'fallback', problems: fin.problems, email: fb }); stats.fallback++;
    }
    if (!retry) { wr(`r${eid}.jsonl`, redo); console.log('first pass', stats); }
    else {
        const done = results.filter(Boolean);
        fs.writeFileSync(path.join(dir, `d${eid}.json`), JSON.stringify(done.map((m) => ({ token: m.token, source: m.source, problems: m.problems, subject: m.email.subject, body: G.storedBody(m.email, G.LINK_TOKEN[eid]), words: m.email.words, facts: m.email.facts, level: m.email.level }))));
        console.log('final', done.reduce((a, m) => ((a[m.source] = (a[m.source] || 0) + 1), a), {}));
    }
}
