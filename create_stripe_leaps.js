const Stripe = require('stripe');

async function main() {
    const key = process.env.STRIPE_SECRET_KEY || 'sk_test_...';
    if (key.startsWith('sk_test_...')) {
        console.error('Please set STRIPE_SECRET_KEY environment variable or edit this script to include it.');
        process.exit(1);
    }

    const stripe = new Stripe(key, { apiVersion: '2025-01-27.acacia' });

    console.log('Creating QQQ LEAPS Product...');
    const product = await stripe.products.create({
        name: 'QQQ LEAPS',
        description: 'ML-Powered QQQ Long-Term Equity Anticipation Securities — daily ENTER / EXIT / HOLD signals',
    });
    console.log('Product created:', product.id);

    console.log('Creating Monthly Price (.00)...');
    const monthlyPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: 4900,
        currency: 'usd',
        recurring: { interval: 'month' },
        nickname: 'QQQ LEAPS Monthly',
    });
    console.log('Monthly Price created:', monthlyPrice.id);

    console.log('Creating Annual Price (.00)...');
    const annualPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: 39900,
        currency: 'usd',
        recurring: { interval: 'year' },
        nickname: 'QQQ LEAPS Annual',
    });
    console.log('Annual Price created:', annualPrice.id);

    console.log('\n--- SUCCESS ---');
    console.log('Product ID:', product.id);
    console.log('STRIPE_PRICE_LEAPS_MONTHLY:', monthlyPrice.id);
    console.log('STRIPE_PRICE_LEAPS_ANNUAL:', annualPrice.id);
}

main().catch(console.error);
