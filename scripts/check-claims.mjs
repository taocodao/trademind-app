#!/usr/bin/env node
// Claim guard for newsletter, briefing and outreach copy.
// Blocking paths fail the run. Known paths are listed as warnings until their copy is revised.
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const rules = JSON.parse(fs.readFileSync(path.join(root, 'src/data/banned-phrases.json'), 'utf8'));
const canonical = JSON.parse(fs.readFileSync(path.join(root, 'src/data/canonical-record.json'), 'utf8'));

const BLOCKING = ['src/lib/briefing', 'src/app/admin/briefings'];
const WARN_ONLY = ['src/lib/outreach/copy-v8.ts', 'src/lib/newsletter', 'src/app/newsletter'];
const DASHES = /[\u2013\u2014]|--/;

function walk(p) {
    const full = path.join(root, p);
    if (!fs.existsSync(full)) return [];
    const st = fs.statSync(full);
    if (st.isFile()) return [p];
    return fs.readdirSync(full).flatMap((f) => walk(path.join(p, f)));
}

const STRONG = ['autopilot', 'fly it higher', 'compounds to', "can't lose", 'cannot lose', 'last chance', 'spots almost gone'];
function scan(file, strongOnly = false) {
    const text = fs.readFileSync(path.join(root, file), 'utf8');
    const lower = text.toLowerCase();
    const hits = [];
    for (const ph of rules.phrases) {
        if (strongOnly && !STRONG.includes(ph)) continue;
        let from = 0;
        for (;;) {
            const i = lower.indexOf(ph, from);
            if (i < 0) break;
            from = i + ph.length;
            const ctx = lower.slice(Math.max(0, i - 40), i + ph.length + 40);
            if (rules.allow.some((a) => a.file === file && ctx.includes(a.text))) continue;
            hits.push(`phrase "${ph}"`);
        }
    }
    for (const pt of rules.patterns) if (new RegExp(pt.regex, 'i').test(text)) hits.push(`pattern: ${pt.name}`);
    return hits;
}

let failed = false;
for (const p of BLOCKING) {
    for (const f of walk(p).filter((x) => /\.(ts|tsx|json|md)$/.test(x))) {
        const h = scan(f);
        if (DASHES.test(fs.readFileSync(path.join(root, f), 'utf8')) && !f.endsWith('.json')) h.push('dash');
        if (h.length) { failed = true; console.error(`BLOCKED ${f}: ${[...new Set(h)].join(', ')}`); }
    }
}
const warned = [];
for (const p of WARN_ONLY) {
    for (const f of walk(p).filter((x) => /\.(ts|tsx)$/.test(x))) {
        const h = [...new Set(scan(f, true))];
        if (h.length) warned.push(`${f}: ${h.join(', ')}`);
    }
}
if (warned.length) console.log(`Warnings (existing copy, to revise):\n  ${warned.join('\n  ')}`);

// Canonical record must not contain unconfirmed values the engine could print.
const pending = [];
(function walkObj(o, pth) {
    if (o && typeof o === 'object') {
        if (o.needs_owner_confirmation === true) pending.push(pth);
        for (const k of Object.keys(o)) walkObj(o[k], `${pth}.${k}`);
    }
})(canonical, 'canonical');
if (pending.length) console.log(`Canonical record items awaiting owner confirmation: ${pending.join(', ')}`);

if (failed) process.exit(1);
console.log('Claim check passed for blocking paths.');
