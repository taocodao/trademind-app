#!/usr/bin/env node
// Tests for the pricing v2 catalog. Run: node scripts/test-pricing-v2.mjs
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';
import ts from 'typescript';

const out = fs.mkdtempSync(path.join(os.tmpdir(), 'pv2-'));
const src = fs.readFileSync(path.join(process.cwd(), 'src/lib/pricing-v2.ts'), 'utf8');
fs.writeFileSync(path.join(out, 'p.js'), ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText);
const p = createRequire(path.join(out, 'x.js'))('./p.js');

let fail = 0;
const t = (n, ok, x = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${ok ? '' : '  ' + x}`); if (!ok) fail++; };

const std = (pr, i) => p.priceCents(pr, i, false);
const sub = (pr, i) => p.priceCents(pr, i, true);
t('standard monthly 30/40/60', std('defensive', 'month') === 3000 && std('leaps', 'month') === 4000 && std('both', 'month') === 6000);
t('standard annual 300/400/600', std('defensive', 'year') === 30000 && std('leaps', 'year') === 40000 && std('both', 'year') === 60000);
t('subscriber monthly 21/28/42', sub('defensive', 'month') === 2100 && sub('leaps', 'month') === 2800 && sub('both', 'month') === 4200);
t('subscriber annual 210/280/420', sub('defensive', 'year') === 21000 && sub('leaps', 'year') === 28000 && sub('both', 'year') === 42000);
t('annual is ten monthly payments', ['defensive', 'leaps', 'both'].every((x) => std(x, 'year') === 10 * std(x, 'month')));
t('subscriber is exactly 30% below standard', ['defensive', 'leaps', 'both'].every((x) => ['month', 'year'].every((i) => sub(x, i) * 100 === std(x, i) * 70)));
t('bundle is two accounts, one per strategy', JSON.stringify(p.PRODUCT_ACCOUNTS.both) === JSON.stringify(['basic', 'leaps']));
t('single products include one account', p.PRODUCT_ACCOUNTS.defensive.length === 1 && p.PRODUCT_ACCOUNTS.leaps.length === 1);
t('bundle costs less than two singles (standard)', std('both', 'month') < std('defensive', 'month') + std('leaps', 'month'));
t('price env key names', p.priceEnvKey('both', 'year') === 'STRIPE_V2_PRICE_BOTH_YEAR' && p.priceEnvKey('defensive', 'month') === 'STRIPE_V2_PRICE_DEFENSIVE_MONTH');
t('dollar formatting', p.dollars(2100) === '$21' && p.dollars(4410) === '$44.10');
delete process.env.PRICING_V2_ENABLED;
t('flag is off by default', p.isPricingV2Enabled() === false);
process.env.PRICING_V2_ENABLED = 'true';
t('flag turns on only with true', p.isPricingV2Enabled() === true);
console.log(fail ? `\n${fail} FAILED` : '\nall passed');
process.exit(fail ? 1 : 0);
