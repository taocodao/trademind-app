require('dotenv').config({ path: '.env.local' });
const Stripe = require('stripe');

if (!process.env.STRIPE_SECRET_KEY) {
    console.error("FATAL: STRIPE_SECRET_KEY not found in .env.local");
    process.exit(1);
}
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const FEATURES = [
    { key: 'screenshot', name: 'Screenshot Analyzer' },
    { key: 'deepdive',   name: 'Stock Deep Dive' },
    { key: 'briefing',   name: 'Morning Briefing' },
    { key: 'strategy',   name: 'Strategy Builder' },
    { key: 'debrief',    name: 'Weekly Debrief' },
];

async function main() {
    const results = {};

    // Use the already-created product so everything is grouped together in Stripe
    const productId = 'prod_UBCUGypugPlcbu';

    for (const feature of FEATURES) {
        const price = await stripe.prices.create({
            product: productId,
            unit_amount: 500, // $5.00
            currency: 'usd',
            recurring: { interval: 'month' },
            nickname: `AI Add-on — ${feature.name}`,
            metadata: { feature_key: feature.key },
        });
        results[feature.key] = price.id;
        console.log(`✅ ${feature.name}: ${price.id}`);
    }

    console.log('\n======================================================');
    console.log('Add ALL of these to Vercel Environment Variables:');
    console.log('======================================================');
    for (const [key, priceId] of Object.entries(results)) {
        const envKey = `STRIPE_AI_PRICE_${key.toUpperCase()}`;
        console.log(`${envKey}=${priceId}`);
    }
    console.log('======================================================\n');
}

main().catch(console.error);
