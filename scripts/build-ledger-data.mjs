#!/usr/bin/env node
/* Builds the static JSON bundles for /verify/ledger from the public
   proof-kit artifacts (additive, read-only sources):

   - src/data/ledger-chart.json    : daily candles + equity curve + markers
   - src/data/ledger-rows.json     : 806 fills (compact, from ledger-detail JSON)

   Run: node scripts/build-ledger-data.mjs
   Sources: public/verify/trademind-v4-equity-curve.csv,
            public/verify/trademind-v4-ledger-detail.json
*/

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;

const curveCsv = readFileSync(join(ROOT, 'public/verify/trademind-v4-equity-curve.csv'), 'utf8');
const detail = JSON.parse(readFileSync(join(ROOT, 'public/verify/trademind-v4-ledger-detail.json'), 'utf8'));

// --- candles + equity from the daily equity curve (ts,nav,spot) ---
// The equity curve CSV has one row per trading day: date, nav, spot.
// Synthesize daily candles from hourly? We only have daily spot in the CSV;
// use spot as OHLC (open=high=low=close=spot) with intraday wicks left out,
// plus the nav line.
const lines = curveCsv.trim().split(/\r?\n/);
const header = lines[0].split(',');
const iTs = header.indexOf('ts');
const iNav = header.indexOf('nav');
const iSpot = header.indexOf('spot');

const candles = [];
const equity = [];
for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    const t = cols[iTs];
    const nav = parseFloat(cols[iNav]);
    const spot = parseFloat(cols[iSpot]);
    if (!t || Number.isNaN(nav) || Number.isNaN(spot)) continue;
    candles.push({ time: t, open: spot, high: spot, low: spot, close: spot });
    equity.push({ time: t, value: nav });
}

// --- markers from fills ---
const fills = detail.fills;
const markers = fills.map((f) => {
    const d = f.ts.slice(0, 10);
    const isLeaps = f.kind === 'LEAPS';
    const isOpen = /OPEN/.test(f.action);
    return {
        time: d,
        position: isLeaps ? (isOpen ? 'belowBar' : 'aboveBar') : (isOpen ? 'aboveBar' : 'belowBar'),
        color: isLeaps ? '#8B5CF6' : '#e0a458',
        shape: isOpen ? 'arrowUp' : 'arrowDown',
        id: `${f.ts}|${f.action}`,
        text: '',
    };
});

mkdirSync(join(ROOT, 'src/data'), { recursive: true });
writeFileSync(
    join(ROOT, 'src/data/ledger-chart.json'),
    JSON.stringify({ schema_version: '1.0.0', candles, equity, markers })
);

// compact rows for the table
const rows = fills.map((f, idx) => ({
    i: idx,
    ts: f.ts,
    kind: f.kind,
    action: f.action,
    strike: f.strike,
    expiry: typeof f.expiry === 'string' ? f.expiry.slice(0, 10) : f.expiry,
    contracts: f.contracts,
    price: f.price_per_share,
    spot: f.spot,
    iv: f.iv,
    delta: f.delta,
    slippage: f.slippage,
    commission: f.commission,
    pnl: f.pnl,
    reason: f.reason,
    gates: f.gates || null,
}));
writeFileSync(
    join(ROOT, 'src/data/ledger-rows.json'),
    JSON.stringify({ schema_version: detail.schema_version, fills: rows })
);

console.log(`candles: ${candles.length}, markers: ${markers.length}, rows: ${rows.length}`);
console.log('OK');
