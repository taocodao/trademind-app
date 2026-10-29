#!/usr/bin/env node
// Renders daily brief samples (never sends). Output: out/daily-*.html and out/daily-*.json.
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os';
import { createRequire } from 'node:module'; import ts from 'typescript';
const root = process.cwd(); const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dl-'));
for (const f of ['copy-seq7.ts', 'copy-ws.ts', 'copy-v8.ts', 'templates-v5.ts', 'copy-daily.ts']) {
    fs.writeFileSync(path.join(tmp, f.replace('.ts', '.js')), ts.transpileModule(fs.readFileSync(path.join(root, 'src/lib/outreach', f), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText);
}
const { renderDaily, SAMPLE_ACCOUNT } = createRequire(path.join(tmp, 'x.js'))('./copy-daily.js');
const base = { linkToken: '1.SAMPLEsampleSAMPLEsamp', unsubscribeUrl: 'https://trademind.bot/newsletter/unsubscribe?token=SAMPLE', editionDate: '2026-10-28', accountId: null, firstName: 'Eric', baseUrl: 'https://trademind.bot', mailingAddress: 'TradeMind, 151-58 24th Rd, Whitestone, NY 11357, United States' };
const cases = [
    ['no-account', null],
    ['defensive-account', SAMPLE_ACCOUNT],
    ['leaps-account', { label: 'Brokerage account', strategy: 'QQQ LEAPS', status: 'Position held. The next review follows the LEAPS schedule.' }],
];
fs.mkdirSync(path.join(root, 'out'), { recursive: true });
let bad = 0;
for (const [name, account] of cases) {
    const r = renderDaily({ ...base, account });
    const vis = (r.html + r.text).replace(/<[^>]+>/g, ' ');
    const probs = [];
    if (/[\u2013\u2014]|--/.test(vis)) probs.push('dash');
    if (/!/.test(r.text)) probs.push('exclamation');
    if (/confidence|compound quietly|worst fall shallow|guarantee|probability of profit|exposure tier|protect capital/i.test(vis)) probs.push('banned phrase');
    if (!r.html.includes('newsletter/unsubscribe')) probs.push('no unsubscribe');
    if (probs.length) { bad++; console.log('FAIL', name, probs.join(', ')); }
    fs.writeFileSync(path.join(root, 'out', `daily-${name}.html`), r.html);
    fs.writeFileSync(path.join(root, 'out', `daily-${name}.json`), JSON.stringify({ subject: r.subject, text: r.text }));
    console.log('rendered', name, '|', r.subject, '|', Buffer.byteLength(r.html), 'bytes');
}
fs.rmSync(tmp, { recursive: true, force: true });
process.exit(bad ? 1 : 0);
