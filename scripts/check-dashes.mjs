#!/usr/bin/env node
/**
 * check-dashes.mjs — prebuild guard on the landing surface copy.
 *
 * Flags em dashes (U+2014), en dashes (U+2013), and double hyphens (`--`) in
 * user-visible strings across the marketing / landing components. To avoid
 * false positives, we skip:
 *   1. everything inside /* ... *\/ block comments and // line comments
 *   2. every JS/TS identifier match of `--foo` (that only appears as a CSS
 *      custom property inside a string, so we only need to strip `var(--x)`
 *      and `--foo:` selector context — handled by scanning tagged spans).
 *   3. `key.match(/[\u2014\u2013]/)` style regex literals — internal to the
 *      guard itself, not user-visible.
 *
 * The scan lives at build time via `prebuild`. Run manually:
 *   node scripts/check-dashes.mjs
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOTS = [
    'src/components/marketing',
    // Only user-visible landing / marketing pages, not API routes.
    'src/app/page.tsx',
    'src/app/layout.tsx',
    'src/app/upgrade/page.tsx',
    'src/app/refer/page.tsx',
    'src/app/whop/welcome/page.tsx',
    'src/app/creators/page.tsx',
];

/** Files whose "dashes" are inside opaque data (audio word timing, SQL, HTML
 *  email templates) and never rendered as visible landing-page copy. */
const EXCLUDE = new Set([
    'src/components/marketing/story/wordsI18n.ts',
]);

/** Recursively collect .ts / .tsx files under a root. */
function walk(dir) {
    const out = [];
    for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        const s = statSync(p);
        if (s.isDirectory()) out.push(...walk(p));
        else if (['.ts', '.tsx'].includes(extname(p))) out.push(p);
    }
    return out;
}

/** Strip both // line and /* block comments in a single pass. */
function stripComments(src) {
    let out = '';
    let i = 0;
    let inSingle = false, inDouble = false, inTick = false;
    let inLineComment = false, inBlockComment = false;
    while (i < src.length) {
        const ch = src[i];
        const next = src[i + 1];
        if (inLineComment) {
            if (ch === '\n') { inLineComment = false; out += '\n'; }
            i++;
            continue;
        }
        if (inBlockComment) {
            if (ch === '*' && next === '/') { inBlockComment = false; i += 2; continue; }
            if (ch === '\n') out += '\n';
            i++;
            continue;
        }
        if (inSingle) {
            out += ch;
            if (ch === '\\' && next) { out += next; i += 2; continue; }
            if (ch === "'") inSingle = false;
            i++;
            continue;
        }
        if (inDouble) {
            out += ch;
            if (ch === '\\' && next) { out += next; i += 2; continue; }
            if (ch === '"') inDouble = false;
            i++;
            continue;
        }
        if (inTick) {
            out += ch;
            if (ch === '\\' && next) { out += next; i += 2; continue; }
            if (ch === '`') inTick = false;
            i++;
            continue;
        }
        if (ch === '/' && next === '/') { inLineComment = true; i += 2; continue; }
        if (ch === '/' && next === '*') { inBlockComment = true; i += 2; continue; }
        if (ch === "'") { inSingle = true; out += ch; i++; continue; }
        if (ch === '"') { inDouble = true; out += ch; i++; continue; }
        if (ch === '`') { inTick = true; out += ch; i++; continue; }
        out += ch;
        i++;
    }
    return out;
}

const BAD = /[\u2014\u2013]|--/g;
/* Whitelist patterns that DO contain -- or dashes but are code, not copy. */
const CODE_TOKEN = [
    /var\(--[a-z0-9-]+\)/g,           // CSS custom property reference
    /--[a-z][a-z0-9-]*\s*:/g,          // CSS custom property declaration in strings
    /className="tm-[a-z0-9-]+"/g,      // Tailwind-ish class names
    /'--[a-z0-9-]+'/g,                 // string prop names
    /"--[a-z0-9-]+"/g,                 // string prop names
    /[a-zA-Z0-9_$]--/g,                // postfix decrement operator
    /--[a-zA-Z0-9_$]/g,                // prefix decrement operator
    /\/\*[\s\S]*?\*\//g,               // safety net
];

const failures = [];

const files = ROOTS.flatMap(r => {
    try {
        const s = statSync(r);
        return s.isDirectory() ? walk(r) : [r];
    } catch { return []; }
}).filter(f => !EXCLUDE.has(f));

for (const file of files) {
    const raw = readFileSync(file, 'utf-8');
    let scan = stripComments(raw);
    for (const p of CODE_TOKEN) scan = scan.replace(p, '');
    const matches = [...scan.matchAll(BAD)];
    if (matches.length) {
        // Show context of each match.
        for (const m of matches) {
            const idx = m.index ?? 0;
            const line = scan.slice(0, idx).split('\n').length;
            const snippet = scan.slice(Math.max(0, idx - 40), idx + 40).replace(/\s+/g, ' ');
            failures.push(`${file}:${line}: ${JSON.stringify(m[0])} in "…${snippet}…"`);
        }
    }
}

if (failures.length) {
    console.error(`\n✗ Dash guard failed. ${failures.length} offending occurrence(s):\n`);
    for (const f of failures) console.error('  ' + f);
    console.error('\n  Replace em dashes, en dashes, and "--" with commas, periods, or " to ".');
    process.exit(1);
} else {
    console.log(`✓ Dash guard passed across ${files.length} marketing/landing files.`);
}
