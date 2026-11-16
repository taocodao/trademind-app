#!/usr/bin/env node
// Adviser outreach v5: builds the enrichment prompts, then checks the model answers and assembles the three emails.
// usage: node scripts/cx-enrich.mjs prompts <sel.json> <site.json> <dir>      writes <dir>/p.jsonl (one prompt per contact)
//        node scripts/cx-enrich.mjs finish  <sel.json> <site.json> <dir>      reads <dir>/o.jsonl (model answers), writes <dir>/d.json and <dir>/report.md
//        node scripts/cx-enrich.mjs sql     <dir> [release]                   writes <dir>/write.sql from d.json (drafts, enrich, seq); 'release' keeps the unsent hold, see below
// The model call itself is scripts/cx-llm.py on the server that holds the key: python3 cx-llm.py p.jsonl o.jsonl
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import { createRequire } from 'node:module'; import ts from 'typescript';
const root = process.cwd(); const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cxe-'));
for (const f of ['cx-copy', 'cx-gen', 'cx-v5']) fs.writeFileSync(path.join(tmp, f + '.js'), ts.transpileModule(fs.readFileSync(path.join(root, `src/lib/outreach/${f}.ts`), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText);
const req = createRequire(path.join(tmp, 'x.js')); const G = req(path.join(tmp, 'cx-gen.js')); const V = req(path.join(tmp, 'cx-v5.js')); const C = req(path.join(tmp, 'cx-copy.js'));
const [mode, a, b, dir] = process.argv.slice(2);
const cap = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const inputOf = (r) => ({ token: r.token, firstName: C.cleanFirst(r.first_name), firm: C.cleanFirm(r.firm), title: cap(r.title), cityState: [r.city, r.state].filter(Boolean).join(', '), state: cap(r.state), employees: cap(r.employees), keywords: cap(r.keywords), firmKey: r.firm_key,
    segment: G.segmentOf({ title: cap(r.title), employees: cap(r.employees), firmKey: r.firm_key }) });
const wr = (f, rows) => fs.writeFileSync(f, rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
const rd = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
const parse = (t) => { const m = String(t || '').match(/\{[\s\S]*\}/); if (!m) return null; try { return JSON.parse(m[0]); } catch { return null; } };
const q = (v) => `'${String(v).replace(/'/g, "''")}'`;

if (mode === 'prompts') {
    const sel = JSON.parse(fs.readFileSync(a, 'utf8')); const site = JSON.parse(fs.readFileSync(b, 'utf8'));
    const rows = sel.map((r) => ({ id: r.token, system: V.V5_SYSTEM, user: V.v5UserPrompt(inputOf(r), site[r.token] || { text: '', urls: [] }) }));
    wr(path.join(dir, 'p.jsonl'), rows); console.log(rows.length, 'prompts');
} else if (mode === 'finish') {
    const sel = JSON.parse(fs.readFileSync(a, 'utf8')); const site = JSON.parse(fs.readFileSync(b, 'utf8'));
    const outs = new Map(rd(path.join(dir, 'o.jsonl')).map((o) => [o.id, o.text]));
    const res = []; const stats = { facts: 0, dropped_fact: 0, rapport: 0, bad_json: 0, clean: 0 };
    for (const r of sel) {
        const i = inputOf(r); const s = site[r.token] || { text: '', urls: [] };
        const raw = parse(outs.get(r.token)); if (!raw) stats.bad_json++;
        const v = V.validateEnrich(raw, { firstName: i.firstName, firm: i.firm, state: i.state, siteText: s.text, siteUrls: s.urls });
        const drafts = V.buildV5({ token: r.token, firstName: i.firstName, firm: i.firm, cityState: i.cityState, state: i.state, segment: i.segment }, v.enrich);
        if (v.enrich.fact_sentence) stats.facts++; else stats.dropped_fact++; if (v.enrich.rapport !== 'none') stats.rapport++; if (!v.problems.length && drafts.every((d) => !d.errors.length)) stats.clean++;
        res.push({ token: r.token, email: r.email, firm: i.firm, segment: i.segment, siteChars: s.text.length, enrich: v.enrich, problems: v.problems, drafts });
    }
    fs.writeFileSync(path.join(dir, 'd.json'), JSON.stringify(res)); console.log(stats);
    const md = ['# Adviser outreach v5: prompt trial', '', `Contacts: ${res.length}. ${JSON.stringify(stats)}`, ''];
    res.forEach((x, n) => {
        md.push(`## ${n + 1}. ${x.firm} (${x.segment}, website text ${x.siteChars} characters)`, '');
        md.push(`Fact: ${x.enrich.fact_sentence || '(none, fixed opening used)'}`, `Snippet: ${x.enrich.fact_snippet || ''}`, `Struggle line: ${x.enrich.struggle_id}, rapport: ${x.enrich.rapport}, tone: ${x.enrich.tone}`);
        if (x.problems.length) md.push(`Dropped by checks: ${x.problems.join('; ')}`);
        md.push('');
        for (const d of x.drafts) md.push(`Email ${d.step}${d.subject ? ` (subject: ${d.subject})` : ' (same thread)'}, ${d.words} words${d.errors.length ? `, ERRORS: ${d.errors.join('; ')}` : ''}`, '', '```', d.body, '```', '');
    });
    fs.writeFileSync(path.join(dir, 'report.md'), md.join('\n'));
} else if (mode === 'sql') {
    const res = JSON.parse(fs.readFileSync(path.join(a, 'd.json'), 'utf8')); const release = b === 'release';
    const out = ['BEGIN;'];
    for (const x of res) {
        const bad = x.drafts.filter((d) => d.errors.length); if (bad.length) continue;
        const enrich = { ...x.enrich, ...(release ? { v5_from: new Date().toISOString() } : {}) };
        out.push(`UPDATE cx_profile SET enrich = ${q(JSON.stringify(enrich))}::jsonb, seq = 'v5', segment = ${q(x.segment)}, arm = NULL WHERE token = ${q(x.token)};`);
        for (const d of x.drafts) {
            if (release && d.step === 1) continue;          // already emailed: keep the email 1 that was sent
            out.push(`INSERT INTO cx_draft (token, step, subject, body, words, errors, meta) VALUES (${q(x.token)}, ${d.step}, ${q(d.subject)}, ${q(d.body)}, ${d.words}, NULL, '{"v5":true}'::jsonb) ON CONFLICT (token, step) DO UPDATE SET subject = EXCLUDED.subject, body = EXCLUDED.body, words = EXCLUDED.words, errors = NULL, meta = EXCLUDED.meta;`);
        }
    }
    out.push('COMMIT;'); fs.writeFileSync(path.join(a, 'write.sql'), out.join('\n') + '\n'); console.log(out.length - 2, 'statements');
}
