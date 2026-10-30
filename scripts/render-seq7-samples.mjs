#!/usr/bin/env node
// Renders the seven-email sequence for review (never sends). Output: out/seq7-N.html and out/seq7-N.json.
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os';
import { createRequire } from 'node:module'; import ts from 'typescript';
const root = process.cwd(); const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 's7-'));
for (const f of ['copy-seq7.ts', 'copy-ria.ts', 'copy-ws.ts', 'copy-v8.ts', 'templates-v5.ts']) {
    const src = fs.readFileSync(path.join(root, 'src/lib/outreach', f), 'utf8');
    fs.writeFileSync(path.join(tmp, f.replace('.ts', '.js')), ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText);
}
const { renderSeq7, SEQ7_STEPS, STAGES } = createRequire(path.join(tmp, 'x.js'))('./copy-seq7.js');
const { renderRia, renderRetailIra } = createRequire(path.join(tmp, 'x.js'))('./copy-ria.js');
const token = process.argv[2] || 'cddf0962bc';
fs.mkdirSync(path.join(root, 'out'), { recursive: true });
let bad = 0;
const all = [...SEQ7_STEPS.map((step) => ({ step })), { step: 1, member: true }, ...[1, 2, 3, 4, 5].map((step) => ({ step, ria: true })), { step: 0, ira: true }, ...STAGES.flatMap((stage) => SEQ7_STEPS.map((step) => ({ step, stage })))];
for (const c of all) {
    const addr = 'TradeMind, 151-58 24th Rd, Whitestone, NY 11357, United States';
    const r = c.ira ? renderRetailIra({ token, firstName: 'Eric', baseUrl: 'https://trademind.bot', mailingAddress: addr }) : c.ria ? renderRia({ token, firstName: 'Eric', baseUrl: 'https://trademind.bot', mailingAddress: addr, n: c.step }) : renderSeq7({ token, firstName: 'Eric', baseUrl: 'https://trademind.bot', mailingAddress: addr, step: c.step, strategyMember: !!c.member, audience: 'retail', stage: c.stage });
    const name = c.ira ? 'retail-ira-sample' : `seq7-${r.n}${c.member ? '-member' : ''}${c.ria ? '-ria' : ''}${c.stage ? '-' + c.stage : ''}`;
    if (c.ria && (r.html.match(/>(Subscribe|Book 20 minutes)</g) || []).length !== 2) { bad++; console.log('FAIL', name, 'button count'); }
    const vis = (r.html + r.text).replace(/<[^>]+>/g, ' ');
    const probs = [];
    if (/[\u2013\u2014]|--/.test(vis)) probs.push('dash');
    if (/!/.test(r.text)) probs.push('exclamation');
    if (/last (email|note)|final notice|won.t hear/i.test(vis)) probs.push('final notice wording');
    if (/confidence|compound quietly|worst fall shallow|guarantee/i.test(vis)) probs.push('banned phrase');
    if (!r.html.includes('/u/' + token)) probs.push('no unsubscribe');
    if (probs.length) { bad++; console.log('FAIL', name, probs.join(', ')); }
    fs.writeFileSync(path.join(root, 'out', name + '.html'), r.html);
    fs.writeFileSync(path.join(root, 'out', name + '.json'), JSON.stringify({ subject: r.subject, text: r.text }));
    console.log('rendered', name, '|', r.subject);
}
fs.rmSync(tmp, { recursive: true, force: true });
process.exit(bad ? 1 : 0);
