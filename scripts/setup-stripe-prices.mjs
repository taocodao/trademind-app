#!/usr/bin/env node
/**
 * setup-stripe-prices.mjs
 * =======================
 * Creates all TradeMind products and prices in Stripe using the API.
 * Run once against production, then copy the price IDs into Vercel env vars.
 *
 * Usage:
 *   $env:STRIPE_SECRET_KEY="sk_live_..."
 *   node scripts/setup-stripe-prices.mjs
 *
 * Or in dry-run mode (shows what would be created):
 *   DRY_RUN=true node scripts/setup-stripe-prices.mjs
 *
 * Output: A .env snippet ready to paste into Vercel.
 */

import Stripe from 'stripe';

const DRY_RUN = process.env.DRY_RUN === 'true';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
    apiVersion: '2025-01-27.acacia',
});

if (!process.env.STRIPE_SECRET_KEY) {
    console.error('❌  STRIPE_SECRET_KEY is not set. Aborting.');
    process.exit(1);
}

const isLive = process.env.STRIPE_SECRET_KEY.startsWith('sk_live_');
console.log(`\n🏦  Stripe mode: ${isLive ? '🔴 LIVE' : '🟡 TEST'}`);
if (DRY_RUN) console.log('🔍  DRY_RUN=true — nothing will be created\n');

// ── Plan Definitions ─────────────────────────────────────────────────────────

const PLANS = [
    {
        key:         'turbocore_pro_bundle',
        name:        'TradeMind – Turbo Core + Pro',
        description: 'TurboCore ML Signal (daily 3 PM ET) + IV-Switching Composite Options Strategy',
        monthly:     6900,   // cents = $69
        annual:      57960,  // $579.60/yr = $48.30/mo (30% off)
        biennial:    99360,  // $993.60/2yr = $41.40/mo (40% off)
    },
    {
        key:         'qqq_leaps',
        name:        'TradeMind – QQQ LEAPS',
        description: 'ML-Powered QQQ Long-Term Equity Anticipation Securities (ENTER/EXIT/HOLD)',
        monthly:     5900,   // $59
        annual:      49560,  // $495.60/yr = $41.30/mo
        biennial:    84960,  // $849.60/2yr = $35.40/mo
    },
    {
        key:         'full_access',
        name:        'TradeMind – Full Access',
        description: 'All 3 strategies: TurboCore + Turbo Pro + QQQ LEAPS',
        monthly:     10000,  // $100
        annual:      84000,  // $840/yr = $70/mo
        biennial:    144000, // $1440/2yr = $60/mo
    },
];

// ── Helper ───────────────────────────────────────────────────────────────────

async function createOrFindProduct(name, description) {
    if (DRY_RUN) return `prod_DRY_${name.replace(/\s/g,'_')}`;

    // Search for existing product with this name to stay idempotent
    const existing = await stripe.products.search({
        query: `name:"${name}"`,
        limit: 1,
    });
    if (existing.data.length > 0) {
        console.log(`  ℹ️  Product already exists: ${existing.data[0].id} (${name})`);
        return existing.data[0].id;
    }

    const product = await stripe.products.create({ name, description });
    console.log(`  ✅ Product created: ${product.id} (${name})`);
    return product.id;
}

async function createPrice(productId, unitAmount, interval, intervalCount, nickname) {
    if (DRY_RUN) {
        const label = intervalCount > 1 ? `${intervalCount}-${interval}` : interval;
        console.log(`  [DRY] Would create $${(unitAmount/100).toFixed(2)} price (${label}) for ${productId}`);
        return `price_DRY_${productId}_${interval}_${intervalCount}`;
    }

    // Check for existing price (same product + interval + amount)
    const existing = await stripe.prices.list({
        product: productId,
        active: true,
        limit: 100,
    });
    const match = existing.data.find(p =>
        p.unit_amount === unitAmount &&
        p.recurring?.interval === interval &&
        (p.recurring?.interval_count ?? 1) === intervalCount
    );
    if (match) {
        console.log(`  ℹ️  Price already exists: ${match.id} (${nickname})`);
        return match.id;
    }

    const price = await stripe.prices.create({
        product: productId,
        unit_amount: unitAmount,
        currency: 'usd',
        recurring: {
            interval,
            interval_count: intervalCount,
        },
        nickname,
    });
    console.log(`  ✅ Price created: ${price.id} (${nickname})`);
    return price.id;
}

// ── Main ─────────────────────────────────────────────────────────────────────

const envLines = [];

for (const plan of PLANS) {
    console.log(`\n📦 ${plan.name}`);
    const productId = await createOrFindProduct(plan.name, plan.description);

    const monthlyId  = await createPrice(productId, plan.monthly,  'month', 1,  `${plan.key}_monthly`);
    const annualId   = await createPrice(productId, plan.annual,   'year',  1,  `${plan.key}_annual`);
    const biennialId = await createPrice(productId, plan.biennial, 'month', 24, `${plan.key}_biennial_24mo`);

    envLines.push(`NEXT_PUBLIC_STRIPE_${plan.key.toUpperCase()}_MONTHLY_PRICE_ID=${monthlyId}`);
    envLines.push(`NEXT_PUBLIC_STRIPE_${plan.key.toUpperCase()}_ANNUAL_PRICE_ID=${annualId}`);
    envLines.push(`NEXT_PUBLIC_STRIPE_${plan.key.toUpperCase()}_BIENNIAL_PRICE_ID=${biennialId}`);
}

console.log('\n' + '─'.repeat(60));
console.log('📋  Add these to Vercel Environment Variables:\n');
console.log(envLines.join('\n'));
console.log('\n' + '─'.repeat(60));

// Write to file for convenience
import { writeFileSync } from 'fs';
const outFile = '.stripe-prices.env';
writeFileSync(outFile, envLines.join('\n') + '\n');
console.log(`\n💾  Also written to: ${outFile}`);
console.log('    (Add this file to .gitignore — it contains price IDs, not secrets.)\n');
